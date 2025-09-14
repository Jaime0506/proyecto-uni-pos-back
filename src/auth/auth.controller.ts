// src/auth/auth.controller.ts
import {
	Body,
	Controller,
	Get,
	HttpCode,
	Ip,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RefreshDto } from './dtos/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dtos/register.dto';
import { AvailabilityDto } from './dtos/availability.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly auth: AuthService) {}

	@Post('login')
	@HttpCode(200)
	async login(@Body() dto: LoginDto, @Req() req: Request, @Ip() ip: string) {
		const ua = req.get?.('user-agent') || req.headers['user-agent'];
		return this.auth.login(
			dto.userName,
			dto.password,
			ip,
			ua,
			dto.deviceId,
			dto.companyId,
		);
	}

	@Post('register')
	@HttpCode(200)
	async register(@Body() dto: RegisterDto) {
		return this.auth.register(dto);
	}

	@Post('refresh')
	@HttpCode(200)
	async refresh(@Body() dto: RefreshDto) {
		return this.auth.refresh(dto.refreshToken);
	}

	@UseGuards(JwtAuthGuard)
	@Post('logout')
	@HttpCode(200)
	async logout(@Req() req: Request & { user: { jti: string } }) {
		return this.auth.logout(req.user.jti, 'logout');
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	@HttpCode(200)
	async me(@Req() req: Request & { user: { userId: string } }) {
		return this.auth.me(req.user.userId);
	}

	@Post('availability')
	@HttpCode(200)
	async availability(@Body() dto: AvailabilityDto) {
		return this.auth.availability(dto);
	}
}
