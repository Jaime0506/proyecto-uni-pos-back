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
	async getAllCustomers(@Query('companyId') companyId?: string) {
		const companyIdNumber = companyId ? parseInt(companyId, 10) : undefined;
		return await this.salesService.getAllCustomers(companyIdNumber);
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
