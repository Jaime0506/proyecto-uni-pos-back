import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Patch,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dtos/create-store.dto';
import { UpdateStoreDto } from './dtos/update-store.dto';
import { DeleteStoreDto } from './dtos/delete-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';
import type { Request } from 'express';
import { RequestUser } from 'src/types/global';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('stores')
export class StoresController {
	constructor(private readonly storesService: StoresService) {}

	// Obtener tiendas de la compañía del usuario autenticado (activas)
	@Get('company/get-all')
	@UseGuards(PermissionGuard)
	@RequirePermissions({
		anyOf: [
			'store:read',
			'store_admin:read',
			'user:create',
			'user:update',
			'user:read',
			'store_user:read',
			'store_user:create',
		],
	})
	@HttpCode(200)
	async getCompanyStores(@Req() req: Request & { user: RequestUser }) {
		return await this.storesService.getCompanyStores(req.user);
	}

	// Obtener todas las tiendas (respetando aislamiento por compañía a menos que tenga store_admin:read)
	@Get('get-all')
	@UseGuards(PermissionGuard)
	@RequirePermissions({
		anyOf: ['store:read', 'store_admin:read'],
	})
	@HttpCode(200)
	async getAllStores(@Req() req: Request & { user: RequestUser }) {
		return await this.storesService.getAllStores(req.user);
	}

	// Crear una nueva tienda
	@Post('create')
	@UseGuards(PermissionGuard)
	@RequirePermissions({
		anyOf: ['store:create', 'store_admin:create'],
	})
	@HttpCode(200)
	async createStore(
		@Body() dto: CreateStoreDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.storesService.createStore(dto, req.user);
	}

	// Actualizar una tienda
	@Patch('update')
	@UseGuards(PermissionGuard)
	@RequirePermissions({
		anyOf: ['store:update', 'store_admin:update'],
	})
	@HttpCode(200)
	async updateStore(
		@Body() dto: UpdateStoreDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.storesService.updateStore(dto, req.user);
	}

	// Eliminar una tienda (soft delete)
	@Delete('delete')
	@UseGuards(PermissionGuard)
	@RequirePermissions({
		anyOf: ['store:delete', 'store_admin:delete'],
	})
	@HttpCode(200)
	async deleteStore(
		@Body() dto: DeleteStoreDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.storesService.deleteStore(dto, req.user);
	}
}
