import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';

export class GetAllBonificationsDto {
	@ApiPropertyOptional({ description: 'El id del cliente para filtrar' })
	@IsOptional()
	@IsNumber()
	customerId?: number;
}
