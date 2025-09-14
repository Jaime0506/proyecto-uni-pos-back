// src/users/users.controller.ts
import {
	Body,
	Controller,
	Delete,
	HttpCode,
	Patch,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateDto } from './dtos/update.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { DeleteDto } from './dtos/delete.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
	constructor(private readonly users: UserService) {}

	@Patch('me/update')
	@HttpCode(200)
	async update(
		@Body() dto: UpdateDto,
		@Req() req: Request & { user: { userId: string } },
	) {
		return this.users.update(req.user.userId, dto);
	}

	@Patch('me/change-password')
	@HttpCode(200)
	async changePassword(
		@Body() dto: ChangePasswordDto,
		@Req() req: Request & { user: { userId: string } },
	) {
		return this.users.changePassword(req.user.userId, dto);
	}

	@Delete('me/delete')
	@HttpCode(200)
	async deleteUser(
		@Body() dto: DeleteDto,
		@Req() req: Request & { user: { userId: string } },
	) {
		return this.users.deleteUser(req.user.userId, dto);
	}
}
