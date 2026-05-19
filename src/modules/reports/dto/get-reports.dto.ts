import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsDateString,
	IsInt,
	IsNotEmpty,
	IsOptional,
	Min,
} from 'class-validator';

export class GetReportsDto {
	@ApiProperty({ description: 'ID de la compañía' })
	@IsNotEmpty()
	@Type(() => Number)
	@IsInt()
	companyId!: number;

	@ApiProperty({ description: 'ID de la sucursal' })
	@IsNotEmpty()
	@Type(() => Number)
	@IsInt()
	storeId!: number;

	@ApiPropertyOptional({ description: 'Fecha de inicio (YYYY-MM-DD)' })
	@IsOptional()
	@IsDateString()
	startDate?: string;

	@ApiPropertyOptional({ description: 'Fecha de fin (YYYY-MM-DD)' })
	@IsOptional()
	@IsDateString()
	endDate?: string;

	@ApiPropertyOptional({ description: 'Página actual', default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({ description: 'Límite por página', default: 10 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit?: number = 10;
}
