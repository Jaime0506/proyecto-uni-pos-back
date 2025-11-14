import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GetAllSalesDto } from './dto/get-all-sales-dto';
import { Customer } from './entities/customer.entity';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-items.entity';
import { Bonus } from './entities/bonuses.entity';
import { Product } from '../products/entities/product.entity';
import { processTransaction } from 'src/database/transactions';

@Injectable()
export class SalesService {
	constructor(
		private readonly dataSource: DataSource,

		@InjectRepository(Customer)
		private readonly customerRepository: Repository<Customer>,

		@InjectRepository(Sale)
		private readonly saleRepository: Repository<Sale>,

		@InjectRepository(SaleItem)
		private readonly saleItemRepository: Repository<SaleItem>,

		@InjectRepository(Bonus)
		private readonly bonusRepository: Repository<Bonus>,

		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,
	) { }

	async getAllSales(getSalesDto: GetAllSalesDto) {
		const { companyId, storeId } = getSalesDto;

		console.log('BODY EN getAllSales', getSalesDto);

		const result = await this.saleRepository
			.createQueryBuilder('s')
			.leftJoin('sale_items', 'si', 'si.sale_id = s.id')
			.leftJoin('customers', 'c', 'c.id = s.customer_id')
			.leftJoin('reward_rules', 'rr', 'rr.id = s.campaign_id')
			.leftJoin('products', 'p', 'p.id = si.product_id')
			.where('s.company_id = :companyId', { companyId })
			.andWhere('s.store_id = :storeId', { storeId })
			.select([
				's.id AS sale_id',
				's.total AS sale_total',
				's.discount_total AS discount_total',
				's.status AS sale_status',
				's.created_at AS sale_created_at',
				'c.id AS customer_id',
				'c.first_name AS customer_first_name',
				'c.last_name AS customer_last_name',
				'rr.id AS campaign_id',
				'rr.title AS campaign_name',
				'si.id AS item_id',
				'si.quantity AS item_quantity',
				'si.unit_price AS item_unit_price',
				'si.line_total AS item_total',
				'p.name AS product_name',
			])
			.orderBy('s.created_at', 'DESC')
			.getRawMany();

		// 🧠 Agrupamos por venta
		const salesMap = new Map<number, any>();

		for (const row of result) {
			if (!salesMap.has(row.sale_id)) {
				salesMap.set(row.sale_id, {
					id: row.sale_id,
					total: row.sale_total,
					status: row.sale_status,
					createdAt: row.sale_created_at,
					customer: {
						id: row.customer_id,
						name: `${row.customer_first_name} ${row.customer_last_name}`,
					},
					campaign: row.campaign_id
						? { id: row.campaign_id, name: row.campaign_name }
						: null,
					items: [],
					discount: row.discount_total,
				});
			}

			// Agregar item si existe
			if (row.item_id) {
				salesMap.get(row.sale_id).items.push({
					id: row.item_id,
					quantity: Number(row.item_quantity),
					unitPrice: Number(row.item_unit_price),
					total: Number(row.item_total),
					productName: row.product_name,
				});
			}
		}

		// Convertimos el Map en array
		const groupedSales = Array.from(salesMap.values());

		return groupedSales;
	}

	async getAllCustomers(companyId?: number) {
		console.log('BODY EN getAllCustomers', companyId);

		return await this.customerRepository.find({
			where: companyId ? { companyId } : {},
		});
	}

	async createSale(createSaleDto: any, userId: string) {
		console.log('createSaleDto', createSaleDto);

		return processTransaction(this.dataSource, async (queryRunner) => {
			const sale = queryRunner.manager.create(Sale, {
				company_id: createSaleDto.companyId,
				store_id: createSaleDto.storeId,
				user_id: userId,
				customer_id: createSaleDto.customerId,
				campaign_id: createSaleDto.campaignId ?? null,
				total: createSaleDto.total,
				discount_total: createSaleDto.discount_total || 0,
				subtotal: createSaleDto.total - (createSaleDto.discount_total || 0),
				status: 'pending',
				channel: 'in_store',
			});

			const savedSale = await queryRunner.manager.save(Sale, sale);

			const saleItems = createSaleDto.products.map((p: any) => ({
				sale_id: savedSale.id,
				product_id: p.id,
				quantity: p.quantity,
				unit_price: Number(p.unit_price),
				line_total: Number(p.line_total),
				discount: 0,
				vat_rate: null,
				vat_amount: 0,
			}));

			await queryRunner.manager.insert(SaleItem, saleItems);

			// Actualizar stock de productos
			for (const product of createSaleDto.products) {
				const productEntity = await queryRunner.manager.findOne(Product, {
					where: { id: product.id },
				});

				if (productEntity) {
					// Restar la cantidad vendida del stock
					productEntity.stock = productEntity.stock - product.quantity;
					await queryRunner.manager.save(Product, productEntity);
				}
			}

			// Proceso de bonificación
			if (createSaleDto.customerId) {

				// Buscar si ya existe una bonificación para este cliente
				const existingBonus = await queryRunner.manager.findOne(Bonus, {
					where: { customer_id: createSaleDto.customerId },
				});

				if (existingBonus) {
					// Actualizar la bonificación existente sumando el nuevo monto
					existingBonus.total_amount = Number(existingBonus.total_amount) + (createSaleDto.discount_total || 0);
					existingBonus.updated_at = new Date();
					await queryRunner.manager.save(Bonus, existingBonus);
				} else {
					// Crear una nueva bonificación
					const newBonus = queryRunner.manager.create(Bonus, {
						customer_id: createSaleDto.customerId,
						total_amount: createSaleDto.discount_total || 0,
					});
					await queryRunner.manager.save(Bonus, newBonus);
				}
			}

			return {
				message: 'Venta creada exitosamente',
				sale: savedSale,
				items: saleItems,
			};
		});
	}
}
