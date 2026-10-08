import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateBonificationDto {
	@ApiProperty({ description: 'El id de la bonificación' })
	@IsNotEmpty()
	@IsNumber()
	id: number;

	@ApiPropertyOptional({ description: 'El id del cliente' })
	@IsOptional()
	@IsNumber()
	customer_id?: number;

	@ApiPropertyOptional({ description: 'El monto total de la bonificación' })
	@IsOptional()
	@IsNumber()
	total_amount?: number;

	@ApiPropertyOptional({
		description: 'Motivo u observaciones del ajuste manual',
	})
	@IsOptional()
	@IsString()
	notes?: string;
}
