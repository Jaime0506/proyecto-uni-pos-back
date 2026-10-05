import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { SaleReturn } from './entities/sale-return.entity';
import { SaleReturnItem } from './entities/sale-return-item.entity';
import { ReturnPolicy } from './entities/return-policy.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-items.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../products/entities/stock-movement.entity';
import { Bonus } from '../sales/entities/bonuses.entity';
import { AuditService } from '../audit/audit.service';
import { processTransaction } from '../../database/transactions';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ApproveReturnDto, RejectReturnDto } from './dto/review-return.dto';
import { GetAllReturnsDto } from './dto/get-all-returns.dto';

@Injectable()
export class ReturnsService {
	constructor(
		private readonly dataSource: DataSource,

		@InjectRepository(SaleReturn)
		private readonly returnRepository: Repository<SaleReturn>,

		@InjectRepository(SaleReturnItem)
		private readonly returnItemRepository: Repository<SaleReturnItem>,

		@InjectRepository(ReturnPolicy)
		private readonly policyRepository: Repository<ReturnPolicy>,

		@InjectRepository(Sale)
		private readonly saleRepository: Repository<Sale>,

		@InjectRepository(SaleItem)
		private readonly saleItemRepository: Repository<SaleItem>,

		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,

		private readonly auditService: AuditService,
	) {}

	// 1. Obtener la política aplicable para una tienda/empresa (7 días por defecto)
	async getApplicablePolicy(
		companyId: number,
		storeId: number,
	): Promise<ReturnPolicy | null> {
		// Primero buscar política específica de la tienda
		let policy = await this.policyRepository.findOne({
			where: { companyId, storeId, isActive: true },
		});

		// Si no hay específica de tienda, buscar la global de la empresa
		if (!policy) {
			policy = await this.policyRepository.findOne({
				where: { companyId, storeId: undefined, isActive: true },
			});
		}

		return policy;
	}

	// 2. Comprobar elegibilidad de una venta y calcular saldos disponibles por producto
	async checkEligibility(saleId: number, companyId?: number, storeId?: number) {
		const sale = await this.saleRepository.findOne({
			where: { id: saleId },
		});

		if (!sale) {
			throw new NotFoundException(`La venta #${saleId} no fue encontrada.`);
		}

		if (companyId && Number(sale.company_id) !== Number(companyId)) {
			throw new BadRequestException('La venta no pertenece a esta empresa.');
		}

		if (storeId && Number(sale.store_id) !== Number(storeId)) {
			throw new BadRequestException('La venta no pertenece a esta tienda.');
		}

		const policy = await this.getApplicablePolicy(sale.company_id, sale.store_id);
		const maxDaysAllowed = policy?.maxDaysAllowed ?? 7;

		const saleDate = new Date(sale.created_at);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - saleDate.getTime());
		const daysSinceSale = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		const isWithinDeadline = daysSinceSale <= maxDaysAllowed;

		// Obtener todos los ítems originales de la venta
		const saleItems = await this.saleItemRepository.find({
			where: { sale_id: saleId },
		});

		// Obtener todas las devoluciones activas (no rechazadas ni canceladas)
		const existingReturns = await this.returnRepository.find({
			where: {
				saleId,
				status: Not(In(['REJECTED', 'CANCELLED'])),
			},
			relations: ['items'],
		});

		// Mapear cantidades ya devueltas por sale_item_id
		const returnedQuantitiesMap = new Map<number, number>();
		for (const ret of existingReturns) {
			for (const item of ret.items || []) {
				const current = returnedQuantitiesMap.get(item.saleItemId) || 0;
				returnedQuantitiesMap.set(item.saleItemId, current + item.quantity);
			}
		}

		// Construir ítems con saldo disponible
		let hasAvailableItems = false;
		const itemsStatus = saleItems.map((si) => {
			const alreadyReturned = returnedQuantitiesMap.get(si.id) || 0;
			const availableQuantity = Math.max(0, si.quantity - alreadyReturned);

			if (availableQuantity > 0) {
				hasAvailableItems = true;
			}

			return {
				saleItemId: si.id,
				productId: si.product_id,
				productName: si.product_name,
				quantityPurchased: si.quantity,
				quantityAlreadyReturned: alreadyReturned,
				availableQuantityToReturn: availableQuantity,
				canReturn: isWithinDeadline && availableQuantity > 0,
				unitPrice: Number(si.unit_price),
				vatRate: Number(si.vat_rate || 0),
				vatAmount: Number(si.vat_amount || 0),
				discount: Number(si.discount || 0),
				lineTotal: Number(si.line_total),
			};
		});

		return {
			saleId: sale.id,
			saleDate: sale.created_at,
			daysSinceSale,
			maxDaysAllowed,
			isWithinDeadline,
			isEligible: isWithinDeadline && hasAvailableItems,
			policyName: policy?.name || 'Política Estándar (7 días)',
			allowedRefundMethods: policy?.allowedRefundMethods
				? policy.allowedRefundMethods.split(',')
				: ['CASH', 'BONUS'],
			items: itemsStatus,
		};
	}

	// 3. Crear solicitud de devolución (selección granular producto por producto)
	async createReturn(
		dto: CreateReturnRequestDto,
		userId: string,
		channel = 'IN_STORE',
	) {
		const eligibility = await this.checkEligibility(
			dto.saleId,
			dto.companyId,
			dto.storeId,
		);

		if (!eligibility.isWithinDeadline) {
			throw new BadRequestException(
				`La venta superó el plazo máximo permitido de ${eligibility.maxDaysAllowed} días para devoluciones (han transcurrido ${eligibility.daysSinceSale} días).`,
			);
		}

		if (!dto.items || dto.items.length === 0) {
			throw new BadRequestException(
				'Debe seleccionar al menos un producto para la devolución.',
			);
		}

		// Validar cada ítem seleccionado contra el saldo disponible
		const eligibilityItemsMap = new Map(
			eligibility.items.map((i) => [i.saleItemId, i]),
		);

		let calculatedSubtotal = 0;
		let calculatedTax = 0;
		let calculatedTotal = 0;

		const returnItemsData: Partial<SaleReturnItem>[] = [];

		for (const reqItem of dto.items) {
			const eligItem = eligibilityItemsMap.get(reqItem.saleItemId);

			if (!eligItem) {
				throw new BadRequestException(
					`El ítem con ID ${reqItem.saleItemId} no pertenece a esta venta.`,
				);
			}

			if (reqItem.quantity <= 0) {
				throw new BadRequestException(
					`La cantidad a devolver de "${eligItem.productName}" debe ser mayor a cero.`,
				);
			}

			if (reqItem.quantity > eligItem.availableQuantityToReturn) {
				throw new BadRequestException(
					`La cantidad solicitada para "${eligItem.productName}" (${reqItem.quantity}) supera el saldo disponible (${eligItem.availableQuantityToReturn}).`,
				);
			}

			const lineSubtotal = eligItem.unitPrice * reqItem.quantity;
			const lineTax =
				eligItem.vatRate > 0
					? Math.round(lineSubtotal * (eligItem.vatRate / 100) * 100) / 100
					: 0;
			const lineTotal = lineSubtotal + lineTax;

			calculatedSubtotal += lineSubtotal;
			calculatedTax += lineTax;
			calculatedTotal += lineTotal;

			returnItemsData.push({
				saleItemId: reqItem.saleItemId,
				productId: reqItem.productId,
				productName: eligItem.productName || 'Producto',
				quantity: reqItem.quantity,
				unitPrice: eligItem.unitPrice,
				taxRate: eligItem.vatRate,
				taxAmount: lineTax,
				lineSubtotal,
				lineTotalRefund: lineTotal,
				itemCondition: reqItem.itemCondition || 'SEALED_NEW',
				itemReason: reqItem.itemReason || null,
				restockApproved: reqItem.restockApproved ?? true,
			});
		}

		// Generar número consecutivo único DEV-XXXXXX
		const countTotal = await this.returnRepository.count();
		const returnNumber = `DEV-${String(countTotal + 1).padStart(6, '0')}`;

		const sale = await this.saleRepository.findOne({
			where: { id: dto.saleId },
		});

		const newReturn = this.returnRepository.create({
			returnNumber,
			saleId: dto.saleId,
			companyId: dto.companyId,
			storeId: dto.storeId,
			customerId: sale?.customer_id ?? null,
			status: 'PENDING_REVIEW',
			channel,
			requestedByUserId: userId || null,
			reasonCategory: dto.reasonCategory,
			customerNotes: dto.customerNotes || null,
			subtotalRefund: calculatedSubtotal,
			taxRefund: calculatedTax,
			totalRefund: calculatedTotal,
			refundMethod: dto.preferredRefundMethod || 'CASH',
			refundStatus: 'PENDING',
			items: returnItemsData as SaleReturnItem[],
		});

		const savedReturn = await this.returnRepository.save(newReturn);

		// Registrar en auditoría
		await this.auditService.logAction({
			userId,
			companyId: dto.companyId,
			storeId: dto.storeId,
			module: 'returns',
			action: 'CREATE_RETURN_REQUEST',
			entityName: 'SaleReturn',
			entityId: String(savedReturn.id),
			description: `Solicitud de devolución #${returnNumber} creada para la venta #${dto.saleId} por un total de $${calculatedTotal}`,
			details: {
				returnNumber,
				saleId: dto.saleId,
				refundMethod: dto.preferredRefundMethod,
				totalRefund: calculatedTotal,
				itemsCount: dto.items.length,
			},
		});

		return savedReturn;
	}

	// 4. Listar todas las devoluciones con filtros
	async getAllReturns(dto: GetAllReturnsDto) {
		const { companyId, storeId, status, startDate, endDate, search, customerId } =
			dto;

		const qb = this.returnRepository
			.createQueryBuilder('sr')
			.leftJoinAndSelect('sr.items', 'sri')
			.leftJoinAndSelect('sr.sale', 's')
			.leftJoinAndSelect('sr.customer', 'c')
			.leftJoinAndSelect('sr.store', 'st')
			.where('sr.company_id = :companyId', { companyId });

		if (storeId) {
			qb.andWhere('sr.store_id = :storeId', { storeId });
		}

		if (status) {
			qb.andWhere('sr.status = :status', { status });
		}

		if (customerId) {
			qb.andWhere('sr.customer_id = :customerId', { customerId });
		}

		if (startDate) {
			const start = new Date(startDate);
			start.setHours(0, 0, 0, 0);
			qb.andWhere('sr.created_at >= :startDate', { startDate: start });
		}

		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			qb.andWhere('sr.created_at <= :endDate', { endDate: end });
		}

		if (search && search.trim()) {
			const term = `%${search.trim()}%`;
			qb.andWhere(
				'(sr.return_number ILIKE :term OR CAST(sr.sale_id AS TEXT) ILIKE :term OR c.national_id ILIKE :term OR c.first_name ILIKE :term OR c.last_name ILIKE :term)',
				{ term },
			);
		}

		qb.orderBy('sr.created_at', 'DESC');

		return await qb.getMany();
	}

	// 5. Obtener detalle de una devolución por ID
	async getReturnById(id: number): Promise<SaleReturn> {
		const saleReturn = await this.returnRepository.findOne({
			where: { id },
			relations: ['items', 'sale', 'customer', 'store', 'company'],
		});

		if (!saleReturn) {
			throw new NotFoundException(`La devolución #${id} no fue encontrada.`);
		}

		return saleReturn;
	}

	// 6. Aprobar solicitud de devolución (transacción atómica con Kardex e impacto financiero)
	async approveReturn(
		returnId: number,
		reviewerUserId: string,
		dto: ApproveReturnDto,
	) {
		return processTransaction(this.dataSource, async (queryRunner) => {
			const returnRecord = await queryRunner.manager.findOne(SaleReturn, {
				where: { id: returnId },
				lock: { mode: 'pessimistic_write' },
			});

			if (!returnRecord) {
				throw new NotFoundException(
					`La devolución #${returnId} no fue encontrada.`,
				);
			}

			returnRecord.items = await queryRunner.manager.find(SaleReturnItem, {
				where: { saleReturnId: returnId },
			});

			if (returnRecord.status !== 'PENDING_REVIEW') {
				throw new BadRequestException(
					`La devolución ya se encuentra en estado "${returnRecord.status}" y no puede ser aprobada nuevamente.`,
				);
			}

			const refundMethod = dto.refundMethod || returnRecord.refundMethod || 'CASH';

			// Afectar inventario únicamente para ítems donde restockApproved sea true
			for (const item of returnRecord.items) {
				if (item.restockApproved) {
					const product = await queryRunner.manager.findOne(Product, {
						where: { id: item.productId },
						lock: { mode: 'pessimistic_write' },
					});

					if (product) {
						const previousStock = product.stock;
						const newStock = previousStock + item.quantity;
						product.stock = newStock;
						await queryRunner.manager.save(Product, product);

						const movement = queryRunner.manager.create(StockMovement, {
							productId: product.id,
							companyId: returnRecord.companyId,
							storeId: returnRecord.storeId,
							userId: reviewerUserId || undefined,
							type: 'RETURN',
							quantity: item.quantity,
							previousStock,
							newStock,
							reason: `Devolución #${returnRecord.returnNumber}`,
						});
						await queryRunner.manager.save(StockMovement, movement);
					}
				}
			}

			// Liquidación de Reembolso: CASH o BONUS
			if (refundMethod === 'BONUS') {
				if (!returnRecord.customerId) {
					throw new BadRequestException(
						'No se puede reembolsar como bono porque la venta original no tiene un cliente registrado.',
					);
				}

				const existingBonus = await queryRunner.manager.findOne(Bonus, {
					where: {
						customer_id: returnRecord.customerId,
						company_id: returnRecord.companyId,
						store_id: returnRecord.storeId,
					},
					lock: { mode: 'pessimistic_write' },
				});

				const previousAmount = existingBonus ? Number(existingBonus.total_amount) : 0;
				const refundTotal = Number(returnRecord.totalRefund);
				const newAmount = previousAmount + refundTotal;

				if (existingBonus) {
					existingBonus.total_amount = newAmount;
					existingBonus.updated_at = new Date();
					await queryRunner.manager.save(Bonus, existingBonus);
				} else {
					const newBonus = queryRunner.manager.create(Bonus, {
						customer_id: returnRecord.customerId,
						company_id: returnRecord.companyId,
						store_id: returnRecord.storeId,
						total_amount: newAmount,
					});
					await queryRunner.manager.save(Bonus, newBonus);
				}

				const bonusTransaction = queryRunner.manager.create(
					'bonus_transactions',
					{
						customer_id: returnRecord.customerId,
						sale_id: returnRecord.saleId,
						company_id: returnRecord.companyId,
						store_id: returnRecord.storeId,
						amount: refundTotal,
						previous_amount: previousAmount,
						new_amount: newAmount,
					},
				);
				await queryRunner.manager.save('bonus_transactions', bonusTransaction);

				returnRecord.refundStatus = 'PROCESSED';
				returnRecord.refundReference = 'Acreditado a Bonos de Cliente';
			} else {
				// Reembolso en Efectivo (CASH)
				returnRecord.refundStatus = 'PROCESSED';
				returnRecord.refundReference = 'Reembolso en Efectivo (Caja POS)';
			}

			// Actualizar estado general de la devolución
			returnRecord.status = 'APPROVED';
			returnRecord.refundMethod = refundMethod;
			returnRecord.reviewedByUserId = reviewerUserId;
			returnRecord.reviewedAt = new Date();
			returnRecord.reviewNotes = dto.approvalNotes || null;

			const saved = await queryRunner.manager.save(SaleReturn, returnRecord);

			// Auditoría
			await this.auditService.logAction({
				userId: reviewerUserId,
				companyId: returnRecord.companyId,
				storeId: returnRecord.storeId,
				module: 'returns',
				action: 'APPROVE_RETURN',
				entityName: 'SaleReturn',
				entityId: String(returnRecord.id),
				description: `Devolución #${returnRecord.returnNumber} aprobada por supervisor. Método de reembolso: ${refundMethod}.`,
				details: {
					returnNumber: returnRecord.returnNumber,
					totalRefund: returnRecord.totalRefund,
					refundMethod,
				},
			});

			return {
				message: 'Devolución aprobada exitosamente.',
				return: saved,
			};
		});
	}

	// 7. Rechazar solicitud de devolución con justificación formal
	async rejectReturn(
		returnId: number,
		reviewerUserId: string,
		dto: RejectReturnDto,
	) {
		const returnRecord = await this.returnRepository.findOne({
			where: { id: returnId },
		});

		if (!returnRecord) {
			throw new NotFoundException(
				`La devolución #${returnId} no fue encontrada.`,
			);
		}

		if (returnRecord.status !== 'PENDING_REVIEW') {
			throw new BadRequestException(
				`La devolución ya se encuentra en estado "${returnRecord.status}" y no puede ser rechazada.`,
			);
		}

		returnRecord.status = 'REJECTED';
		returnRecord.reviewedByUserId = reviewerUserId;
		returnRecord.reviewedAt = new Date();
		returnRecord.rejectionReason = dto.rejectionReason;
		returnRecord.reviewNotes = dto.reviewNotes || null;

		const saved = await this.returnRepository.save(returnRecord);

		await this.auditService.logAction({
			userId: reviewerUserId,
			companyId: returnRecord.companyId,
			storeId: returnRecord.storeId,
			module: 'returns',
			action: 'REJECT_RETURN',
			entityName: 'SaleReturn',
			entityId: String(returnRecord.id),
			description: `Devolución #${returnRecord.returnNumber} rechazada. Motivo: ${dto.rejectionReason}`,
			details: {
				returnNumber: returnRecord.returnNumber,
				rejectionReason: dto.rejectionReason,
			},
		});

		return {
			message: 'Devolución rechazada correctamente.',
			return: saved,
		};
	}

	// 8. Obtener datos estructurados para comprobante digital PDF
	async getReceiptData(id: number) {
		const ret = await this.getReturnById(id);

		return {
			returnId: ret.id,
			returnNumber: ret.returnNumber,
			date: ret.createdAt,
			reviewedAt: ret.reviewedAt,
			status: ret.status,
			companyName: ret.company?.name || 'Empresa',
			companyNit: ret.company?.nit || '',
			storeName: ret.store?.name || 'Tienda',
			storeAddress: ret.store?.address || null,
			saleId: ret.saleId,
			customerName: ret.customer
				? `${ret.customer.firstName || ''} ${ret.customer.lastName || ''}`.trim()
				: 'Consumidor Final',
			customerNationalId: ret.customer?.nationalId || null,
			customerEmail: ret.customer?.email || null,
			customerPhone: ret.customer?.phone || null,
			reasonCategory: ret.reasonCategory,
			customerNotes: ret.customerNotes,
			rejectionReason: ret.rejectionReason,
			subtotal: Number(ret.subtotalRefund),
			tax: Number(ret.taxRefund),
			total: Number(ret.totalRefund),
			refundMethod: ret.refundMethod,
			refundStatus: ret.refundStatus,
			refundReference: ret.refundReference,
			items: ret.items.map((item) => ({
				productName: item.productName,
				quantity: item.quantity,
				unitPrice: Number(item.unitPrice),
				taxRate: Number(item.taxRate),
				taxAmount: Number(item.taxAmount),
				total: Number(item.lineTotalRefund),
				itemCondition: item.itemCondition,
				restockApproved: item.restockApproved,
			})),
		};
	}
}
