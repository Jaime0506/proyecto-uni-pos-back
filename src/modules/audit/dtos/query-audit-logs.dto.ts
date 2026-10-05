import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAuditLogsDto {
	@ApiPropertyOptional({ description: 'Página', default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({ description: 'Límite por página', default: 20 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 20;

	@ApiPropertyOptional({ description: 'Filtrar por ID de usuario' })
	@IsOptional()
	@IsString()
	userId?: string;

	@ApiPropertyOptional({
		description: 'Filtrar por módulo (USERS, AUTH, etc.)',
	})
	@IsOptional()
	@IsString()
	module?: string;

	@ApiPropertyOptional({ description: 'Filtrar por acción' })
	@IsOptional()
	@IsString()
	action?: string;

	@ApiPropertyOptional({
		description: 'Búsqueda por texto en descripción o usuario',
	})
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({ description: 'Fecha inicio (YYYY-MM-DD)' })
	@IsOptional()
	@IsString()
	startDate?: string;

	@ApiPropertyOptional({ description: 'Fecha fin (YYYY-MM-DD)' })
	@IsOptional()
	@IsString()
	endDate?: string;
}
