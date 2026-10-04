import {
	BadRequestException,
	ConflictException,
	Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GetAllSalesDto } from './dto/get-all-sales-dto';
import { Customer } from './entities/customer.entity';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-items.entity';
import { Bonus } from './entities/bonuses.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../products/entities/stock-movement.entity';
import { RewardRule } from '../rewards/entities/reward-rule.entity';
import { processTransaction } from 'src/database/transactions';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateSaleDto } from './dto/create-sale.dto';

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
	) {}

	async getAllSales(getSalesDto: GetAllSalesDto) {
		const { companyId, storeId, startDate, endDate, search } = getSalesDto;

		const query = this.saleRepository
			.createQueryBuilder('s')
			.leftJoin('sale_items', 'si', 'si.sale_id = s.id')
			.leftJoin('customers', 'c', 'c.id = s.customer_id')
			.leftJoin('reward_rules', 'rr', 'rr.id = s.campaign_id')
			.leftJoin('products', 'p', 'p.id = si.product_id')
			.where('s.company_id = :companyId', { companyId })
			.andWhere('s.store_id = :storeId', { storeId });

		if (startDate) {
			const start = new Date(startDate);
			start.setHours(0, 0, 0, 0);
			query.andWhere('s.created_at >= :startDate', { startDate: start });
		}

		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			query.andWhere('s.created_at <= :endDate', { endDate: end });
		}

		if (search && search.trim()) {
			const term = search.trim();
			const cleanTerm = term.replace(/^#/, '').trim();
			const searchLike = `%${cleanTerm}%`;
			const isNum = /^\d+$/.test(cleanTerm);

			if (isNum) {
				const saleId = parseInt(cleanTerm, 10);
				query.andWhere(
					'(s.id = :saleId OR CAST(s.id AS TEXT) ILIKE :searchLike OR c.national_id ILIKE :searchLike)',
					{ saleId, searchLike },
				);
			} else {
				query.andWhere(
					'(CAST(s.id AS TEXT) ILIKE :searchLike OR c.national_id ILIKE :searchLike OR c.first_name ILIKE :searchLike OR c.last_name ILIKE :searchLike)',
					{ searchLike },
				);
			}
		}

		const result = await query
			.select([
				's.id AS sale_id',
				's.total AS sale_total',
				's.subtotal AS sale_subtotal',
				's.tax_total AS sale_tax_total',
				's.discount_total AS discount_total',
				's.status AS sale_status',
				's.payment_method AS sale_payment_method',
				's.created_at AS sale_created_at',
				'c.id AS customer_id',
				'c.national_id AS customer_national_id',
				'c.first_name AS customer_first_name',
				'c.last_name AS customer_last_name',
				'rr.id AS campaign_id',
				'rr.title AS campaign_name',
				'si.id AS item_id',
				'si.quantity AS item_quantity',
				'si.unit_price AS item_unit_price',
				'si.vat_rate AS item_vat_rate',
				'si.vat_amount AS item_vat_amount',
				'si.line_total AS item_total',
				'COALESCE(si.product_name, p.name) AS product_name',
			])
			.orderBy('s.created_at', 'DESC')
			.getRawMany();

		// 🧠 Agrupamos por venta
		const salesMap = new Map<number, any>();

		for (const row of result) {
			if (!salesMap.has(row.sale_id)) {
				const customerName = row.customer_id
					? `${row.customer_first_name || ''} ${row.customer_last_name || ''}`.trim()
					: 'Consumidor Final';

				salesMap.set(row.sale_id, {
					id: row.sale_id,
					total: row.sale_total,
					subtotal: row.sale_subtotal ?? row.sale_total,
					taxTotal: row.sale_tax_total ?? 0,
					status: row.sale_status,
					paymentMethod: row.sale_payment_method || 'cash',
					createdAt: row.sale_created_at,
					customer: {
						id: row.customer_id,
						nationalId: row.customer_national_id ?? null,
						name: customerName || 'Consumidor Final',
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
					vatRate: Number(row.item_vat_rate || 0),
					vatAmount: Number(row.item_vat_amount || 0),
					total: Number(row.item_total),
					productName: row.product_name,
				});
			}
		}

		// Convertimos el Map en array
		const groupedSales = Array.from(salesMap.values());

		return groupedSales;
	}

	async getAllCustomers(companyId: number, storeId: number) {
		const whereClause: any = {};
		if (companyId !== undefined) {
			whereClause.companyId = companyId;
		}
		if (storeId !== undefined) {
			whereClause.storeId = storeId;
		}
		return await this.customerRepository.find({
			where: whereClause,
		});
	}

	// Buscar cliente por cédula exacta dentro de la empresa y tienda
	async searchCustomerByNationalId(
		nationalId: string,
		companyId: number,
		storeId: number,
	): Promise<Customer[]> {
		if (!nationalId || nationalId.trim().length < 6) {
			throw new BadRequestException(
				'La cédula debe tener al menos 6 caracteres para realizar la búsqueda.',
			);
		}

		return this.customerRepository.find({
			where: {
				nationalId: nationalId.trim(),
				companyId,
				storeId,
			},
			take: 5,
		});
	}

	// Crear un nuevo cliente en la empresa y tienda indicadas
	async createCustomer(dto: CreateCustomerDto): Promise<Customer> {
		// Verificar que no exista un cliente con la misma cédula en esta empresa
		const existing = await this.customerRepository.findOne({
			where: {
				nationalId: dto.nationalId.trim(),
				companyId: Number(dto.companyId),
				storeId: Number(dto.storeId),
			},
		});

		if (existing) {
			throw new ConflictException(
				`Ya existe un cliente con la cédula ${dto.nationalId} en esta tienda.`,
			);
		}

		const customer = this.customerRepository.create({
			nationalId: dto.nationalId.trim(),
			companyId: Number(dto.companyId),
			storeId: Number(dto.storeId),
			firstName: dto.firstName?.trim(),
			lastName: dto.lastName?.trim(),
			phone: dto.phone?.trim(),
			email: dto.email?.trim(),
		});

		return this.customerRepository.save(customer);
	}

	async createSale(createSaleDto: CreateSaleDto, userId: string) {
		console.log('createSaleDto:', createSaleDto);
		return processTransaction(this.dataSource, async (queryRunner) => {
			const claimBonus = createSaleDto.claimBonus || false;

			// 0. Si se especificó una campaña, validar que exista, esté activa y vigente
			if (createSaleDto.campaignId) {
				const campaign = await queryRunner.manager.findOne(RewardRule, {
					where: { id: createSaleDto.campaignId },
				});

				if (!campaign) {
					throw new BadRequestException(
						`La campaña con ID ${createSaleDto.campaignId} no existe.`,
					);
				}

				if (!campaign.isActive) {
					throw new BadRequestException(
						`La campaña "${campaign.title}" se encuentra inactiva.`,
					);
				}

				const now = new Date();
				if (campaign.startsAt && now < new Date(campaign.startsAt)) {
					throw new BadRequestException(
						`La campaña "${campaign.title}" aún no ha comenzado.`,
					);
				}

				if (campaign.endsAt && now > new Date(campaign.endsAt)) {
					throw new BadRequestException(
						`La campaña "${campaign.title}" ha finalizado y se encuentra vencida.`,
					);
				}

				if (
					campaign.companyId &&
					Number(campaign.companyId) !== Number(createSaleDto.companyId)
				) {
					throw new BadRequestException(
						`La campaña "${campaign.title}" no pertenece a la empresa de esta venta.`,
					);
				}

				if (
					campaign.storeId &&
					Number(campaign.storeId) !== Number(createSaleDto.storeId)
				) {
					throw new BadRequestException(
						`La campaña "${campaign.title}" no pertenece a la tienda de esta venta.`,
					);
				}
			}

			// 1. Obtener y validar entidades de productos en inventario
			const productEntitiesMap = new Map<number, Product>();
			for (const p of createSaleDto.products) {
				const productEntity = await queryRunner.manager.findOne(Product, {
					where: { id: p.id },
				});

				if (!productEntity) {
					throw new BadRequestException(
						`Producto con ID ${p.id} no encontrado.`,
					);
				}

				if (productEntity.stock < p.quantity) {
					throw new BadRequestException(
						`Stock insuficiente para el producto "${productEntity.name}". Disponible: ${productEntity.stock}, solicitado: ${p.quantity}.`,
					);
				}

				productEntitiesMap.set(p.id, productEntity);
			}

			// 2. Liquidar ítems con snapshot inmutable de precios e IVA histórico
			let computedSubtotal = 0;
			let computedTaxTotal = 0;

			const saleItemsData = createSaleDto.products.map((p) => {
				const prod = productEntitiesMap.get(p.id)!;
				const isExempt = Boolean(prod.taxExempt);
				const vatRate =
					p.vat_rate !== undefined ? Number(p.vat_rate) : isExempt ? 0 : 19;
				const unitPrice = Number(p.unit_price);
				const lineSubtotal = unitPrice * p.quantity;
				const vatAmount =
					p.vat_amount !== undefined
						? Number(p.vat_amount)
						: vatRate > 0
							? Math.round(lineSubtotal * (vatRate / 100) * 100) / 100
							: 0;
				const lineTotal = Number(p.line_total) || lineSubtotal + vatAmount;

				computedSubtotal += lineSubtotal;
				computedTaxTotal += vatAmount;

				return {
					product_id: p.id,
					product_name: prod.name,
					quantity: p.quantity,
					unit_price: unitPrice,
					discount: 0,
					vat_rate: vatRate,
					vat_amount: vatAmount,
					line_total: lineTotal,
				};
			});

			const subtotalFinal =
				createSaleDto.subtotal !== undefined
					? Number(createSaleDto.subtotal)
					: computedSubtotal;
			const taxTotalFinal =
				createSaleDto.tax_total !== undefined
					? Number(createSaleDto.tax_total)
					: computedTaxTotal;
			const discount = createSaleDto.discount_total || 0;
			const bonusUsed = claimBonus ? discount : 0;
			const totalFinal =
				createSaleDto.total !== undefined
					? Number(createSaleDto.total)
					: subtotalFinal + taxTotalFinal - bonusUsed;

			// 3. Crear cabecera inmutable de venta
			const sale = queryRunner.manager.create(Sale, {
				company_id: createSaleDto.companyId,
				store_id: createSaleDto.storeId,
				user_id: userId,
				customer_id: createSaleDto.customerId ?? undefined,
				campaign_id: createSaleDto.campaignId ?? undefined,
				subtotal: subtotalFinal,
				tax_total: taxTotalFinal,
				discount_total: discount,
				total: totalFinal,
				claim_bonus: claimBonus,
				payment_method: createSaleDto.payment_method || 'cash',
				status: 'completed',
				channel: 'in_store',
			});

			const savedSale = await queryRunner.manager.save(Sale, sale);

			// 4. Insertar los ítems con su relación sale_id
			const saleItems = saleItemsData.map((item) => ({
				...item,
				sale_id: savedSale.id,
			}));

			await queryRunner.manager.insert(SaleItem, saleItems);

			// 5. Actualizar stock de productos de forma atómica y registrar movimiento en Kardex
			for (const product of createSaleDto.products) {
				const productEntity = productEntitiesMap.get(product.id)!;
				const previousStock = productEntity.stock;
				const newStock = previousStock - product.quantity;
				productEntity.stock = newStock;
				await queryRunner.manager.save(Product, productEntity);

				const movement = queryRunner.manager.create(StockMovement, {
					productId: productEntity.id,
					companyId: Number(createSaleDto.companyId),
					storeId: Number(createSaleDto.storeId),
					userId: userId || undefined,
					type: 'SALE',
					quantity: -product.quantity,
					previousStock,
					newStock,
					reason: `Venta #${savedSale.id}`,
				});
				await queryRunner.manager.save(StockMovement, movement);
			}

			// Proceso de bonificación
			if (createSaleDto.customerId) {
				// Buscar si ya existe una bonificación para este cliente en esta empresa y tienda
				const existingBonus = await queryRunner.manager.findOne(Bonus, {
					where: {
						customer_id: createSaleDto.customerId,
						company_id: createSaleDto.companyId,
						store_id: createSaleDto.storeId,
					},
				});

				const previousAmount = existingBonus
					? Number(existingBonus.total_amount)
					: 0;
				const amount = claimBonus ? -discount : discount;
				const newAmount = previousAmount + amount;

				if (existingBonus) {
					// Actualizar la bonificación existente sumando el nuevo monto
					existingBonus.total_amount = newAmount;
					existingBonus.updated_at = new Date();
					await queryRunner.manager.save(Bonus, existingBonus);
				} else {
					// Crear una nueva bonificación
					const newBonus = queryRunner.manager.create(Bonus, {
						customer_id: createSaleDto.customerId,
						company_id: createSaleDto.companyId,
						store_id: createSaleDto.storeId,
						total_amount: newAmount,
					});
					await queryRunner.manager.save(Bonus, newBonus);
				}

				// Registrar la transacción de bonificación
				const bonusTransaction = queryRunner.manager.create(
					'bonus_transactions',
					{
						customer_id: createSaleDto.customerId,
						sale_id: savedSale.id,
						company_id: createSaleDto.companyId,
						store_id: createSaleDto.storeId,
						amount,
						previous_amount: previousAmount,
						new_amount: newAmount,
					},
				);
				await queryRunner.manager.save('bonus_transactions', bonusTransaction);
			}

			return {
				message: 'Venta creada exitosamente',
				sale: savedSale,
				items: saleItems,
			};
		});
	}
}
