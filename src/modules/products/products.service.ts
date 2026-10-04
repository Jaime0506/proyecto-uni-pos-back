import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
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

	async uploadProducts(body: any, file: Express.Multer.File) {
		const fileExtension =
			file.originalname.split('.').pop()?.toLowerCase() || '';

		if (!['csv'].includes(fileExtension)) {
			throw new BadRequestException(
				'El formato de archivo no es válido. Se admiten archivos CSV, XLS o XLSX',
			);
		}

		let products: any[] = [];

		if (fileExtension === 'csv') {
			products = await this.uploadProductsByFile(
				file,
				body.companyId,
				body.storeId,
			);
		}

		await this.productRepository.save(products);
	}

	private detectCSVSeparator(buffer: Buffer): ';' | ',' {
		const firstLine = buffer.toString('utf8').split('\n')[0];

		const commaCount = (firstLine.match(/,/g) || []).length;
		const semicolonCount = (firstLine.match(/;/g) || []).length;

		return semicolonCount > commaCount ? ';' : ',';
	}

	async uploadProductsByFile(
		file: Express.Multer.File,
		companyId: number,
		storeId: number,
	): Promise<any[]> {
		// 1. Parsear el CSV y recolectar filas crudas
		const rawRows: any[] = [];

		await new Promise<void>((resolve, reject) => {
			const separator = this.detectCSVSeparator(file.buffer);
			const cleanedString = file.buffer.toString('utf8').replace(/"/g, '');
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

		// 2. Validar campos obligatorios por fila
		const REQUIRED_FIELDS = ['name', 'precio_compra', 'precio_venta', 'stock'];
		const validationErrors: string[] = [];

		rawRows.forEach((row, index) => {
			const rowNumber = index + 2; // fila 1 = encabezados
			for (const field of REQUIRED_FIELDS) {
				const value = row[field]?.toString().trim();
				if (!value) {
					validationErrors.push(
						`Fila ${rowNumber}: el campo "${field}" es obligatorio y está vacío.`,
					);
				}
			}
		});

		if (validationErrors.length > 0) {
			throw new BadRequestException({
				message: 'El archivo contiene filas con campos obligatorios vacíos.',
				errors: validationErrors,
			});
		}

		// 3. Resolver categorías de forma eficiente
		// Recolectar todos los nombres de categoría únicos (ignorar vacíos)
		const categoryNames = [
			...new Set(
				rawRows
					.map((r) => r.category?.toString().trim())
					.filter((name): name is string => Boolean(name)),
			),
		];

		// Mapa nombre → entidad Category (cache)
		const categoryCache = new Map<string, Category>();

		if (categoryNames.length > 0) {
			// Consultar en una sola query las categorías ya existentes
			const existingCategories = await this.categoryRepository
				.createQueryBuilder('cat')
				.where('cat.companyId = :companyId', { companyId })
				.andWhere('cat.name IN (:...names)', { names: categoryNames })
				.getMany();

			existingCategories.forEach((cat) => categoryCache.set(cat.name, cat));

			// Crear en batch las categorías que no existen
			const missingNames = categoryNames.filter(
				(name) => !categoryCache.has(name),
			);

			if (missingNames.length > 0) {
				const newCategories = this.categoryRepository.create(
					missingNames.map((name) => ({
						name,
						companyId: Number(companyId),
						storeId: Number(storeId),
						parentId: null,
					})),
				);

				const savedCategories =
					await this.categoryRepository.save(newCategories);

				savedCategories.forEach((cat) => categoryCache.set(cat.name, cat));
			}
		}

		// 4. Construir array de productos con storeId y category resueltos
		const resultArray = rawRows.map((row) => {
			const categoryName = row.category?.toString().trim();
			const categoryEntity = categoryName
				? categoryCache.get(categoryName)
				: undefined;

			return {
				name: row.name?.toString().trim(),
				sku: row.sku?.toString().trim() || null,
				barcode: row.barcode?.toString().trim() || null,
				image: row.image?.toString().trim() || null,
				purchasePrice: parseFloat(row.precio_compra),
				salePrice: parseFloat(row.precio_venta),
				stock: parseInt(row.stock, 10),
				company: { id: Number(companyId) },
				storeId: Number(storeId),
				category: categoryEntity ?? null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
		});

		return resultArray;
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
