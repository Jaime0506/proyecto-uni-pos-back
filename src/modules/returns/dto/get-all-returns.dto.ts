import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetAllReturnsDto {
	@ApiProperty({ description: 'ID de la empresa' })
	@Type(() => Number)
	@IsInt()
	companyId!: number;

	@ApiPropertyOptional({ description: 'ID de la tienda' })
	@Type(() => Number)
	@IsInt()
	@IsOptional()
	storeId?: number;

	@ApiPropertyOptional({
		description: 'Estado de la devolución',
		enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
	})
	@IsString()
	@IsOptional()
	status?: string;

	@ApiPropertyOptional({ description: 'Fecha de inicio (YYYY-MM-DD)' })
	@IsString()
	@IsOptional()
	startDate?: string;

	@ApiPropertyOptional({ description: 'Fecha de fin (YYYY-MM-DD)' })
	@IsString()
	@IsOptional()
	endDate?: string;

	@ApiPropertyOptional({
		description: 'Término de búsqueda (consecutivo, # venta, cédula)',
	})
	@IsString()
	@IsOptional()
	search?: string;

	@ApiPropertyOptional({ description: 'ID de cliente para filtrar' })
	@Type(() => Number)
	@IsInt()
	@IsOptional()
	customerId?: number;
}
