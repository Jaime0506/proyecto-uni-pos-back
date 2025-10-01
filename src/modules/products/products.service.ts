import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { GetAllProductsDto } from './dto/get-all-products.dto';

@Injectable()
export class ProductsService {
	constructor(
		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,
	) {}

	async getAllProducts(dto: GetAllProductsDto) {
		return this.productRepository.find({
			where: {
				company: {
					id: dto.companyId,
				},
			},
		});
	}
}
