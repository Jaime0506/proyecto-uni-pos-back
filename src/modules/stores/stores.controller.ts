import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Patch,
	Post,
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

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('stores')
export class StoresController {
	constructor(private readonly storesService: StoresService) {}

	// Obtener todas las tiendas (incluyendo desactivadas)
	@Get('get-all')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['store:read'])
	@HttpCode(200)
	async getAllStores() {
		return await this.storesService.getAllStores();
	}

	// Crear una nueva tienda
	@Post('create')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['store:create'])
	@HttpCode(200)
	async createStore(@Body() dto: CreateStoreDto) {
		return await this.storesService.createStore(dto);
	}

	// Actualizar una tienda
	@Patch('update')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['store:update'])
	@HttpCode(200)
	async updateStore(@Body() dto: UpdateStoreDto) {
		return await this.storesService.updateStore(dto);
	}

	// Eliminar una tienda (soft delete)
	@Delete('delete')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['store:delete'])
	@HttpCode(200)
	async deleteStore(@Body() dto: DeleteStoreDto) {
		return await this.storesService.deleteStore(dto);
	}
}
