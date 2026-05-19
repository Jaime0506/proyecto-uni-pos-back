import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { GetAllProductsDto } from './dto/get-all-products.dto';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from 'src/modules/categories/entities/category.entity';

@Injectable()
export class ProductsService {
	constructor(
		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,
		@InjectRepository(Category)
		private readonly categoryRepository: Repository<Category>,
	) {}

	async getAllProducts(dto: GetAllProductsDto) {
		const query = this.productRepository
			.createQueryBuilder('product')
			.innerJoin('product.company', 'company')
			.where('company.id = :companyId', { companyId: dto.companyId })
			.andWhere('product.store_id = :storeId', { storeId: dto.storeId });

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

	async updateProduct(dto: UpdateProductDto) {
		// Verificar que venga el id
		if (!dto.id) {
			throw new Error('El id del producto es obligatorio para actualizar');
		}

		// Buscar el producto existente
		const existingProduct = await this.productRepository.findOne({
			where: { id: dto.id },
		});

		if (!existingProduct) {
			throw new Error(`No se encontró el producto con id ${dto.id}`);
		}

		// Actualizar campos (solo los que vienen en dto)
		Object.assign(existingProduct, dto);
		// Guardar los cambios
		const updated = await this.productRepository.save(existingProduct);

		return {
			message: 'Producto actualizado correctamente',
			product: updated,
		};
	}

	async deleteProduct(id: number) {
		try {
			const product = await this.productRepository.findOne({ where: { id } });

			if (!product) {
				throw new Error(`No se encontró el producto con id ${id}`);
			}

			// Marca el producto como eliminado (soft delete)
			await this.productRepository.softDelete(id);

			return { message: `Producto con id ${id} eliminado correctamente.` };
		} catch (error) {
			console.error('ERROR AL ELIMINAR PRODUCTO', error);
			throw new Error('Error al eliminar producto');
		}
	}
}
