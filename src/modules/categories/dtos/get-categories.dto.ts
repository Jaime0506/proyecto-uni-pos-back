import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class GetCategoriesDto {
	@ApiProperty({ description: 'ID de la compañía' })
	@IsNotEmpty()
	@Type(() => Number)
	@IsInt()
	companyId!: number;

	@ApiPropertyOptional({
		description: 'ID del padre para buscar subcategorías específicas',
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	parentId?: number;
}
