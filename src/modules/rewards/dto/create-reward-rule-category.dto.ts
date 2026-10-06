import { IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRewardRuleCategoryDto {
	@ApiProperty({
		description: 'ID de la categoría a la que se aplica la bonificación',
		example: 1,
		type: 'integer',
	})
	@IsInt()
	@Type(() => Number)
	categoryId: number;

	@ApiPropertyOptional({
		description:
			'Porcentaje de bonificación sobre los productos de la categoría (ej: 5 para 5%)',
		example: 5.0,
		type: 'number',
		minimum: 0,
		maximum: 100,
	})
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(0)
	@Max(100)
	@Type(() => Number)
	discountPercentage?: number | null;

	@ApiPropertyOptional({
		description: 'Valor fijo nominal de bonificación por unidad vendida de la categoría',
		example: 500,
		type: 'number',
		minimum: 0,
	})
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 4 })
	@Min(0)
	@Type(() => Number)
	discountValue?: number | null;

	@ApiProperty({
		description:
			'Cantidad mínima de productos de la categoría requerida para aplicar la bonificación',
		example: 1,
		type: 'integer',
		minimum: 1,
		default: 1,
	})
	@IsInt()
	@Min(1)
	@Type(() => Number)
	minQty: number = 1;
}
