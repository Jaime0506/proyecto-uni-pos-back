import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { GetAllProductsDto } from './dto/get-all-products.dto';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class ProductsService {
	constructor(
		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,
	) {}

	async getAllProducts(dto: GetAllProductsDto) {
		return this.productRepository.find({
			where: {
				company: {
					id: dto.companyId,
				},
			},
		});
	}

	private detectCSVSeparator(buffer: Buffer): ';' | ',' {
		const firstLine = buffer.toString('utf8').split('\n')[0];

		const commaCount = (firstLine.match(/,/g) || []).length;
		const semicolonCount = (firstLine.match(/;/g) || []).length;

		return semicolonCount > commaCount ? ';' : ',';
	}

	async uploadProductsByFile(body: any, file: Express.Multer.File) {
		console.log('ESTOY EN uploadProductsByFile', body, file);

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
						resultArray.push(data);
					})
					.on('end', () => resolve())
					.on('error', (err) => {
						console.error('Error al procesar el archivo CSV:', err);
						reject(err);
					});
			});

			console.log(resultArray);
			return resultArray;
		} catch (error) {
			console.log('ERROR PROCESANDO CSV', error);
			throw error;
		}
	}
}
