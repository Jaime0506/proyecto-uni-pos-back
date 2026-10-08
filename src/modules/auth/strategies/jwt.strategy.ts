import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as JwtStrategyBase } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { Session } from '../entities/session.entity';

type JwtPayload = {
	sub: string;
	jti: string;
	username: string;
	isSuperRoot?: boolean;
};

interface RequestUser {
	userId: string;
	username: string;
	sessionId: number;
	jti: string;
	companyId: number | null;
	isSuperRoot?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase) {
	constructor(
		private readonly configService: ConfigService,
		@InjectRepository(Session) private readonly sessions: Repository<Session>,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
			ignoreExpiration: false,
		});
	}

	async validate(payload: JwtPayload): Promise<RequestUser> {
		const session = await this.sessions.findOne({
			where: {
				jtiAccess: payload.jti,
				revokedAt: IsNull(),
				expiresAt: MoreThanOrEqual(new Date()),
			},
			relations: { user: true },
		});

		if (!session) {
			throw new UnauthorizedException('Sesión inválida o expirada');
		}

		// Protección: Verificar si el usuario fue desactivado o revocado por el administrador
		if (!session.user || !session.user.isActive) {
			await this.sessions.update(
				{ id: session.id },
				{ revokedAt: new Date(), revokedReason: 'user_deactivated' },
			);
			throw new UnauthorizedException(
				'Usuario inactivo o revocado por administración',
			);
		}

		// Requerimiento B3: Cierre automático por inactividad (Idle Timeout)
		const idleTimeoutMinutes = Number(
			this.configService.get('SESSION_IDLE_TIMEOUT_MINUTES') || 15,
		);
		const lastActivity = session.lastSeenAt || session.loginAt;
		if (lastActivity) {
			const elapsedMinutes =
				(Date.now() - new Date(lastActivity).getTime()) / (1000 * 60);

			if (elapsedMinutes > idleTimeoutMinutes) {
				await this.sessions.update(
					{ id: session.id },
					{ revokedAt: new Date(), revokedReason: 'inactivity_timeout' },
				);
				throw new UnauthorizedException('Sesión cerrada por inactividad');
			}
		}

		// Actualizar última actividad del usuario
		void this.sessions.update({ id: session.id }, { lastSeenAt: new Date() });

		return {
			userId: session.user.id,
			username: payload.username,
			sessionId: session.id,
			jti: payload.jti,
			companyId: session.companyId ?? null,
			isSuperRoot: payload.isSuperRoot ?? false,
		};
	}
}
