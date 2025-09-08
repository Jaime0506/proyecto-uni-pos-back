// src/auth/auth.service.ts
import {
	Injectable,
	BadRequestException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, MoreThanOrEqual } from 'typeorm';
import { User } from '../core/users/user.entity';
import { Session } from './entities/session.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
	constructor(
		private readonly dataSource: DataSource,
		@InjectRepository(User) private readonly users: Repository<User>,
		@InjectRepository(Session) private readonly sessions: Repository<Session>,
		private readonly jwt: JwtService,
		private readonly cfg: ConfigService,
	) {}

	async login(
		usernameOrEmail: string,
		password: string,
		ip?: string,
		userAgent?: string,
		deviceId?: string,
		companyId?: number,
	) {
		const user = await this.users.findOne({
			where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
		});

		if (!user || !user.isActive) {
			throw new UnauthorizedException('Credenciales inválidas');
		}

		const ok = await bcrypt.compare(password, user.password);
		if (!ok) {
			throw new UnauthorizedException('Credenciales inválidas');
		}

		const jti = randomUUID();
		const refreshTtl = this.cfg.get<string>('JWT_REFRESH_TTL') || '7d';
		const expiresAt = addFromNow(refreshTtl);

		// transacción: crear sesión y firmar tokens
		return await this.dataSource.transaction(async (trx) => {
			const sessRepo = trx.getRepository(Session);
			const session = sessRepo.create({
				user,
				jtiAccess: jti,
				deviceId,
				companyId,
				ip,
				userAgent,
				expiresAt,
			});
			await sessRepo.save(session);

			const accessToken = this.jwt.sign(
				{ sub: user.id, jti, username: user.username },
				{ expiresIn: this.cfg.get('JWT_ACCESS_TTL') || '15m' },
			);

			// refresh con mismo jti pero TTL largo
			const refreshToken = this.jwt.sign(
				{ sub: user.id, jti, username: user.username, typ: 'refresh' },
				{ expiresIn: refreshTtl },
			);

			return {
				accessToken,
				refreshToken,
				expiresAt,
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
				},
			};
		});
	}

	async refresh(refreshToken: string) {
		let payload: Record<string, any>;
		try {
			payload = this.jwt.verify(refreshToken, {
				secret: this.cfg.get<string>('JWT_SECRET'),
			});
		} catch {
			throw new UnauthorizedException('Refresh token inválido');
		}
		if (payload?.typ !== 'refresh') {
			throw new BadRequestException('Token no es de tipo refresh');
		}

		// verificar sesión viva
		const session = await this.sessions.findOne({
			where: {
				jtiAccess: payload.jti as string,
				revokedAt: IsNull(),
				expiresAt: MoreThanOrEqual(new Date()),
			},
			relations: { user: true },
		});
		if (!session || !session.user?.isActive) {
			throw new UnauthorizedException('Sesión inválida o expirada');
		}

		const accessToken = this.jwt.sign(
			{
				sub: session.user.id,
				jti: session.jtiAccess,
				username: session.user.username,
			},
			{ expiresIn: this.cfg.get('JWT_ACCESS_TTL') || '15m' },
		);

		return { accessToken };
	}

	async logout(jti: string, reason = 'logout') {
		await this.sessions.update(
			{ jtiAccess: jti, revokedAt: IsNull() },
			{ revokedAt: new Date(), revokedReason: reason, logoutAt: new Date() },
		);
		return { ok: true };
	}

	async me(userId: string) {
		const user = await this.users.findOne({ where: { id: userId } });
		if (!user) throw new UnauthorizedException();
		return {
			id: user.id,
			username: user.username,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
		};
	}
}

// Parse TTL tipo '15m', '7d', '3600s'
function addFromNow(ttl: string): Date {
	const now = Date.now();
	const m = /^(\d+)([smhd])$/.exec(ttl);
	let ms: number;
	if (m) {
		const val = parseInt(m[1], 10);
		const unit = m[2];
		ms =
			unit === 's'
				? val * 1000
				: unit === 'm'
					? val * 60_000
					: unit === 'h'
						? val * 3_600_000
						: /* d */ val * 86_400_000;
	} else {
		// fallback (ej: '900s' o '15m' inválido): 7 días
		ms = 7 * 86_400_000;
	}
	return new Date(now + ms);
}
