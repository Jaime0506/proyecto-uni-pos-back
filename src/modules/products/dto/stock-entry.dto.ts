import { ApiProperty } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsPositive,
	IsString,
} from 'class-validator';

export class StockEntryDto {
	@ApiProperty({ example: 10, description: 'Cantidad a ingresar' })
	@IsNumber()
	@IsPositive()
	@IsNotEmpty()
	quantity!: number;

	@ApiProperty({
		example: 'Compra a proveedor Distribuidora XYZ',
		required: false,
	})
	@IsOptional()
	@IsString()
	reason?: string;

	@ApiProperty({ example: 1, description: 'ID de la tienda' })
	@IsNumber()
	@IsNotEmpty()
	storeId!: number;

	@ApiProperty({ example: 1, description: 'ID de la empresa' })
	@IsNumber()
	@IsNotEmpty()
	companyId!: number;
}
