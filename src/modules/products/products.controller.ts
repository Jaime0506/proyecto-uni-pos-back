import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermissions } from '../auth/authorization';
import { GetAllProductsDto } from './dto/get-all-products.dto';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	@UseGuards(PermissionGuard)
	@RequirePermissions(['products:read'])
	@Post('get-all')
	async getAllProducts(@Body() dto: GetAllProductsDto) {
		return this.productsService.getAllProducts(dto);
	}
}
