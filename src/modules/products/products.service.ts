import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { In, Repository } from 'typeorm';
import { GetAllProductsDto } from './dto/get-all-products.dto';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from 'src/modules/categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { StockMovement } from './entities/stock-movement.entity';
import { StockEntryDto } from './dto/stock-entry.dto';

@Injectable()
export class ProductsService {
	constructor(
		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,
		@InjectRepository(Category)
		private readonly categoryRepository: Repository<Category>,
		@InjectRepository(StockMovement)
		private readonly stockMovementRepository: Repository<StockMovement>,
	) {}

	async getAllProducts(dto: GetAllProductsDto) {
		const query = this.productRepository
			.createQueryBuilder('product')
			.innerJoin('product.company', 'company')
			.leftJoinAndSelect('product.category', 'category')
			.where('company.id = :companyId', { companyId: dto.companyId })
			.andWhere('product.store_id = :storeId', { storeId: dto.storeId })
			.orderBy('product.id', 'DESC');

		return await query.getMany();
	}

	private detectCSVSeparator(buffer: Buffer): ';' | ',' {
		const firstLine = buffer.toString('utf8').split('\n')[0];
		const commaCount = (firstLine.match(/,/g) || []).length;
		const semicolonCount = (firstLine.match(/;/g) || []).length;
		return semicolonCount > commaCount ? ';' : ',';
	}

	private async parseAndValidateCsvRows(buffer: Buffer): Promise<{
		validRows: Array<{
			rowNumber: number;
			name: string;
			sku: string | null;
			barcode: string | null;
			image: string | null;
			purchasePrice: number;
			salePrice: number;
			stock: number;
			minStock: number | null;
			categoryName: string | null;
		}>;
		errors: Array<{
			rowNumber: number;
			sku?: string | null;
			name?: string | null;
			message: string;
		}>;
	}> {
		const separator = this.detectCSVSeparator(buffer);
		const rawRows: any[] = [];

		await new Promise<void>((resolve, reject) => {
			const cleanedString = buffer.toString('utf8');
			const bufferStream = Readable.from([cleanedString]);

			bufferStream
				.pipe(
					csvParser({
						separator,
						mapHeaders: ({ header }) => header.trim(),
					}),
				)
				.on('data', (data) => rawRows.push(data))
				.on('end', () => resolve())
				.on('error', (err) => {
					console.error('Error al procesar el archivo CSV:', err);
					reject(err);
				});
		});

		const errors: Array<{
			rowNumber: number;
			sku?: string | null;
			name?: string | null;
			message: string;
		}> = [];

		const validRows: Array<{
			rowNumber: number;
			name: string;
			sku: string | null;
			barcode: string | null;
			image: string | null;
			purchasePrice: number;
			salePrice: number;
			stock: number;
			minStock: number | null;
			categoryName: string | null;
		}> = [];

		const seenSkus = new Map<string, number>();

		if (rawRows.length === 0) {
			errors.push({
				rowNumber: 1,
				message: 'El archivo CSV está vacío o no contiene filas de datos.',
			});
			return { validRows, errors };
		}

		rawRows.forEach((row, index) => {
			const rowNumber = index + 2; // Fila 1 = encabezados
			const rowErrors: string[] = [];

			const name = row.name?.toString().trim();
			if (!name) {
				rowErrors.push('El campo "name" es obligatorio.');
			}

			const rawCompra = row.precio_compra?.toString().trim();
			const purchasePrice = parseFloat(rawCompra);
			if (!rawCompra || isNaN(purchasePrice) || purchasePrice < 0) {
				rowErrors.push(
					'El campo "precio_compra" debe ser un número válido mayor o igual a 0.',
				);
			}

			const rawVenta = row.precio_venta?.toString().trim();
			const salePrice = parseFloat(rawVenta);
			if (!rawVenta || isNaN(salePrice) || salePrice < 0) {
				rowErrors.push(
					'El campo "precio_venta" debe ser un número válido mayor o igual a 0.',
				);
			}

			const rawStock = row.stock?.toString().trim();
			const stock = parseInt(rawStock, 10);
			if (!rawStock || isNaN(stock) || stock < 0) {
				rowErrors.push(
					'El campo "stock" debe ser un número entero mayor o igual a 0.',
				);
			}

			// Stock mínimo opcional: soporte para stock_minimo, min_stock, stockMinimo, minStock
			const rawMinStock = (
				row.stock_minimo ??
				row.min_stock ??
				row.stockMinimo ??
				row.minStock
			)?.toString().trim();

			let minStock: number | null = null;
			if (rawMinStock !== undefined && rawMinStock !== '') {
				const parsedMinStock = parseInt(rawMinStock, 10);
				if (isNaN(parsedMinStock) || parsedMinStock < 0) {
					rowErrors.push(
						'El campo "stock_minimo" debe ser un número entero mayor o igual a 0.',
					);
				} else {
					minStock = parsedMinStock;
				}
			}

			const sku = row.sku?.toString().trim() || null;
			if (sku) {
				if (seenSkus.has(sku)) {
					const prevRow = seenSkus.get(sku);
					rowErrors.push(
						`El SKU "${sku}" está repetido en la fila ${prevRow} dentro del archivo.`,
					);
				} else {
					seenSkus.set(sku, rowNumber);
				}
			}

			if (rowErrors.length > 0) {
				errors.push({
					rowNumber,
					sku,
					name: name || undefined,
					message: rowErrors.join(' '),
				});
			} else {
				validRows.push({
					rowNumber,
					name: name!,
					sku,
					barcode: row.barcode?.toString().trim() || null,
					image: row.image?.toString().trim() || null,
					purchasePrice,
					salePrice,
					stock,
					minStock,
					categoryName: row.category?.toString().trim() || null,
				});
			}
		});

		return { validRows, errors };
	}

	async previewUpload(body: any, file: Express.Multer.File) {
		const fileExtension =
			file.originalname.split('.').pop()?.toLowerCase() || '';

		if (!['csv'].includes(fileExtension)) {
			throw new BadRequestException(
				'El formato de archivo no es válido. Se admite únicamente archivos CSV.',
			);
		}

		const companyId = Number(body.companyId);
		const storeId = Number(body.storeId);

		if (!companyId || !storeId) {
			throw new BadRequestException('companyId y storeId son obligatorios.');
		}

		const { validRows, errors } = await this.parseAndValidateCsvRows(
			file.buffer,
		);

		const validSkus = validRows
			.map((r) => r.sku)
			.filter((sku): sku is string => Boolean(sku));

		const existingProducts =
			validSkus.length > 0
				? await this.productRepository.find({
						where: {
							company: { id: companyId },
							storeId: storeId,
							sku: In(validSkus),
						},
						relations: ['category'],
					})
				: [];

		const existingMap = new Map<string, Product>();
		existingProducts.forEach((p) => {
			if (p.sku) existingMap.set(p.sku.trim(), p);
		});

		const toCreate: any[] = [];
		const toUpdate: any[] = [];

		validRows.forEach((row) => {
			if (row.sku && existingMap.has(row.sku)) {
				const existing = existingMap.get(row.sku)!;
				const currentPurchasePrice = Number(existing.purchasePrice);
				const currentSalePrice = Number(existing.salePrice);
				const stockDiff = row.stock - existing.stock;
				const currentMinStock = existing.minStock ?? 5;
				const targetMinStock =
					row.minStock !== null ? row.minStock : currentMinStock;

				const priceChanged =
					currentPurchasePrice !== row.purchasePrice ||
					currentSalePrice !== row.salePrice;
				const stockChanged = stockDiff !== 0;
				const nameChanged = existing.name.trim() !== row.name.trim();
				const categoryChanged =
					(row.categoryName || null) !== (existing.category?.name || null);
				const minStockChanged =
					row.minStock !== null && row.minStock !== currentMinStock;

				toUpdate.push({
					rowNumber: row.rowNumber,
					productId: existing.id,
					name: row.name,
					sku: row.sku,
					barcode: row.barcode,
					currentValues: {
						name: existing.name,
						purchasePrice: currentPurchasePrice,
						salePrice: currentSalePrice,
						stock: existing.stock,
						minStock: currentMinStock,
						categoryName: existing.category?.name || null,
					},
					newValues: {
						name: row.name,
						purchasePrice: row.purchasePrice,
						salePrice: row.salePrice,
						stock: row.stock,
						minStock: targetMinStock,
						categoryName: row.categoryName,
					},
					changes: {
						stockDiff,
						stockChanged,
						priceChanged,
						nameChanged,
						categoryChanged,
						minStockChanged,
					},
				});
			} else {
				toCreate.push({
					rowNumber: row.rowNumber,
					name: row.name,
					sku: row.sku,
					barcode: row.barcode,
					categoryName: row.categoryName,
					purchasePrice: row.purchasePrice,
					salePrice: row.salePrice,
					stock: row.stock,
					minStock: row.minStock !== null ? row.minStock : 5,
				});
			}
		});

		const summary = {
			totalRows: validRows.length + errors.length,
			toCreateCount: toCreate.length,
			toUpdateCount: toUpdate.length,
			errorCount: errors.length,
			unchangedCount: toUpdate.filter(
				(u) =>
					!u.changes.stockChanged &&
					!u.changes.priceChanged &&
					!u.changes.nameChanged &&
					!u.changes.categoryChanged &&
					!u.changes.minStockChanged,
			).length,
		};

		return {
			ok: true,
			summary,
			toCreate,
			toUpdate,
			errors,
		};
	}

	async uploadProducts(
		body: any,
		file: Express.Multer.File,
		userId?: string,
	) {
		const fileExtension =
			file.originalname.split('.').pop()?.toLowerCase() || '';

		if (!['csv'].includes(fileExtension)) {
			throw new BadRequestException(
				'El formato de archivo no es válido. Se admite únicamente archivos CSV.',
			);
		}

		const companyId = Number(body.companyId);
		const storeId = Number(body.storeId);

		if (!companyId || !storeId) {
			throw new BadRequestException('companyId y storeId son obligatorios.');
		}

		const { validRows, errors } = await this.parseAndValidateCsvRows(
			file.buffer,
		);

		if (errors.length > 0) {
			throw new BadRequestException({
				message:
					'El archivo contiene errores de validación. Corrige los problemas antes de procesar.',
				errors,
			});
		}

		if (validRows.length === 0) {
			throw new BadRequestException(
				'No se encontraron filas con datos válidos para procesar.',
			);
		}

		// Ejecución transaccional completa (ACID)
		return await this.productRepository.manager.transaction(
			async (transactionalEntityManager) => {
				// 1. Resolver categorías
				const categoryNames = [
					...new Set(
						validRows
							.map((r) => r.categoryName)
							.filter((name): name is string => Boolean(name)),
					),
				];

				const categoryCache = new Map<string, Category>();

				if (categoryNames.length > 0) {
					const existingCategories = await transactionalEntityManager
						.getRepository(Category)
						.createQueryBuilder('cat')
						.where('cat.companyId = :companyId', { companyId })
						.andWhere('cat.name IN (:...names)', { names: categoryNames })
						.getMany();

					existingCategories.forEach((cat) =>
						categoryCache.set(cat.name, cat),
					);

					const missingNames = categoryNames.filter(
						(name) => !categoryCache.has(name),
					);

					if (missingNames.length > 0) {
						const newCategories = transactionalEntityManager
							.getRepository(Category)
							.create(
								missingNames.map((name) => ({
									name,
									companyId,
									storeId,
									parentId: null,
								})),
							);

						const savedCategories = await transactionalEntityManager
							.getRepository(Category)
							.save(newCategories);

						savedCategories.forEach((cat) =>
							categoryCache.set(cat.name, cat),
						);
					}
				}

				// 2. Consultar productos existentes por SKU
				const validSkus = validRows
					.map((r) => r.sku)
					.filter((sku): sku is string => Boolean(sku));

				const existingProducts =
					validSkus.length > 0
						? await transactionalEntityManager
								.getRepository(Product)
								.find({
									where: {
										company: { id: companyId },
										storeId,
										sku: In(validSkus),
									},
									relations: ['category', 'company'],
								})
						: [];

				const existingMap = new Map<string, Product>();
				existingProducts.forEach((p) => {
					if (p.sku) existingMap.set(p.sku.trim(), p);
				});

				let createdCount = 0;
				let updatedCount = 0;

				for (const row of validRows) {
					const categoryEntity = row.categoryName
						? categoryCache.get(row.categoryName) ?? null
						: null;

					if (row.sku && existingMap.has(row.sku)) {
						// Actualizar producto existente (Upsert por SKU)
						const existing = existingMap.get(row.sku)!;
						const prevStock = existing.stock;
						const prevPurchasePrice = Number(existing.purchasePrice);
						const prevSalePrice = Number(existing.salePrice);
						const prevMinStock = existing.minStock ?? 5;

						existing.name = row.name;
						existing.purchasePrice = row.purchasePrice;
						existing.salePrice = row.salePrice;
						existing.stock = row.stock;
						if (row.minStock !== null) {
							existing.minStock = row.minStock;
						}
						if (row.barcode !== null) {
							existing.barcode = row.barcode;
						}
						if (row.image !== null) {
							existing.image = row.image;
						}
						if (categoryEntity) {
							existing.category = categoryEntity;
						}
						existing.updatedAt = new Date();

						const savedProduct = await transactionalEntityManager
							.getRepository(Product)
							.save(existing);

						// Detalle del movimiento para Kardex
						const stockDiff = row.stock - prevStock;
						const changeDetails: string[] = [];

						if (stockDiff !== 0) {
							changeDetails.push(
								`Stock: ${prevStock} ➔ ${row.stock} (${stockDiff > 0 ? '+' : ''}${stockDiff})`,
							);
						}
						if (prevSalePrice !== row.salePrice) {
							changeDetails.push(
								`P. Venta: $${prevSalePrice} ➔ $${row.salePrice}`,
							);
						}
						if (prevPurchasePrice !== row.purchasePrice) {
							changeDetails.push(
								`P. Compra: $${prevPurchasePrice} ➔ $${row.purchasePrice}`,
							);
						}
						if (row.minStock !== null && prevMinStock !== row.minStock) {
							changeDetails.push(
								`Stock Mínimo: ${prevMinStock} ➔ ${row.minStock}`,
							);
						}

						const movementType =
							stockDiff > 0
								? 'MANUAL_ENTRY'
								: stockDiff < 0
									? 'ADJUSTMENT'
									: 'ADJUSTMENT';
						const movementReason =
							changeDetails.length > 0
								? `Carga masiva CSV (Actualización SKU ${row.sku}): ${changeDetails.join(', ')}`
								: `Carga masiva CSV (Actualización SKU ${row.sku}): Sin modificaciones de inventario`;

						const movement = new StockMovement();
						movement.productId = savedProduct.id;
						movement.companyId = companyId;
						movement.storeId = storeId;
						movement.userId = userId || undefined;
						movement.type = movementType;
						movement.quantity = Math.abs(stockDiff);
						movement.previousStock = prevStock;
						movement.newStock = row.stock;
						movement.reason = movementReason;

						await transactionalEntityManager.save(StockMovement, movement);

						updatedCount++;
					} else {
						// Crear nuevo producto
						const newProduct = new Product();
						newProduct.company = { id: companyId } as any;
						newProduct.storeId = storeId;
						newProduct.name = row.name;
						newProduct.sku = row.sku || undefined;
						newProduct.barcode = row.barcode || undefined;
						newProduct.image =
							row.image ||
							'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400';
						newProduct.purchasePrice = row.purchasePrice;
						newProduct.salePrice = row.salePrice;
						newProduct.stock = row.stock;
						newProduct.minStock =
							row.minStock !== null ? row.minStock : 5;
						if (categoryEntity) {
							newProduct.category = categoryEntity;
						}

						const savedProduct = await transactionalEntityManager.save(
							Product,
							newProduct,
						);

						// Kardex inicial
						const movement = new StockMovement();
						movement.productId = savedProduct.id;
						movement.companyId = companyId;
						movement.storeId = storeId;
						movement.userId = userId || undefined;
						movement.type = 'INITIAL';
						movement.quantity = savedProduct.stock;
						movement.previousStock = 0;
						movement.newStock = savedProduct.stock;
						movement.reason = `Carga inicial masiva CSV (SKU: ${savedProduct.sku || 'S/N'}, P. Compra: ${savedProduct.purchasePrice}, P. Venta: ${savedProduct.salePrice}, Stock Mín: ${savedProduct.minStock})`;

						await transactionalEntityManager.save(StockMovement, movement);

						createdCount++;
					}
				}

				return {
					ok: true,
					message: `Carga masiva completada exitosamente: ${createdCount} productos creados, ${updatedCount} productos actualizados.`,
					createdCount,
					updatedCount,
				};
			},
		);
	}

	async updateProduct(dto: UpdateProductDto, userId?: string) {
		if (!dto.id) {
			throw new BadRequestException(
				'El id del producto es obligatorio para actualizar',
			);
		}

		const existingProduct = await this.productRepository.findOne({
			where: { id: dto.id },
			relations: ['company'],
		});

		if (!existingProduct) {
			throw new NotFoundException(
				`No se encontró el producto con id ${dto.id}`,
			);
		}

		const previousStock = existingProduct.stock;
		const newStockValue =
			dto.stock !== undefined ? Number(dto.stock) : previousStock;

		// Si el stock cambió por edición directa, registrar movimiento de ajuste en Kardex
		if (dto.stock !== undefined && newStockValue !== previousStock) {
			const diff = newStockValue - previousStock;
			const movement = this.stockMovementRepository.create({
				productId: existingProduct.id,
				companyId: existingProduct.company?.id || 1,
				storeId: existingProduct.storeId,
				userId: userId || undefined,
				type: 'ADJUSTMENT',
				quantity: diff,
				previousStock: previousStock,
				newStock: newStockValue,
				reason: 'Ajuste manual de stock desde edición de producto',
			});
			await this.stockMovementRepository.save(movement);
		}

		// Asignar campos explícitos
		if (dto.name !== undefined) existingProduct.name = dto.name;
		if (dto.sku !== undefined) existingProduct.sku = dto.sku;
		if (dto.barcode !== undefined) existingProduct.barcode = dto.barcode;
		if (dto.purchasePrice !== undefined)
			existingProduct.purchasePrice = Number(dto.purchasePrice);
		if (dto.salePrice !== undefined)
			existingProduct.salePrice = Number(dto.salePrice);
		if (dto.taxExempt !== undefined) existingProduct.taxExempt = dto.taxExempt;
		if (dto.stock !== undefined) existingProduct.stock = newStockValue;
		if (dto.minStock !== undefined)
			existingProduct.minStock = Number(dto.minStock);
		if (dto.image !== undefined) existingProduct.image = dto.image;
		if (dto.categoryId !== undefined) {
			existingProduct.category = dto.categoryId
				? ({ id: Number(dto.categoryId) } as any)
				: null;
		}

		const updated = await this.productRepository.save(existingProduct);

		return {
			message: 'Producto actualizado correctamente',
			product: updated,
		};
	}

	async createProduct(dto: CreateProductDto, userId?: string) {
		const newProduct = this.productRepository.create({
			...dto,
			company: { id: Number(dto.companyId) },
			category: dto.categoryId ? { id: Number(dto.categoryId) } : undefined,
			minStock: dto.minStock !== undefined ? Number(dto.minStock) : 5,
			image:
				dto.image?.trim() ||
				'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400',
		});
		const savedProduct = await this.productRepository.save(newProduct);

		// Registrar movimiento inicial si stock > 0
		if (savedProduct.stock > 0) {
			const movement = this.stockMovementRepository.create({
				productId: savedProduct.id,
				companyId: Number(dto.companyId),
				storeId: Number(dto.storeId),
				userId: userId || undefined,
				type: 'INITIAL',
				quantity: savedProduct.stock,
				previousStock: 0,
				newStock: savedProduct.stock,
				reason: 'Stock inicial al registrar producto',
			});
			await this.stockMovementRepository.save(movement);
		}

		return {
			message: 'Producto creado correctamente',
			product: savedProduct,
		};
	}

	async addStockEntry(productId: number, dto: StockEntryDto, userId?: string) {
		const product = await this.productRepository.findOne({
			where: { id: productId },
			relations: ['company'],
		});

		if (!product) {
			throw new NotFoundException(
				`No se encontró el producto con id ${productId}`,
			);
		}

		const previousStock = product.stock;
		const newStock = previousStock + Number(dto.quantity);
		product.stock = newStock;
		await this.productRepository.save(product);

		const movement = this.stockMovementRepository.create({
			productId: product.id,
			companyId: dto.companyId || product.company?.id || 1,
			storeId: dto.storeId || product.storeId,
			userId: userId || undefined,
			type: 'MANUAL_ENTRY',
			quantity: Number(dto.quantity),
			previousStock,
			newStock,
			reason: dto.reason?.trim() || 'Ingreso manual de stock',
		});
		await this.stockMovementRepository.save(movement);

		return {
			ok: true,
			message: `Se ingresaron ${dto.quantity} unidades correctamente. Stock actual: ${newStock}`,
			product,
			movement,
		};
	}

	async getProductMovements(productId: number) {
		const product = await this.productRepository.findOne({
			where: { id: productId },
			withDeleted: true,
		});

		if (!product) {
			throw new NotFoundException(
				`No se encontró el producto con id ${productId}`,
			);
		}

		const movements = await this.stockMovementRepository.find({
			where: { productId },
			order: { createdAt: 'DESC' },
		});

		return {
			ok: true,
			product,
			data: movements,
		};
	}

	async deleteProduct(id: number) {
		const product = await this.productRepository.findOne({ where: { id } });

		if (!product) {
			throw new NotFoundException(`No se encontró el producto con id ${id}`);
		}

		// Marca el producto como eliminado (soft delete)
		await this.productRepository.softDelete(id);

		return {
			message: `Producto "${product.name}" dado de baja correctamente.`,
		};
	}
}
