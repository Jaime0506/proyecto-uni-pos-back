import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { CreatePermissionDto } from './dtos/permissions/create-permission';
import { UpdatePermissionDto } from './dtos/permissions/update-permission';
import { DeletePermissionDto } from './dtos/permissions/delete-permission';
import { CreateRoleDto } from './dtos/roles/create-role';
import { UpdateRoleDto } from './dtos/roles/update-role';
import { DeleteRoleDto } from './dtos/roles/delete-role';

@Controller('authorization')
export class AuthorizationController {
	constructor(private readonly authorizationService: AuthorizationService) {}

	// Permissions
	@Get('permissions/get-all')
	async getAllPermissions() {
		return this.authorizationService.getAllPermissions();
	}

	@Get('permissions/get-by-id/:id')
	async getPermissionById(@Param('id', ParseIntPipe) id: number) {
		return this.authorizationService.getPermissionById(id);
	}

	@Post('permissions/create')
	async createPermission(@Body() dto: CreatePermissionDto) {
		return this.authorizationService.createPermission(dto);
	}

	@Patch('permissions/update')
	async updatePermission(@Body() dto: UpdatePermissionDto) {
		return this.authorizationService.updatePermission(dto);
	}

	@Delete('permissions/delete')
	async deletePermission(@Body() dto: DeletePermissionDto) {
		return this.authorizationService.deletePermission(dto);
	}

	// Roles
	@Get('roles/get-all/:id_company')
	async getAllRoles(@Param('id_company', ParseIntPipe) id_company: number) {
		return await this.authorizationService.getAllRoles(id_company);
	}

	@Get('roles/get-by-id/:id')
	async getRoleById(@Param('id', ParseIntPipe) id: number) {
		return await this.authorizationService.getRoleById(id);
	}

	@Post('roles/create')
	async createRole(@Body() dto: CreateRoleDto) {
		return await this.authorizationService.createRole(dto);
	}

	@Patch('roles/update')
	async updateRole(@Body() dto: UpdateRoleDto) {
		return await this.authorizationService.updateRole(dto);
	}

	@Delete('roles/delete')
	async deleteRole(@Body() dto: DeleteRoleDto) {
		return await this.authorizationService.deleteRole(dto);
	}
}
