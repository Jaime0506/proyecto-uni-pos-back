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
import { Store } from '../stores/entities/store.entity';
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
				's.bonus_redeemed AS bonus_redeemed',
				's.bonus_earned AS bonus_earned',
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
					bonusRedeemed: Number(row.bonus_redeemed || 0),
					bonusEarned: Number(row.bonus_earned || 0),
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
		const qb = this.customerRepository
			.createQueryBuilder('c')
			.leftJoin(Bonus, 'b', 'b.customer_id = c.id')
			.select([
				'c.id AS id',
				'c.company_id AS "companyId"',
				'c.store_id AS "storeId"',
				'c.national_id AS "nationalId"',
				'c.first_name AS "firstName"',
				'c.last_name AS "lastName"',
				'c.phone AS phone',
				'c.email AS email',
				'c.status AS status',
				'COALESCE(b.total_amount, 0) AS "bonusBalance"',
			])
			.where('c.deleted_at IS NULL');

		if (companyId !== undefined) {
			qb.andWhere('c.company_id = :companyId', { companyId });
		}
		if (storeId !== undefined) {
			qb.andWhere('(c.store_id = :storeId OR c.store_id IS NULL)', { storeId });
		}

		qb.orderBy('c.first_name', 'ASC');

		const rows = await qb.getRawMany();

		return rows.map((row) => ({
			id: Number(row.id),
			companyId: Number(row.companyId),
			storeId: row.storeId ? Number(row.storeId) : null,
			nationalId: row.nationalId,
			firstName: row.firstName ?? undefined,
			lastName: row.lastName ?? undefined,
			phone: row.phone ?? undefined,
			email: row.email ?? undefined,
			status: row.status,
			bonusBalance: Number(row.bonusBalance || 0),
		}));
	}

	// Buscar cliente por cédula exacta dentro de la empresa y tienda, enriquecido con saldo de bonos
	async searchCustomerByNationalId(
		nationalId: string,
		companyId: number,
		storeId: number,
	): Promise<any[]> {
		if (!nationalId || nationalId.trim().length < 6) {
			throw new BadRequestException(
				'La cédula debe tener al menos 6 caracteres para realizar la búsqueda.',
			);
		}

		const qb = this.customerRepository
			.createQueryBuilder('c')
			.leftJoin(Bonus, 'b', 'b.customer_id = c.id')
			.select([
				'c.id AS id',
				'c.company_id AS "companyId"',
				'c.store_id AS "storeId"',
				'c.national_id AS "nationalId"',
				'c.first_name AS "firstName"',
				'c.last_name AS "lastName"',
				'c.phone AS phone',
				'c.email AS email',
				'c.status AS status',
				'COALESCE(b.total_amount, 0) AS "bonusBalance"',
			])
			.where('c.national_id = :nationalId', { nationalId: nationalId.trim() })
			.andWhere('c.deleted_at IS NULL');

		if (companyId) {
			qb.andWhere('c.company_id = :companyId', { companyId });
		}

		if (storeId) {
			qb.orderBy('CASE WHEN c.store_id = :storeId THEN 1 ELSE 2 END', 'ASC');
			qb.setParameter('storeId', storeId);
		}

		qb.take(5);

		const rows = await qb.getRawMany();

		return rows.map((row) => ({
			id: Number(row.id),
			companyId: Number(row.companyId),
			storeId: row.storeId ? Number(row.storeId) : null,
			nationalId: row.nationalId,
			firstName: row.firstName ?? undefined,
			lastName: row.lastName ?? undefined,
			phone: row.phone ?? undefined,
			email: row.email ?? undefined,
			status: row.status,
			bonusBalance: Number(row.bonusBalance || 0),
		}));
	}

	// Crear un nuevo cliente en la empresa y tienda indicadas
	async createCustomer(dto: CreateCustomerDto): Promise<any> {
		// Verificar que no exista un cliente con la misma cédula en esta empresa
		const existing = await this.customerRepository.findOne({
			where: {
				nationalId: dto.nationalId.trim(),
				companyId: Number(dto.companyId),
			},
		});

		if (existing) {
			throw new ConflictException(
				`Ya existe un cliente con la cédula ${dto.nationalId} en esta empresa.`,
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

		const saved = await this.customerRepository.save(customer);
		return {
			...saved,
			bonusBalance: 0,
		};
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

			// 0.1 Obtener la tienda para determinar la tasa de IVA configurada
			let storeIvaPercentage = 19;
			if (createSaleDto.storeId) {
				const store = await queryRunner.manager.findOne(Store, {
					where: { id: createSaleDto.storeId },
				});
				if (
					store &&
					store.ivaPercentage !== undefined &&
					store.ivaPercentage !== null
				) {
					storeIvaPercentage = Number(store.ivaPercentage);
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
					p.vat_rate !== undefined
						? Number(p.vat_rate)
						: isExempt
							? 0
							: storeIvaPercentage;
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

			// 3. Validación y bloqueo de Redención de Bonos
			const requestedRedeem = Math.max(
				0,
				createSaleDto.redeemBonusAmount !== undefined
					? Number(createSaleDto.redeemBonusAmount)
					: createSaleDto.claimBonus
						? Number(createSaleDto.discount_total || 0)
						: 0,
			);

			let effectiveBonusRedeemed = 0;
			let bonusWalletRecord: Bonus | null = null;
			let previousBonusBalance = 0;

			if (createSaleDto.customerId) {
				// Bloqueo pesimista para garantizar consistencia y prevenir saldos negativos
				bonusWalletRecord = await queryRunner.manager.findOne(Bonus, {
					where: {
						customer_id: createSaleDto.customerId,
					},
					lock: { mode: 'pessimistic_write' },
				});

				previousBonusBalance = bonusWalletRecord
					? Number(bonusWalletRecord.total_amount)
					: 0;

				if (requestedRedeem > 0) {
					if (previousBonusBalance < requestedRedeem) {
						throw new BadRequestException(
							`Saldo de bonificaciones insuficiente. Saldo disponible: $${previousBonusBalance.toLocaleString('es-CO')}, solicitado a redimir: $${requestedRedeem.toLocaleString('es-CO')}.`,
						);
					}
					effectiveBonusRedeemed = requestedRedeem;
				}
			}

			// Descuento promocional de campaña (si la redención no fue enviada por el modo legacy)
			const promoDiscount =
				createSaleDto.redeemBonusAmount !== undefined
					? Number(createSaleDto.discount_total || 0)
					: createSaleDto.claimBonus
						? 0
						: Number(createSaleDto.discount_total || 0);

			const payableBeforeBonus = Math.max(
				0,
				subtotalFinal + taxTotalFinal - promoDiscount,
			);

			if (effectiveBonusRedeemed > payableBeforeBonus) {
				throw new BadRequestException(
					`El monto a redimir ($${effectiveBonusRedeemed.toLocaleString('es-CO')}) no puede exceder el total a pagar de la compra ($${payableBeforeBonus.toLocaleString('es-CO')}).`,
				);
			}

			const calculatedTotalFinal = Math.max(
				0,
				payableBeforeBonus - effectiveBonusRedeemed,
			);

			const totalFinal =
				createSaleDto.total !== undefined &&
				Number(createSaleDto.total) <= calculatedTotalFinal
					? Number(createSaleDto.total)
					: calculatedTotalFinal;

			// 4. Cálculo de Bonos Ganados
			let bonusEarned = 0;
			let ruleDetails: string[] = [];

			// REGLAS ESTRICTAS DE NEGOCIO:
			// A. Si se redimen bonos en esta venta (effectiveBonusRedeemed > 0), NO se permite acumular nuevos bonos en la misma transacción.
			// B. Solo se calculan y acumulan bonos si el cajero seleccionó explícitamente una campaña activa (createSaleDto.campaignId).
			// C. Debe existir un cliente registrado para acumular bonos.
			if (
				createSaleDto.campaignId &&
				effectiveBonusRedeemed === 0 &&
				createSaleDto.customerId
			) {
				const productsForBonus = createSaleDto.products.map((p) => {
					const prod = productEntitiesMap.get(p.id)!;
					const unitPrice = Number(p.unit_price);
					return {
						product: prod,
						quantity: p.quantity,
						unitPrice,
						lineSubtotal: unitPrice * p.quantity,
					};
				});

				const result = await this.calculateEarnedBonuses(
					queryRunner,
					Number(createSaleDto.companyId),
					Number(createSaleDto.storeId),
					Number(createSaleDto.campaignId),
					productsForBonus,
				);
				bonusEarned = result.bonusEarned;
				ruleDetails = result.ruleDetails;
			}

			// 5. Crear cabecera inmutable de venta
			const sale = queryRunner.manager.create(Sale, {
				company_id: createSaleDto.companyId,
				store_id: createSaleDto.storeId,
				user_id: userId,
				customer_id: createSaleDto.customerId ?? undefined,
				campaign_id:
					effectiveBonusRedeemed > 0
						? undefined
						: (createSaleDto.campaignId ?? undefined),
				subtotal: subtotalFinal,
				tax_total: taxTotalFinal,
				discount_total: promoDiscount,
				bonus_redeemed: effectiveBonusRedeemed,
				bonus_earned: bonusEarned,
				total: totalFinal,
				claim_bonus: effectiveBonusRedeemed > 0,
				payment_method: createSaleDto.payment_method || 'cash',
				status: 'completed',
				channel: 'in_store',
			});

			const savedSale = await queryRunner.manager.save(Sale, sale);

			// 6. Insertar los ítems con su relación sale_id
			const saleItems = saleItemsData.map((item) => ({
				...item,
				sale_id: savedSale.id,
			}));

			await queryRunner.manager.insert(SaleItem, saleItems);

			// 7. Actualizar stock de productos de forma atómica y registrar movimiento en Kardex
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

			// 8. Proceso Atómico de Bonificaciones (Redención y/o Acumulación)
			if (createSaleDto.customerId) {
				let currentBalance = previousBonusBalance;

				// A. Registrar Redención si ocurrió
				if (effectiveBonusRedeemed > 0) {
					currentBalance -= effectiveBonusRedeemed;

					bonusWalletRecord!.total_amount = currentBalance;
					bonusWalletRecord!.updated_at = new Date();
					await queryRunner.manager.save(Bonus, bonusWalletRecord!);

					const redeemTransaction = queryRunner.manager.create(
						'bonus_transactions',
						{
							customer_id: createSaleDto.customerId,
							sale_id: savedSale.id,
							company_id: createSaleDto.companyId,
							store_id: createSaleDto.storeId,
							type: 'REDEEM',
							amount: -effectiveBonusRedeemed,
							previous_amount: previousBonusBalance,
							new_amount: currentBalance,
							notes: `Redención de bonos aplicada en Venta #${savedSale.id}`,
						},
					);
					await queryRunner.manager.save(
						'bonus_transactions',
						redeemTransaction,
					);
				}

				// B. Registrar Ganancia si acumuló bonos
				if (bonusEarned > 0) {
					const balanceBeforeEarn = currentBalance;
					currentBalance += bonusEarned;

					if (bonusWalletRecord) {
						bonusWalletRecord.total_amount = currentBalance;
						bonusWalletRecord.updated_at = new Date();
						if (!bonusWalletRecord.company_id) {
							bonusWalletRecord.company_id = createSaleDto.companyId;
						}
						if (!bonusWalletRecord.store_id) {
							bonusWalletRecord.store_id = createSaleDto.storeId;
						}
						await queryRunner.manager.save(Bonus, bonusWalletRecord);
					} else {
						bonusWalletRecord = queryRunner.manager.create(Bonus, {
							customer_id: createSaleDto.customerId,
							company_id: createSaleDto.companyId,
							store_id: createSaleDto.storeId,
							total_amount: currentBalance,
						});
						await queryRunner.manager.save(Bonus, bonusWalletRecord);
					}

					const earnTransaction = queryRunner.manager.create(
						'bonus_transactions',
						{
							customer_id: createSaleDto.customerId,
							sale_id: savedSale.id,
							company_id: createSaleDto.companyId,
							store_id: createSaleDto.storeId,
							type: 'EARN',
							amount: bonusEarned,
							previous_amount: balanceBeforeEarn,
							new_amount: currentBalance,
							notes: `Bonificación acumulada en Venta #${savedSale.id}${ruleDetails.length > 0 ? ': ' + ruleDetails.join('; ') : ''}`,
						},
					);
					await queryRunner.manager.save('bonus_transactions', earnTransaction);
				}
			}

			return {
				message: 'Venta creada exitosamente',
				sale: savedSale,
				items: saleItems,
				bonusRedeemed: effectiveBonusRedeemed,
				bonusEarned,
			};
		});
	}

	/**
	 * Motor de cálculo de bonos ganados según la campaña activa seleccionada
	 */
	private async calculateEarnedBonuses(
		queryRunner: any,
		companyId: number,
		storeId: number,
		campaignId: number,
		productsData: {
			product: Product;
			quantity: number;
			unitPrice: number;
			lineSubtotal: number;
		}[],
	): Promise<{ bonusEarned: number; ruleDetails: string[] }> {
		const now = new Date();

		const activeRules = await queryRunner.manager
			.createQueryBuilder(RewardRule, 'rule')
			.leftJoinAndSelect('rule.products', 'rp')
			.leftJoinAndSelect('rule.categories', 'rc')
			.where('rule.id = :campaignId', { campaignId })
			.andWhere('rule.isActive = true')
			.andWhere('rule.companyId = :companyId', { companyId })
			.andWhere('(rule.storeId IS NULL OR rule.storeId = :storeId)', {
				storeId,
			})
			.andWhere('(rule.startsAt IS NULL OR rule.startsAt <= :now)', { now })
			.andWhere('(rule.endsAt IS NULL OR rule.endsAt >= :now)', { now })
			.getMany();

		if (!activeRules || activeRules.length === 0) {
			return { bonusEarned: 0, ruleDetails: [] };
		}

		let totalBonusEarned = 0;
		const ruleDetails: string[] = [];

		for (const item of productsData) {
			let itemBonus = 0;

			for (const rule of activeRules) {
				// A. Regla por producto individual
				const productRule = rule.products?.find(
					(rp: any) => Number(rp.productId) === Number(item.product.id),
				);
				if (productRule && item.quantity >= (productRule.minQty || 1)) {
					const effectiveQty = productRule.maxQty
						? Math.min(item.quantity, productRule.maxQty)
						: item.quantity;
					let earned = 0;
					if (
						productRule.discountPercentage != null &&
						Number(productRule.discountPercentage) > 0
					) {
						earned =
							(Number(item.unitPrice) *
								effectiveQty *
								Number(productRule.discountPercentage)) /
							100;
					} else if (productRule.discountValue != null) {
						earned = Number(productRule.discountValue) * effectiveQty;
					}
					itemBonus += earned;
					ruleDetails.push(
						`Regla "${rule.title}": $${earned.toFixed(2)} (${effectiveQty} un. de ${item.product.name})`,
					);
				}

				// B. Regla por categoría
				if (item.product.categoryId) {
					const categoryRule = rule.categories?.find(
						(rc: any) =>
							Number(rc.categoryId) === Number(item.product.categoryId),
					);
					if (categoryRule && item.quantity >= (categoryRule.minQty || 1)) {
						const effectiveQty = categoryRule.maxQty
							? Math.min(item.quantity, categoryRule.maxQty)
							: item.quantity;
						let catEarned = 0;
						if (
							categoryRule.discountPercentage != null &&
							Number(categoryRule.discountPercentage) > 0
						) {
							catEarned =
								(Number(item.unitPrice) *
									effectiveQty *
									Number(categoryRule.discountPercentage)) /
								100;
						} else if (categoryRule.discountValue != null) {
							catEarned = Number(categoryRule.discountValue) * effectiveQty;
						}
						itemBonus += catEarned;
						ruleDetails.push(
							`Regla "${rule.title}" (Categoría): $${catEarned.toFixed(2)} (${effectiveQty} un. de ${item.product.name})`,
						);
					}
				}
			}

			totalBonusEarned += itemBonus;
		}

		return {
			bonusEarned: Math.round(totalBonusEarned * 100) / 100,
			ruleDetails,
		};
	}
}
