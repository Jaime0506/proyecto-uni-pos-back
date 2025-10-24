import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/authorization-guard';
import { GetAllProductsDto } from './dto/get-all-products.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	// @RequirePermissions(['products:read'])
	@Post('get-all')
	async getAllProducts(@Body() dto: GetAllProductsDto) {
		return this.productsService.getAllProducts(dto);
	}
}
