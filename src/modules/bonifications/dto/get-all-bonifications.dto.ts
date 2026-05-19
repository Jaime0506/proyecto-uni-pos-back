import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class GetAllBonificationsDto {
	@ApiPropertyOptional({ description: 'El id del cliente para filtrar' })
	@IsOptional()
	@IsNumber()
	customerId?: number;

	@ApiProperty({ description: 'El id de la empresa para filtrar' })
	@IsNotEmpty()
	@IsNumber()
	companyId!: number;

	@ApiProperty({ description: 'El id de la tienda para filtrar' })
	@IsNotEmpty()
	@IsNumber()
	storeId!: number;
}
