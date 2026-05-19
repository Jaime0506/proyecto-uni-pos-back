import { ApiProperty } from '@nestjs/swagger';
import {
	IsBoolean,
	IsNumber,
	IsOptional,
	IsString,
	IsNotEmpty,
} from 'class-validator';

export class CreateProductDto {
    @ApiProperty({ example: 5 })
	@IsNumber()
	companyId: number;

    @ApiProperty({ example: 5 })
	@IsNumber()
	storeId: number;

	@ApiProperty({ example: 'Tomate' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ example: '10001', required: false, nullable: true })
	@IsOptional()
	@IsString()
	sku?: string | undefined;

	@ApiProperty({ example: '100001', required: false, nullable: true })
	@IsOptional()
	@IsString()
	barcode?: string | undefined;

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

	@ApiProperty({ example: 'https://mi-imagen.com/producto.jpg' })
	@IsString()
	image: string;
}
