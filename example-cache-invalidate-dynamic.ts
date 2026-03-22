// // Ejemplo avanzado: Invalidation dinámica con CacheInvalidate
// import { Controller, Delete, Patch, Post, Req } from '@nestjs/common';
// import { Cache } from 'src/modules/cache/decorators/cache.decorator';
// import { CacheInvalidate } from 'src/modules/cache/decorators/cache-invalidate.decorator';
// import type { Request } from 'express';
// import { RequestUser } from 'src/types/global';

// @Controller('products')
// export class ProductsController {
// 	// Cache con userFields
// 	@Get('my-products')
// 	@Cache({
// 		key: 'user:products',
// 		ttl: '10M',
// 		userFields: ['userId', 'companyId'], // Cache por usuario y compañía
// 	})
// 	async getMyProducts(@Req() req: Request & { user: RequestUser }) {
// 		return this.productsService.getByUser(req.user.userId);
// 	}

// 	// Invalidation dinámica: invalida basado en el productId del param
// 	@Delete(':productId')
// 	@CacheInvalidate({
// 		params: ['productId'], // Invalida: productId:123
// 		userFields: ['companyId'], // Invalida: user:companyId:5
// 		patterns: ['products:*', 'user:*:products'], // Patrones relacionados
// 	})
// 	async deleteProduct(
// 		@Param('productId') productId: number,
// 		@Req() req: Request & { user: RequestUser },
// 	) {
// 		return this.productsService.delete(productId);
// 	}

// 	// Invalidation basada en body: invalida por companyId del body
// 	@Post('create')
// 	@CacheInvalidate({
// 		body: ['companyId'], // Invalida: companyId:5
// 		patterns: ['products:*', 'company:*:products'],
// 	})
// 	async createProduct(@Body() dto: CreateProductDto) {
// 		return this.productsService.create(dto);
// 	}

// 	// Invalidation combinada: params + userFields + patrones
// 	@Patch(':productId/update-stock')
// 	@CacheInvalidate({
// 		keys: ['products:featured'], // Keys estáticas
// 		params: ['productId'], // Dinámicas: productId:123
// 		userFields: ['userId'], // Dinámicas: user:userId:456
// 		patterns: ['products:*', 'inventory:*'], // Patrones
// 	})
// 	async updateStock(
// 		@Param('productId') productId: number,
// 		@Body() dto: UpdateStockDto,
// 		@Req() req: Request & { user: RequestUser },
// 	) {
// 		return this.productsService.updateStock(productId, dto.quantity);
// 	}
// }
