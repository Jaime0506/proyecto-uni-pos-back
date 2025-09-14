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
import { compareSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { addFromNow } from 'src/utils/jwt.utilities';
import { processTransaction } from '../database/transactions';
import { RegisterDto } from './dtos/register.dto';
import { createUserName, hashPassword } from 'src/utils/auth.utilities';
import { AvailabilityDto } from './dtos/availability.dto';

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
		userName: string,
		password: string,
		ip?: string,
		userAgent?: string,
		deviceId?: string,
		companyId?: number,
	) {
		const user = await this.users.findOne({
			where: [{ username: userName }],
		});

		if (!user) {
			throw new UnauthorizedException('Credenciales inválidas');
		}

		if (!user.isActive) {
			throw new UnauthorizedException(
				'Usuario inactivo, contacte a un administrador',
			);
		}
		const ok = compareSync(password, user.password);

		if (!ok) {
			throw new UnauthorizedException('Credenciales inválidas');
		}

		const session = await this.sessions.findOne({
			where: { user: { id: user.id } },
		});

		if (session) {
			throw new UnauthorizedException('Usuario ya tiene una sesión activa');
		}

		const jti = randomUUID();
		const refreshTtl = this.cfg.get<string>('JWT_REFRESH_TTL') || '7d';
		const expiresAt = addFromNow(refreshTtl);

		// transacción: crear sesión y firmar tokens
		return await processTransaction(this.dataSource, async (queryRunner) => {
			const sessRepo = queryRunner.manager.getRepository(Session);
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
				{
					sub: user.id,
					jti,
					username: user.username,
					isSuperRoot: user.isSuperRoot,
				},
				{ expiresIn: this.cfg.get('JWT_ACCESS_TTL') || '15m' },
			);

			// refresh con mismo jti pero TTL largo
			const refreshToken = this.jwt.sign(
				{
					sub: user.id,
					jti,
					username: user.username,
					isSuperRoot: user.isSuperRoot,
					typ: 'refresh',
				},
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
					isSuperRoot: user.isSuperRoot,
				},
			};
		});
	}

	async register(dto: RegisterDto) {
		const { firstName, lastName, email, nationalId, password, phoneNumber } =
			dto;

		// verificar si el usuario ya existe x email o nationalId
		const user = await this.users.findOne({ where: { email, nationalId } });
		if (user) {
			throw new BadRequestException('El usuario ya existe');
		}

		// crear el username
		const username = createUserName(firstName, lastName, nationalId);

		// crear el password
		const hashedPassword = await hashPassword(password);

		// crear el usuario
		const newUser = this.users.create({
			username,
			firstName,
			lastName,
			email,
			nationalId,
			password: hashedPassword,
			phoneNumber,
		});

		await this.users.save(newUser);

		return {
			ok: true,
			message: 'Usuario creado correctamente',
		};
	}

	async availability(dto: AvailabilityDto) {
		const { username, email, nationalId } = dto;

		const existingByUsername = await this.users.findOne({
			where: { username },
		});
		if (existingByUsername) {
			throw new BadRequestException('El nombre de usuario ya está en uso');
		}

		const existingByEmail = await this.users.findOne({ where: { email } });

		if (existingByEmail) {
			throw new BadRequestException('El correo electrónico ya está en uso');
		}

		const existingByNationalId = await this.users.findOne({
			where: { nationalId },
		});

		if (existingByNationalId) {
			throw new BadRequestException(
				'El número de identificación ya está en uso',
			);
		}

		return {
			ok: true,
			message: 'Usuario disponible',
		};
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
				isSuperRoot: session.user.isSuperRoot,
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
		if (!user) throw new UnauthorizedException('Usuario no encontrado');
		return {
			id: user.id,
			username: user.username,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			isSuperRoot: user.isSuperRoot,
		};
	}
}
