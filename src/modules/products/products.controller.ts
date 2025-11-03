import {
	Body,
	Controller,
	Post,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/authorization-guard';
import { GetAllProductsDto } from './dto/get-all-products.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	// @RequirePermissions(['products:read'])
	@Post('get-all')
	async getAllProducts(@Body() dto: GetAllProductsDto) {
		return this.productsService.getAllProducts(dto);
	}

	@UseInterceptors(FileInterceptor('file'))
	@Post('uploadProductsByFile')
	async uploadProductsByFile(
		@Body() body: any,
		@UploadedFile() file: Express.Multer.File,
	) {
		return await this.productsService.uploadProductsByFile(body, file);
	}
}
