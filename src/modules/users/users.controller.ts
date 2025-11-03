// src/users/users.controller.ts
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './users.service';
import { UpdateDto } from './dtos/update.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { DeleteDto } from './dtos/delete.dto';
import { CreateUserWithRoleDto } from './dtos/create-user-with-role.dto';
import { UpdateUserWithRoleDto } from './dtos/update-user-with-role.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
	constructor(private readonly users: UserService) {}

	// ========== Sección: Users - Personal ==========
	@ApiTags('Users - Personal')
	@Patch('me/update')
	@HttpCode(200)
	async update(
		@Body() dto: UpdateDto,
		@Req() req: Request & { user: { userId: string } },
	) {
		return this.users.update(req.user.userId, dto);
	}

	@ApiTags('Users - Personal')
	@Patch('me/change-password')
	@HttpCode(200)
	async changePassword(
		@Body() dto: ChangePasswordDto,
		@Req() req: Request & { user: { userId: string } },
	) {
		return this.users.changePassword(req.user.userId, dto);
	}

	@ApiTags('Users - Personal')
	@Delete('me/delete')
	@HttpCode(200)
	async deleteUser(
		@Body() dto: DeleteDto,
		@Req() req: Request & { user: { userId: string } },
	) {
		return this.users.deleteUser(req.user.userId, dto);
	}

	// ========== Sección: Users - Admin Interno ==========
	// Aquí irían los endpoints administrativos con @ApiTags('Users - Admin')
	@ApiTags('Users - Admin')
	@Get('admin/get-all-users')
	@HttpCode(200)
	async getAllUsers() {
		return this.users.getAllUsers();
	}

	@ApiTags('Users - Admin')
	@Get('admin/get-user-by-id/:id')
	@HttpCode(200)
	async getUserById(@Param('id') id: string) {
		return await this.users.getUserById(id);
	}

	@ApiTags('Users - Admin')
	@Post('admin/create-user')
	@HttpCode(200)
	async createUser(@Body() dto: CreateUserWithRoleDto) {
		return await this.users.createUserWithRole(dto);
	}

	@ApiTags('Users - Admin')
	@Patch('admin/update-user')
	@HttpCode(200)
	async updateUser(@Body() dto: UpdateUserWithRoleDto) {
		return await this.users.updateUserWithRole(dto);
	}
}
