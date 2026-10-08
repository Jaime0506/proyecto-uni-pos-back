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
import { ActivateUserDto } from './dtos/activate-user.dto';
import { CreateUserWithRoleDto } from './dtos/create-user-with-role.dto';
import { UpdateUserWithRoleDto } from './dtos/update-user-with-role.dto';
import { AdminResetPasswordDto } from './dtos/admin-reset-password.dto';
import { RequestUser } from 'src/types/global';
import {
	PermissionGuard,
	RequirePermissions,
	StoreAccessGuard,
} from '../auth/authorization-guard';
import {
	CreateStoreEmployeeDto,
	UpdateStoreEmployeeDto,
	StoreUserActionDto,
} from './dtos/by-store-user.dto';
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

	@ApiTags('Users - Admin')
	@Patch('admin/reset-password')
	@RequirePermissions(['user_admin:update'])
	@CacheInvalidate({
		keys: ['users:all'],
	})
	@HttpCode(200)
	async adminResetPassword(
		@Body() dto: AdminResetPasswordDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.adminResetPassword(dto, req.user);
	}

	@ApiTags('Users - Admin')
	@Patch('admin/activate-user')
	@RequirePermissions(['user_admin:update'])
	@CacheInvalidate({
		keys: ['users:all'],
	})
	@HttpCode(200)
	async activateUserAdmin(@Body() dto: ActivateUserDto) {
		return await this.users.activateUserAdmin(dto);
	}

	@ApiTags('Users - Admin')
	@Delete('admin/delete-user')
	@RequirePermissions(['user_admin:delete'])
	@CacheInvalidate({
		keys: ['users:all'],
	})
	@HttpCode(200)
	async deleteUserAdmin(@Body() dto: DeleteDto) {
		return await this.users.deleteUserAdmin(dto);
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

	@ApiTags('Users - Store Admin')
	@Patch('store/reset-password')
	@RequirePermissions(['user:update'])
	@HttpCode(200)
	async storeResetPassword(
		@Body() dto: AdminResetPasswordDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.storeResetPassword(dto, req.user);
	}

	@ApiTags('Users - Store Admin')
	@Patch('store/activate-user')
	@RequirePermissions(['user:update'])
	@HttpCode(200)
	async activateStoreUser(
		@Body() dto: ActivateUserDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.activateStoreUser(dto, req.user.userId);
	}

	@ApiTags('Users - Store Admin')
	@Delete('store/delete-user')
	@RequirePermissions(['user:delete'])
	@HttpCode(200)
	async deleteStoreUser(
		@Body() dto: DeleteDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.deleteStoreUser(dto, req.user.userId);
	}

	// ========== Sección: Users - Gestión de Empleados por Tienda ==========
	@ApiTags('Users - Store Employees')
	@Get('by-store/get-all/:storeId')
	@UseGuards(StoreAccessGuard)
	@RequirePermissions(['store_user:read'])
	@HttpCode(200)
	async getUsersByStore(
		@Param('storeId') storeId: string,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.getUsersByStore(Number(storeId), req.user.userId);
	}

	@ApiTags('Users - Store Employees')
	@Post('by-store/create-user')
	@UseGuards(StoreAccessGuard)
	@RequirePermissions(['store_user:create'])
	@HttpCode(200)
	async createStoreEmployee(
		@Body() dto: CreateStoreEmployeeDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.createStoreEmployee(dto, req.user.userId);
	}

	@ApiTags('Users - Store Employees')
	@Patch('by-store/update-user')
	@UseGuards(StoreAccessGuard)
	@RequirePermissions(['store_user:update'])
	@HttpCode(200)
	async updateStoreEmployee(
		@Body() dto: UpdateStoreEmployeeDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.updateStoreEmployee(dto, req.user.userId);
	}

	@ApiTags('Users - Store Employees')
	@Patch('by-store/activate-user')
	@UseGuards(StoreAccessGuard)
	@RequirePermissions(['store_user:update'])
	@HttpCode(200)
	async activateStoreEmployee(
		@Body() dto: StoreUserActionDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.activateStoreEmployee(dto, req.user.userId);
	}

	@ApiTags('Users - Store Employees')
	@Delete('by-store/deactivate-user')
	@UseGuards(StoreAccessGuard)
	@RequirePermissions(['store_user:delete'])
	@HttpCode(200)
	async deactivateStoreEmployee(
		@Body() dto: StoreUserActionDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.users.deactivateStoreEmployee(dto, req.user.userId);
	}
}
