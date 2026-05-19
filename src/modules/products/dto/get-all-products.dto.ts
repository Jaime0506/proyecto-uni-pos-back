import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetAllProductsDto {
	@ApiProperty({ description: 'El id de la empresa' })
	@IsNotEmpty()
	@IsNumber()
	companyId!: number;

	@ApiProperty({ description: 'El id de la tienda' })
	@IsNotEmpty()
	@IsNumber()
	storeId!: number;
}
