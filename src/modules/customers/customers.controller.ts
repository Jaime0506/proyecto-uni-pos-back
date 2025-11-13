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

	// Obtener todos los clientes (incluyendo eliminados)
	@Get('get-all')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['customer:read'])
	@HttpCode(200)
	async getAllCustomers() {
		return await this.customersService.getAllCustomers();
	}

	// Crear un nuevo cliente
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

	// Eliminar un cliente (soft delete)
	@Delete('delete')
	@UseGuards(PermissionGuard)
	@RequirePermissions(['customer:delete'])
	@HttpCode(200)
	async deleteCustomer(@Body() dto: DeleteCustomerDto) {
		return await this.customersService.deleteCustomer(dto);
	}
}
