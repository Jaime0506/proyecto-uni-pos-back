import {
	Injectable,
	NotFoundException,
	BadRequestException,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
	PurchaseOrder,
	PurchaseOrderStatus,
} from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { SupplierReception } from './entities/supplier-reception.entity';
import { SupplierReceptionItem } from './entities/supplier-reception-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Store } from '../stores/entities/store.entity';
import { Company } from '../companies/entities/company.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../products/entities/stock-movement.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { GetPurchaseOrdersDto } from './dto/get-purchase-orders.dto';
import { CreateSupplierReceptionDto } from './dto/create-supplier-reception.dto';
import { GetReceptionsDto } from './dto/get-receptions.dto';

@Injectable()
export class PurchasesService {
	constructor(
		@InjectRepository(PurchaseOrder)
		private readonly purchaseOrderRepo: Repository<PurchaseOrder>,
		@InjectRepository(PurchaseOrderItem)
		private readonly purchaseOrderItemRepo: Repository<PurchaseOrderItem>,
		@InjectRepository(SupplierReception)
		private readonly supplierReceptionRepo: Repository<SupplierReception>,
		@InjectRepository(SupplierReceptionItem)
		private readonly supplierReceptionItemRepo: Repository<SupplierReceptionItem>,
		@InjectRepository(Supplier)
		private readonly supplierRepo: Repository<Supplier>,
		@InjectRepository(Store)
		private readonly storeRepo: Repository<Store>,
		@InjectRepository(Company)
		private readonly companyRepo: Repository<Company>,
		@InjectRepository(Product)
		private readonly productRepo: Repository<Product>,
		private readonly dataSource: DataSource,
	) {}

	// 1. CREAR PEDIDO DE COMPRA
	async createPurchaseOrder(dto: CreatePurchaseOrderDto, userId?: string) {
		const {
			companyId,
			storeId,
			supplierId,
			expectedDeliveryDate,
			notes,
			items,
		} = dto;

		if (!items || items.length === 0) {
			throw new BadRequestException(
				'El pedido debe incluir al menos un producto',
			);
		}

		// Validar entidades base
		const [company, store, supplier] = await Promise.all([
			this.companyRepo.findOne({
				where: { id: companyId },
				withDeleted: false,
			}),
			this.storeRepo.findOne({ where: { id: storeId }, withDeleted: false }),
			this.supplierRepo.findOne({
				where: { id: supplierId },
				withDeleted: false,
			}),
		]);

		if (!company) {
			throw new BadRequestException(`La empresa con ID ${companyId} no existe`);
		}
		if (!store) {
			throw new BadRequestException(`La sucursal con ID ${storeId} no existe`);
		}
		if (!supplier) {
			throw new BadRequestException(
				`El proveedor con ID ${supplierId} no existe`,
			);
		}

		// Validar productos y calcular totales
		const productIds = items.map((i) => i.productId);
		const products = await this.productRepo.find({
			where: productIds.map((id) => ({ id, company: { id: companyId } })),
		});
		const productMap = new Map(products.map((p) => [p.id, p]));

		let subtotal = 0;
		let taxTotal = 0;
		let total = 0;

		const orderItemsToCreate: Partial<PurchaseOrderItem>[] = [];

		for (const itemDto of items) {
			const product = productMap.get(itemDto.productId);
			if (!product) {
				throw new BadRequestException(
					`El producto con ID ${itemDto.productId} no existe o no pertenece a la compañía`,
				);
			}

			const lineSubtotal =
				Number(itemDto.unitCost) * Number(itemDto.quantityOrdered);
			const defaultTaxRate = product.taxExempt
				? 0
				: Number(store.ivaPercentage ?? 19);
			const taxRate =
				itemDto.taxRate !== undefined && itemDto.taxRate !== null
					? Number(itemDto.taxRate)
					: defaultTaxRate;
			const lineTax = (lineSubtotal * taxRate) / 100;
			const lineTotal = lineSubtotal + lineTax;

			subtotal += lineSubtotal;
			taxTotal += lineTax;
			total += lineTotal;

			orderItemsToCreate.push({
				productId: product.id,
				productName: product.name,
				quantityOrdered: itemDto.quantityOrdered,
				quantityReceived: 0,
				unitCost: itemDto.unitCost,
				taxRate,
				taxAmount: lineTax,
				lineTotal,
			});
		}

		// Generar número consecutivo OC-YYYY-XXXX
		const year = new Date().getFullYear();
		const countToday = await this.purchaseOrderRepo.count({
			where: { companyId },
		});
		const orderNumber = `OC-${year}-${String(countToday + 1).padStart(4, '0')}`;

		const savedOrder = await this.dataSource.transaction(async (manager) => {
			const order = manager.create(PurchaseOrder, {
				companyId,
				storeId,
				supplierId,
				orderNumber,
				status: PurchaseOrderStatus.ORDERED,
				subtotal,
				taxTotal,
				total,
				notes,
				userId,
				expectedDeliveryDate: expectedDeliveryDate
					? new Date(expectedDeliveryDate)
					: undefined,
			});

			const persistedOrder = await manager.save(PurchaseOrder, order);

			const itemsToInsert = orderItemsToCreate.map((item) =>
				manager.create(PurchaseOrderItem, {
					...item,
					purchaseOrderId: persistedOrder.id,
				}),
			);

			await manager.save(PurchaseOrderItem, itemsToInsert);
			persistedOrder.items = itemsToInsert;

			return persistedOrder;
		});

		return {
			ok: true,
			message: `Pedido de compra ${orderNumber} creado exitosamente`,
			data: { result: savedOrder },
		};
	}

	// 2. LISTAR PEDIDOS DE COMPRA
	async getPurchaseOrders(dto: GetPurchaseOrdersDto) {
		const {
			companyId,
			storeId,
			supplierId,
			status,
			startDate,
			endDate,
			page = 1,
			limit = 10,
		} = dto;

		const query = this.purchaseOrderRepo
			.createQueryBuilder('order')
			.leftJoinAndSelect('order.supplier', 'supplier')
			.leftJoinAndSelect('order.store', 'store')
			.leftJoinAndSelect('order.items', 'items')
			.leftJoinAndSelect('items.product', 'product');

		if (companyId) {
			query.andWhere('order.companyId = :companyId', { companyId });
		}
		if (storeId) {
			query.andWhere('order.storeId = :storeId', { storeId });
		}
		if (supplierId) {
			query.andWhere('order.supplierId = :supplierId', { supplierId });
		}
		if (status) {
			query.andWhere('order.status = :status', { status });
		}
		if (startDate) {
			query.andWhere('order.createdAt >= :startDate', {
				startDate: new Date(startDate),
			});
		}
		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			query.andWhere('order.createdAt <= :endDate', { endDate: end });
		}

		query.orderBy('order.createdAt', 'DESC');

		const offset = (page - 1) * limit;
		query.skip(offset).take(limit);

		const [result, total] = await query.getManyAndCount();

		return {
			ok: true,
			message: 'Pedidos de compra obtenidos correctamente',
			data: {
				result,
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	// 3. CONSULTAR PEDIDO INDIVIDUAL
	async getPurchaseOrderById(id: number) {
		const order = await this.purchaseOrderRepo.findOne({
			where: { id },
			relations: ['supplier', 'store', 'items', 'items.product'],
		});

		if (!order) {
			throw new NotFoundException(
				`Pedido de compra con ID ${id} no encontrado`,
			);
		}

		return {
			ok: true,
			data: { result: order },
		};
	}

	// 4. CANCELAR PEDIDO DE COMPRA
	async cancelPurchaseOrder(id: number) {
		const order = await this.purchaseOrderRepo.findOne({
			where: { id },
			relations: ['items'],
		});

		if (!order) {
			throw new NotFoundException(
				`Pedido de compra con ID ${id} no encontrado`,
			);
		}

		if (order.status === PurchaseOrderStatus.COMPLETED) {
			throw new BadRequestException(
				'No se puede cancelar un pedido ya completado',
			);
		}

		if (order.status === PurchaseOrderStatus.CANCELLED) {
			throw new BadRequestException('El pedido ya se encuentra cancelado');
		}

		// Validar si ya hubo recepciones parciales
		const hasReceivedItems = order.items.some((i) => i.quantityReceived > 0);
		if (hasReceivedItems) {
			throw new BadRequestException(
				'No se puede cancelar una orden que ya tiene entregas parciales registradas en inventario',
			);
		}

		order.status = PurchaseOrderStatus.CANCELLED;
		order.updatedAt = new Date();
		const updated = await this.purchaseOrderRepo.save(order);

		return {
			ok: true,
			message: `Pedido ${order.orderNumber} cancelado exitosamente`,
			data: { result: updated },
		};
	}

	// 5. REGISTRAR RECEPCIÓN DE MERCANCÍA (ACTUALIZACIÓN ATÓMICA DE STOCK Y KARDEX)
	async createSupplierReception(
		dto: CreateSupplierReceptionDto,
		userId?: string,
	) {
		const {
			companyId,
			storeId,
			supplierId,
			purchaseOrderId,
			invoiceNumber,
			notes,
			items,
		} = dto;

		if (!items || items.length === 0) {
			throw new BadRequestException(
				'Debe registrar al menos un producto recibido',
			);
		}

		return await this.dataSource.transaction(async (manager) => {
			const supplier = await manager.findOne(Supplier, {
				where: { id: supplierId },
			});
			if (!supplier) {
				throw new BadRequestException(
					`El proveedor con ID ${supplierId} no existe`,
				);
			}

			const store = await manager.findOne(Store, { where: { id: storeId } });
			if (!store) {
				throw new BadRequestException(`La tienda con ID ${storeId} no existe`);
			}

			let purchaseOrder: PurchaseOrder | null = null;
			if (purchaseOrderId) {
				purchaseOrder = await manager.findOne(PurchaseOrder, {
					where: { id: purchaseOrderId },
					relations: ['items'],
				});
				if (!purchaseOrder) {
					throw new BadRequestException(
						`La orden de compra #${purchaseOrderId} no existe`,
					);
				}
				if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
					throw new BadRequestException(
						'No se puede recibir mercancía para una orden de compra cancelada',
					);
				}
			}

			let total = 0;
			const receptionItemsToCreate: SupplierReceptionItem[] = [];

			for (const itemDto of items) {
				const product = await manager.findOne(Product, {
					where: { id: itemDto.productId, company: { id: companyId } },
				});

				if (!product) {
					throw new BadRequestException(
						`El producto ${itemDto.productId} no existe o no pertenece a la empresa`,
					);
				}

				const previousStock = product.stock;
				const quantityReceived = Number(itemDto.quantityReceived);
				const newStock = previousStock + quantityReceived;
				const unitCost = Number(itemDto.unitCost);
				const lineTotal = unitCost * quantityReceived;

				total += lineTotal;

				// Actualizar stock del producto
				product.stock = newStock;
				if (unitCost > 0) {
					product.purchasePrice = unitCost;
				}
				await manager.save(Product, product);

				// Registrar Kardex atómico (tipo PURCHASE)
				const movement = manager.create(StockMovement, {
					productId: product.id,
					companyId,
					storeId,
					userId: userId || undefined,
					type: 'PURCHASE',
					quantity: quantityReceived,
					previousStock,
					newStock,
					reason: `Recepción mercancía Doc. #${invoiceNumber} - Prov: ${supplier.name}${purchaseOrder ? ` (OC: ${purchaseOrder.orderNumber})` : ''}`,
				});
				await manager.save(StockMovement, movement);

				// Si está vinculada a orden de compra, actualizar cantidad recibida en el item
				if (purchaseOrder) {
					const orderItem = purchaseOrder.items.find(
						(oi) => oi.productId === product.id,
					);
					if (orderItem) {
						orderItem.quantityReceived += quantityReceived;
						await manager.save(PurchaseOrderItem, orderItem);
					}
				}

				const receptionItem = manager.create(SupplierReceptionItem, {
					productId: product.id,
					productName: product.name,
					quantityReceived,
					unitCost,
					lineTotal,
				});
				receptionItemsToCreate.push(receptionItem);
			}

			// Actualizar estado de la orden de compra si corresponde
			if (purchaseOrder) {
				const allCompleted = purchaseOrder.items.every(
					(oi) => oi.quantityReceived >= oi.quantityOrdered,
				);
				purchaseOrder.status = allCompleted
					? PurchaseOrderStatus.COMPLETED
					: PurchaseOrderStatus.PARTIALLY_RECEIVED;
				purchaseOrder.updatedAt = new Date();
				await manager.save(PurchaseOrder, purchaseOrder);
			}

			// Crear la cabecera de recepción
			const reception = manager.create(SupplierReception, {
				companyId,
				storeId,
				supplierId,
				purchaseOrderId: purchaseOrderId || null,
				invoiceNumber,
				notes,
				userId,
				total,
			});

			const savedReception = await manager.save(SupplierReception, reception);

			const receptionItems = receptionItemsToCreate.map((item) => {
				item.receptionId = savedReception.id;
				return item;
			});

			await manager.save(SupplierReceptionItem, receptionItems);
			savedReception.items = receptionItems;

			return {
				ok: true,
				message: `Recepción de mercancía registrada exitosamente. Inventario actualizado.`,
				data: { result: savedReception },
			};
		});
	}

	// 6. LISTAR RECEPCIONES DE MERCANCÍA
	async getSupplierReceptions(dto: GetReceptionsDto) {
		const {
			companyId,
			storeId,
			supplierId,
			startDate,
			endDate,
			page = 1,
			limit = 10,
		} = dto;

		const query = this.supplierReceptionRepo
			.createQueryBuilder('rec')
			.leftJoinAndSelect('rec.supplier', 'supplier')
			.leftJoinAndSelect('rec.store', 'store')
			.leftJoinAndSelect('rec.purchaseOrder', 'purchaseOrder')
			.leftJoinAndSelect('rec.items', 'items')
			.leftJoinAndSelect('items.product', 'product');

		if (companyId) {
			query.andWhere('rec.companyId = :companyId', { companyId });
		}
		if (storeId) {
			query.andWhere('rec.storeId = :storeId', { storeId });
		}
		if (supplierId) {
			query.andWhere('rec.supplierId = :supplierId', { supplierId });
		}
		if (startDate) {
			query.andWhere('rec.receptionDate >= :startDate', {
				startDate: new Date(startDate),
			});
		}
		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			query.andWhere('rec.receptionDate <= :endDate', { endDate: end });
		}

		query.orderBy('rec.receptionDate', 'DESC');

		const offset = (page - 1) * limit;
		query.skip(offset).take(limit);

		const [result, total] = await query.getManyAndCount();

		return {
			ok: true,
			message: 'Recepciones obtenidas correctamente',
			data: {
				result,
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	// 7. CONSULTAR RECEPCIÓN INDIVIDUAL
	async getSupplierReceptionById(id: number) {
		const reception = await this.supplierReceptionRepo.findOne({
			where: { id },
			relations: [
				'supplier',
				'store',
				'purchaseOrder',
				'items',
				'items.product',
			],
		});

		if (!reception) {
			throw new NotFoundException(`Recepción con ID ${id} no encontrada`);
		}

		return {
			ok: true,
			data: { result: reception },
		};
	}
}
