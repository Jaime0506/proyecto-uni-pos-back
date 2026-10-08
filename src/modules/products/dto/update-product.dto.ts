import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
	@ApiProperty({ example: 25, required: false })
	@IsOptional()
	@IsNumber()
	id?: number;

	@ApiProperty({ example: 'tomate', required: false })
	@IsOptional()
	@IsString()
	name?: string;

	@ApiProperty({ example: '10001', required: false })
	@IsOptional()
	@IsString()
	sku?: string;

	@ApiProperty({ example: '100001', required: false })
	@IsOptional()
	@IsString()
	barcode?: string;

	@ApiProperty({ example: 123, required: false })
	@IsOptional()
	@IsNumber()
	purchasePrice?: number;

	@ApiProperty({ example: 66456, required: false })
	@IsOptional()
	@IsNumber()
	salePrice?: number;

	@ApiProperty({ example: false, required: false })
	@IsOptional()
	@IsBoolean()
	taxExempt?: boolean;

	@ApiProperty({ example: 5, required: false })
	@IsOptional()
	@IsNumber()
	stock?: number;

	@ApiProperty({ example: 5, required: false })
	@IsOptional()
	@IsNumber()
	minStock?: number;

	@ApiProperty({ example: 1, required: false })
	@IsOptional()
	@IsNumber()
	categoryId?: number;

	@ApiProperty({
		example: 'https://mi-imagen.com/producto.jpg',
		required: false,
	})
	@IsOptional()
	@IsString()
	image?: string;
}
