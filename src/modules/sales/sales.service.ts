import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GetAllSalesDto } from './dto/get-all-sales-dto';
import { Customer } from './entities/customer.entity';

@Injectable()
export class SalesService {
	constructor(
		private readonly dataSource: DataSource,

		@InjectRepository(Customer)
		private readonly customerRepository: Repository<Customer>,
	) {}

	async getAllSales(getSalesDto: GetAllSalesDto) {
		console.log('BODY EN getAllSales', getSalesDto);

		return [];
	}

	async getAllCustomers(companyId?: number) {
		console.log('BODY EN getAllCustomers', companyId);

		return await this.customerRepository.find({
			where: companyId ? { companyId } : {},
		});
	}

	async createSale(createSaleDto: any, userId: string) {
		console.log('BODY EN CREATESALE', createSaleDto, userId);

		return [];
	}
}
