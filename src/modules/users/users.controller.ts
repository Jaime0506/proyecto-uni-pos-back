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
import { RequestUser } from 'src/types/global';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';
import { Cache } from '../cache/decorators/cache.decorator';
import { CacheInvalidate } from '../cache/decorators/cache-invalidate.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
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
	@RequirePermissions(['user_admin:read'])
	// @Cache({
	// 	key: 'users:all',
	// 	ttl: '1d',
	// })
	@HttpCode(200)
	async getAllUsers() {
		return this.users.getAllUsers();
	}

	@ApiTags('Users - Admin')
	@Get('admin/get-user-by-id/:id')
	@RequirePermissions(['user_admin:read'])
	@HttpCode(200)
	async getUserById(@Param('id') id: string) {
		return await this.users.getUserById(id);
	}

	@ApiTags('Users - Admin')
	@Post('admin/create-user')
	@RequirePermissions(['user_admin:create'])
	@CacheInvalidate({
		keys: ['users:all'],
	})
	@HttpCode(200)
	async createUser(@Body() dto: CreateUserWithRoleDto) {
		return await this.users.createUserWithRole(dto);
	}

	@ApiTags('Users - Admin')
	@Patch('admin/update-user')
	@RequirePermissions(['user_admin:update'])
	@CacheInvalidate({
		keys: ['users:all'],
	})
	@HttpCode(200)
	async updateUser(@Body() dto: UpdateUserWithRoleDto) {
		return await this.users.updateUserWithRole(dto);
	}

	@ApiTags('Users - Personal')
	@Get('get-user-company-and-stores')
	@HttpCode(200)
	async getUserCompanyAndStores(@Req() req: Request & { user: RequestUser }) {
		return await this.users.getUserCompanyAndStores(req.user.userId);
	}

	// ========== Sección: Users - Admin de Tienda ==========
	@ApiTags('Users - Store Admin')
	@Get('store/get-all-users')
	@RequirePermissions(['user:read'])
	@HttpCode(200)
	async getStoreUsers(@Req() req: Request & { user: RequestUser }) {
		return this.users.getStoreUsers(req.user.userId);
	}

	@ApiTags('Users - Store Admin')
	@Get('store/get-user-by-id/:id')
	@RequirePermissions(['user:read'])
	@HttpCode(200)
	async getStoreUserById(
		@Param('id') id: string,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.getStoreUserById(id, req.user.userId);
	}

	@ApiTags('Users - Store Admin')
	@Post('store/create-user')
	@RequirePermissions(['user:create'])
	@HttpCode(200)
	async createStoreUser(
		@Body() dto: CreateUserWithRoleDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.createStoreUserWithRole(dto, req.user.userId);
	}

	@ApiTags('Users - Store Admin')
	@Patch('store/update-user')
	@RequirePermissions(['user:update'])
	@HttpCode(200)
	async updateStoreUser(
		@Body() dto: UpdateUserWithRoleDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.updateStoreUserWithRole(dto, req.user.userId);
	}
}
