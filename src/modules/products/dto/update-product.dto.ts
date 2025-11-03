import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
	@ApiProperty({ example: 25 })
	@IsOptional()
	@IsNumber()
	id?: number;

	@ApiProperty({ example: 'tomate' })
	@IsString()
	name: string;

	@ApiProperty({ example: '10001' })
	@IsString()
	sku: string;

	@ApiProperty({ example: '100001' })
	@IsString()
	barcode: string;

	@ApiProperty({ example: 123 })
	@IsNumber()
	purchasePrice: number;

	@ApiProperty({ example: 66456 })
	@IsNumber()
	salePrice: number;

	@ApiProperty({ example: false })
	@IsBoolean()
	taxExempt: boolean;

	@ApiProperty({ example: 5 })
	@IsNumber()
	stock: number;
}
