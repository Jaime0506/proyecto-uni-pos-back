import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { GetAllProductsDto } from './dto/get-all-products.dto';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
	constructor(
		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,
	) {}

	async getAllProducts(dto: GetAllProductsDto) {
		console.log(dto);
		try {
			const query = this.productRepository
				.createQueryBuilder('product')
				.innerJoin('product.company', 'company')
				.where('company.id = :companyId', { companyId: dto.companyId });

			return await query.getMany();
		} catch (error) {
			console.log('ERROR AL TRAER PRODUCTOS', error);
		}
	}

	async uploadProducts(body: any, file: Express.Multer.File) {
		console.log('ESTOY EN uploadProducts', body);
		try {
			const fileExtension =
				file.originalname.split('.').pop()?.toLowerCase() || '';

			if (!['csv'].includes(fileExtension)) {
				throw new BadRequestException(
					'El formato de archivo no es válido. Se admiten archivos CSV, XLS o XLSX',
				);
			}

			let products: any[] = [];

			if (fileExtension === 'csv') {
				products = await this.uploadProductsByFile(file, body.companyId);
			}

			try {
				const newProducts = await this.productRepository.insert(products);
				console.log('LOS newProducts PRODUCTOS SON', newProducts);
			} catch (error) {
				console.log('ERROR AL INSERTAR PRODUCTOS', error);
			}

			console.log('LOS PRODUCTOS SON', products);
		} catch (error) {
			console.log('ERROR AL CARGAR PRODUCTOS', error);
		}
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
	): Promise<any[]> {
		console.log('ESTOY EN uploadProductsByFile', file);

		let resultArray: any[] = [];

		try {
			await new Promise<void>((resolve, reject) => {
				const separator = this.detectCSVSeparator(file.buffer);
				const cleanedString = file.buffer.toString('utf8').replace(/"/g, '');
				const bufferStream = Readable.from([cleanedString]);

				console.log('separator', separator);

				bufferStream
					.pipe(
						csvParser({
							separator,
							mapHeaders: ({ header }) => header.trim(),
						}),
					)
					.on('data', (data) => {
						console.log('FILA CSV', data);
						resultArray.push({
							...data,
							purchasePrice: +data.precio_compra,
							salePrice: +data.precio_venta,
							stock: +data.stock,
							company: { id: companyId },
							createdAt: new Date(),
							updatedAt: new Date(),
						});
					})
					.on('end', () => resolve())
					.on('error', (err) => {
						console.error('Error al procesar el archivo CSV:', err);
						reject(err);
					});
			});

			return resultArray;
		} catch (error) {
			console.log('ERROR PROCESANDO CSV', error);
			throw error;
		}
	}

	async updateProduct(dto: UpdateProductDto) {
		try {
			console.log('DATA EN updateProduct', dto);

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

			console.log('anterior', existingProduct);

			// Guardar los cambios
			const updated = await this.productRepository.save(existingProduct);

			console.log('despues', existingProduct);

			return {
				message: 'Producto actualizado correctamente',
				product: updated,
			};
		} catch (error) {
			console.error('ERROR EN updateProduct', error);
			throw new Error('Error al actualizar el producto: ' + error.message);
		}
	}

	async deleteProduct(id: number) {
		try {
			console.log('ELIMINAR PRODUCTO id', id);

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
