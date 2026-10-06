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
	Query,
	UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { DeleteCustomerDto } from './dtos/delete-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
	constructor(private readonly customersService: CustomersService) {}

	// Obtener clientes por compañía y tienda (o todos si no se especifican filtros)
	@Get('get-all')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['customer:read'])
	@HttpCode(200)
	async getAllCustomers(
		@Query('companyId') companyId?: string,
		@Query('storeId') storeId?: string,
	) {
		return await this.customersService.getAllCustomers(
			companyId ? Number(companyId) : undefined,
			storeId ? Number(storeId) : undefined,
		);
	}

	// Requerimiento C2, C5, C6: Ver perfil y actividad 360° del cliente (compras, devoluciones, bonos)
	@Get(':id/activity')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['customer:read'])
	@HttpCode(200)
	async getCustomerActivity(
		@Param('id', ParseIntPipe) id: number,
		@Query('companyId', ParseIntPipe) companyId: number,
		@Query('storeId', ParseIntPipe) storeId: number,
	) {
		return await this.customersService.getCustomerActivity(
			id,
			companyId,
			storeId,
		);
	}

	// Crear un nuevo cliente (C1: asociando store_id obligatorio)
	@Post('create')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['customer:create'])
	@HttpCode(200)
	async createCustomer(@Body() dto: CreateCustomerDto) {
		return await this.customersService.createCustomer(dto);
	}

	// Actualizar un cliente
	@Patch('update')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['customer:update'])
	@HttpCode(200)
	async updateCustomer(@Body() dto: UpdateCustomerDto) {
		return await this.customersService.updateCustomer(dto);
	}

	// Eliminar un cliente (soft delete) solo si no tiene historial de compras (C4)
	@Delete('delete')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['customer:delete'])
	@HttpCode(200)
	async deleteCustomer(@Body() dto: DeleteCustomerDto) {
		return await this.customersService.deleteCustomer(dto);
	}

	// Requerimiento B1: Restablecer contraseña del cliente desde la tienda
	@Patch('reset-password/:id')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['customer:update'])
	@HttpCode(200)
	async resetPassword(@Param('id', ParseIntPipe) id: number) {
		return await this.customersService.resetPassword(id);
	}
}
