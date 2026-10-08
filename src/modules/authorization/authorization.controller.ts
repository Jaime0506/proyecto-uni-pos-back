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
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';
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
	// Admin: Obtener todos los permisos (incluyendo eliminados)
	@Get('permissions/get-all-permissions-admin')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions(['permission_admin:read']) // Solo administradores
	async getAllPermissionsAdmin() {
		return this.authorizationService.getAllPermissionsAdmin();
	}

	// Obtener todos los permisos activos
	@Get('permissions/get-all')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions(['permission:read']) // Puede leer permisos
	async getAllPermissions() {
		return this.authorizationService.getAllPermissions();
	}

	// Obtener un permiso por ID
	@Get('permissions/get-by-id/:id')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions(['permission:read']) // Puede leer permisos
	async getPermissionById(@Param('id', ParseIntPipe) id: number) {
		return this.authorizationService.getPermissionById(id);
	}

	// Crear un nuevo permiso
	@Post('permissions/create')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions(['permission:create']) // Puede crear permisos
	async createPermission(@Body() dto: CreatePermissionDto) {
		return this.authorizationService.createPermission(dto);
	}

	// Actualizar un permiso
	@Patch('permissions/update')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions(['permission:update']) // Puede actualizar permisos
	async updatePermission(@Body() dto: UpdatePermissionDto) {
		return this.authorizationService.updatePermission(dto);
	}

	// Eliminar un permiso
	@Delete('permissions/delete')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions(['permission:delete']) // Puede eliminar permisos
	async deletePermission(@Body() dto: DeletePermissionDto) {
		return this.authorizationService.deletePermission(dto);
	}

	// Roles
	// Admin: Obtener todos los roles (incluyendo eliminados)
	@Get('roles/get-all-roles-admin')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions({
		anyOf: ['role:read', 'role_admin:read'],
	}) // Solo administradores
	async getAllRolesAdmin() {
		return await this.authorizationService.getAllRolesAdmin();
	}

	// Obtener todos los roles de una compañía
	@Get('roles/get-all-admin/:id_company')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions(['role_admin:read']) // Puede leer roles
	async getAllRolesAdminByCompany(
		@Param('id_company', ParseIntPipe) id_company: number,
	) {
		return await this.authorizationService.getAllRoles(id_company);
	}

	// Obtener todos los roles de una compañía
	@Get('roles/get-all/:id_company')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions({
		anyOf: ['role:read', 'role_admin:read'],
	}) // Puede leer roles
	async getAllRoles(@Param('id_company', ParseIntPipe) id_company: number) {
		return await this.authorizationService.getAllRoles(id_company);
	}

	// Obtener un rol por ID
	@Get('roles/get-by-id/:id')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions(['role:read']) // Puede leer roles
	async getRoleById(@Param('id', ParseIntPipe) id: number) {
		return await this.authorizationService.getRoleById(id);
	}

	// Crear un nuevo rol
	@Post('roles/create')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions({
		anyOf: ['role:create', 'role_admin:create'],
	}) // Puede crear roles
	async createRole(@Body() dto: CreateRoleDto) {
		return await this.authorizationService.createRole(dto);
	}

	// Actualizar un rol
	@Patch('roles/update')
	@HttpCode(200)
	// @UseGuards(PermissionGuard)
	// @RequirePermissions(['role:update']) // Puede actualizar roles
	async updateRole(@Body() dto: UpdateRoleDto) {
		return await this.authorizationService.updateRole(dto);
	}

	// Eliminar un rol
	@Delete('roles/delete')
	@HttpCode(200)
	@UseGuards(PermissionGuard)
	@RequirePermissions(['role:delete']) // Puede eliminar roles
	async deleteRole(@Body() dto: DeleteRoleDto) {
		return await this.authorizationService.deleteRole(dto);
	}

	// --- Store Endpoints ---

	@Get('roles/store/get-all')
	@HttpCode(200)
	@RequirePermissions(['role:read'])
	async getStoreRoles(@Req() req: Request & { user: RequestUser }) {
		return await this.authorizationService.getStoreRoles(req.user.userId);
	}

	@Get('roles/store/get-by-id/:id')
	@HttpCode(200)
	@RequirePermissions(['role:read'])
	async getStoreRoleById(
		@Param('id', ParseIntPipe) id: number,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.authorizationService.getStoreRoleById(
			id,
			req.user.userId,
		);
	}

	@Post('roles/store/create')
	@HttpCode(200)
	@RequirePermissions(['role:create'])
	async createStoreRole(
		@Body() dto: CreateRoleDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.authorizationService.createStoreRole(
			dto,
			req.user.userId,
		);
	}

	@Patch('roles/store/update')
	@HttpCode(200)
	@RequirePermissions(['role:update'])
	async updateStoreRole(
		@Body() dto: UpdateRoleDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.authorizationService.updateStoreRole(
			dto,
			req.user.userId,
		);
	}

	@Delete('roles/store/delete')
	@HttpCode(200)
	@RequirePermissions(['role:delete'])
	async deleteStoreRole(
		@Body() dto: DeleteRoleDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.authorizationService.deleteStoreRole(
			dto,
			req.user.userId,
		);
	}

	@Get('permissions/store/get-all')
	@HttpCode(200)
	@RequirePermissions(['role:read']) // El admin de tienda puede ver permisos para asignarlos
	async getStorePermissions() {
		return await this.authorizationService.getAllPermissions();
	}
}
