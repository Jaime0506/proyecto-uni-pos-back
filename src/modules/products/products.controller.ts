import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Req,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/authorization-guard';
import { GetAllProductsDto } from './dto/get-all-products.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { StockEntryDto } from './dto/stock-entry.dto';

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
	@Post('preview-upload')
	async previewUpload(
		@Body() body: any,
		@UploadedFile() file: Express.Multer.File,
	) {
		return await this.productsService.previewUpload(body, file);
	}

	@UseInterceptors(FileInterceptor('file'))
	@Post('uploadProductsByFile')
	async uploadProductsByFile(
		@Body() body: any,
		@UploadedFile() file: Express.Multer.File,
		@Req() req: any,
	) {
		const userId = req.user?.id || req.user?.sub;
		return await this.productsService.uploadProducts(body, file, userId);
	}

	@Patch('update')
	async updateProduct(@Body() dto: UpdateProductDto) {
		return this.productsService.updateProduct(dto);
	}

	@Post('create')
	async createProduct(@Body() dto: CreateProductDto, @Req() req: any) {
		const userId = req.user?.id || req.user?.sub;
		return this.productsService.createProduct(dto, userId);
	}

	@Post('stock-entry/:id')
	async addStockEntry(
		@Param('id') id: number,
		@Body() dto: StockEntryDto,
		@Req() req: any,
	) {
		const userId = req.user?.id || req.user?.sub;
		return this.productsService.addStockEntry(Number(id), dto, userId);
	}

	@Get(':id/movements')
	async getProductMovements(@Param('id') id: number) {
		return this.productsService.getProductMovements(Number(id));
	}

	@Delete('delete/:id')
	async deleteProduct(@Param('id') id: number) {
		return this.productsService.deleteProduct(id);
	}
}
