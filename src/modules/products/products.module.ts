import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { AuthorizationModule } from '../auth/authorization/authorization.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Product, ProductCategory]),
		AuthorizationModule,
	],
	controllers: [ProductsController],
	providers: [ProductsService],
})
export class ProductsModule {}
