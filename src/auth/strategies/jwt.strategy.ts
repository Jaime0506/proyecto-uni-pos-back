/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as JwtStrategyBase } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { Session } from '../entities/session.entity';

type JwtPayload = { sub: string; jti: string; username: string };

interface RequestUser {
	userId: string;
	username: string;
	sessionId: number;
	jti: string;
	companyId: number | null;
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

		// Fire-and-forget: no bloquear el flujo por este update
		void this.sessions.update({ id: session.id }, { lastSeenAt: new Date() });

		return {
			userId: session.user.id,
			username: payload.username,
			sessionId: session.id,
			jti: payload.jti,
			companyId: session.companyId ?? null,
		};
	}
}
