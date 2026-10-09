import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
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
import { RequestUser } from 'src/types/global';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
	constructor(private readonly suppliersService: SuppliersService) {}

	// Obtener todos los proveedores por compañía (aislado por compañía salvo superRoot)
	@Get('get-all')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['supplier:read'])
	@HttpCode(200)
	async getAllSuppliers(
		@Req() req: Request & { user: RequestUser },
		@Query('companyId') companyId?: string,
	) {
		return await this.suppliersService.getAllSuppliers(
			req.user,
			companyId ? Number(companyId) : undefined,
		);
	}

	// Crear un nuevo proveedor
	@Post('create')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['supplier:create'])
	@HttpCode(200)
	async createSupplier(
		@Body() dto: CreateSupplierDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.suppliersService.createSupplier(dto, req.user);
	}

	// Actualizar un proveedor
	@Patch('update')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['supplier:update'])
	@HttpCode(200)
	async updateSupplier(
		@Body() dto: UpdateSupplierDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.suppliersService.updateSupplier(dto, req.user);
	}

	// Eliminar un proveedor (soft delete)
	@Delete('delete')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['supplier:delete'])
	@HttpCode(200)
	async deleteSupplier(
		@Body() dto: DeleteSupplierDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.suppliersService.deleteSupplier(dto, req.user);
	}
}
