import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { CreatePermissionDto } from './dtos/permissions/create-permission';
import { UpdatePermissionDto } from './dtos/permissions/update-permission';
import { DeletePermissionDto } from './dtos/permissions/delete-permission';
import { CreateRoleDto } from './dtos/roles/create-role';
import { UpdateRoleDto } from './dtos/roles/update-role';
import { DeleteRoleDto } from './dtos/roles/delete-role';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequestUser } from 'src/types/global';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('authorization')
export class AuthorizationController {
	constructor(private readonly authorizationService: AuthorizationService) {}

	// Obtener todos los roles y permisos del usuario
	@Get('get-all-roles-and-permissions-by-user-id')
	@HttpCode(200)
	async getAllRolesAndPermissionsByUserId(
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.authorizationService.getAllRolesAndPermissionsByUserId(
			req,
		);
	}

	// Permissions
	@Get('permissions/get-all-admin')
	@HttpCode(200)
	async getAllPermissionsAdmin() {
		return this.authorizationService.getAllPermissionsAdmin();
	}

	@Get('permissions/get-all')
	@HttpCode(200)
	async getAllPermissions() {
		return this.authorizationService.getAllPermissions();
	}

	@Get('permissions/get-by-id/:id')
	@HttpCode(200)
	async getPermissionById(@Param('id', ParseIntPipe) id: number) {
		return this.authorizationService.getPermissionById(id);
	}

	@Post('permissions/create')
	@HttpCode(200)
	async createPermission(@Body() dto: CreatePermissionDto) {
		return this.authorizationService.createPermission(dto);
	}

	@Patch('permissions/update')
	@HttpCode(200)
	async updatePermission(@Body() dto: UpdatePermissionDto) {
		return this.authorizationService.updatePermission(dto);
	}

	@Delete('permissions/delete')
	@HttpCode(200)
	async deletePermission(@Body() dto: DeletePermissionDto) {
		return this.authorizationService.deletePermission(dto);
	}

	// Roles
	@Get('roles/get-all-admin')
	@HttpCode(200)
	async getAllRolesAdmin() {
		return await this.authorizationService.getAllRolesAdmin();
	}

	@Get('roles/get-all/:id_company')
	@HttpCode(200)
	async getAllRoles(@Param('id_company', ParseIntPipe) id_company: number) {
		return await this.authorizationService.getAllRoles(id_company);
	}

	@Get('roles/get-by-id/:id')
	@HttpCode(200)
	async getRoleById(@Param('id', ParseIntPipe) id: number) {
		return await this.authorizationService.getRoleById(id);
	}

	@Post('roles/create')
	@HttpCode(200)
	async createRole(@Body() dto: CreateRoleDto) {
		return await this.authorizationService.createRole(dto);
	}

	@Patch('roles/update')
	@HttpCode(200)
	async updateRole(@Body() dto: UpdateRoleDto) {
		return await this.authorizationService.updateRole(dto);
	}

	@Delete('roles/delete')
	@HttpCode(200)
	async deleteRole(@Body() dto: DeleteRoleDto) {
		return await this.authorizationService.deleteRole(dto);
	}
}
