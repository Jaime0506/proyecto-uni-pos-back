import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Category } from 'src/modules/categories/entities/category.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Product, ProductCategory, Category]),
		AuthorizationGuardModule,
	],
	controllers: [ProductsController],
	providers: [ProductsService],
})
export class ProductsModule {}
