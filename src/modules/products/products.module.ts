import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';

import { Category } from 'src/modules/categories/entities/category.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Product, Category, StockMovement]),
		AuthorizationGuardModule,
	],
	controllers: [ProductsController],
	providers: [ProductsService],
})
export class ProductsModule {}
