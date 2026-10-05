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
import {
	PermissionGuard,
	RequirePermissions,
	StoreAccessGuard,
} from '../auth/authorization-guard';
import { GetAllProductsDto } from './dto/get-all-products.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { StockEntryDto } from './dto/stock-entry.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionGuard, StoreAccessGuard)
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	@RequirePermissions({ anyOf: ['product:read', 'products:read'] })
	@Post('get-all')
	async getAllProducts(@Body() dto: GetAllProductsDto) {
		return this.productsService.getAllProducts(dto);
	}

	@RequirePermissions(['product:import'])
	@UseInterceptors(FileInterceptor('file'))
	@Post('preview-upload')
	async previewUpload(
		@Body() body: any,
		@UploadedFile() file: Express.Multer.File,
	) {
		return await this.productsService.previewUpload(body, file);
	}

	@RequirePermissions(['product:import'])
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

	@RequirePermissions(['product:update'])
	@Patch('update')
	async updateProduct(@Body() dto: UpdateProductDto) {
		return this.productsService.updateProduct(dto);
	}

	@RequirePermissions(['product:create'])
	@Post('create')
	async createProduct(@Body() dto: CreateProductDto, @Req() req: any) {
		const userId = req.user?.id || req.user?.sub;
		return this.productsService.createProduct(dto, userId);
	}

	@RequirePermissions(['product:stock_entry'])
	@Post('stock-entry/:id')
	async addStockEntry(
		@Param('id') id: number,
		@Body() dto: StockEntryDto,
		@Req() req: any,
	) {
		const userId = req.user?.id || req.user?.sub;
		return this.productsService.addStockEntry(Number(id), dto, userId);
	}

	@RequirePermissions(['product:kardex_read'])
	@Get(':id/movements')
	async getProductMovements(@Param('id') id: number) {
		return this.productsService.getProductMovements(Number(id));
	}

	@RequirePermissions(['product:delete'])
	@Delete('delete/:id')
	async deleteProduct(@Param('id') id: number) {
		return this.productsService.deleteProduct(id);
	}
}
