import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class GetBonusTransactionsDto {
	@ApiProperty({ description: 'ID del cliente' })
	@IsNotEmpty()
	@IsNumber()
	customerId: number;

	@ApiProperty({ description: 'ID de la compañía' })
	@IsNotEmpty()
	@IsNumber()
	companyId: number;

	@ApiPropertyOptional({ description: 'ID de la tienda' })
	@IsOptional()
	@IsNumber()
	storeId?: number;
}
