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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { UpdateSupplierDto } from './dtos/update-supplier.dto';
import { DeleteSupplierDto } from './dtos/delete-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
	constructor(private readonly suppliersService: SuppliersService) {}

	// Obtener todos los proveedores (incluyendo desactivados)
	@Get('get-all')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['supplier:read'])
	@HttpCode(200)
	async getAllSuppliers() {
		return await this.suppliersService.getAllSuppliers();
	}

	// Crear un nuevo proveedor
	@Post('create')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['supplier:create'])
	@HttpCode(200)
	async createSupplier(@Body() dto: CreateSupplierDto) {
		return await this.suppliersService.createSupplier(dto);
	}

	// Actualizar un proveedor
	@Patch('update')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['supplier:update'])
	@HttpCode(200)
	async updateSupplier(@Body() dto: UpdateSupplierDto) {
		return await this.suppliersService.updateSupplier(dto);
	}

	// Eliminar un proveedor (soft delete)
	@Delete('delete')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['supplier:delete'])
	@HttpCode(200)
	async deleteSupplier(@Body() dto: DeleteSupplierDto) {
		return await this.suppliersService.deleteSupplier(dto);
	}
}
