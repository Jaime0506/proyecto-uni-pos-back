import {
	Body,
	Controller,
	Get,
	Post,
	Query,
	Request,
	UseGuards,
} from '@nestjs/common';
import { PermissionGuard } from '../auth/authorization-guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { GetAllSalesDto } from './dto/get-all-sales-dto';
import { CreateCustomerDto } from './dto/create-customer.dto';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SalesController {
	constructor(private readonly salesService: SalesService) {}

	@Post('get-all')
	async getAllSales(@Body() getSalesDto: GetAllSalesDto) {
		return await this.salesService.getAllSales(getSalesDto);
	}

	@Get('/customers/get-all')
	async getAllCustomers(
		@Query('companyId') companyId: string,
		@Query('storeId') storeId: string,
	) {
		const companyIdNumber = parseInt(companyId, 10);
		const storeIdNumber = parseInt(storeId, 10);

		console.log(companyIdNumber, storeIdNumber);

		return await this.salesService.getAllCustomers(
			companyIdNumber,
			storeIdNumber,
		);
	}

	// Buscar cliente por cédula exacta
	@Get('/customers/search')
	async searchCustomerByNationalId(
		@Query('nationalId') nationalId: string,
		@Query('companyId') companyId: string,
		@Query('storeId') storeId: string,
	) {
		return await this.salesService.searchCustomerByNationalId(
			nationalId,
			parseInt(companyId, 10),
			parseInt(storeId, 10),
		);
	}

	// Crear un cliente nuevo en la tienda
	@Post('/customers/create')
	async createCustomer(@Body() dto: CreateCustomerDto) {
		return await this.salesService.createCustomer(dto);
	}

	@Post('create')
	async createSale(
		@Body() createSaleDto: any,
		@Request() req: { user: { userId: string } },
	) {
		const userId = req.user.userId;
		return await this.salesService.createSale(createSaleDto, userId);
	}
}
