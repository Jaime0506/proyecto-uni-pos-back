import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRewardRuleProductDto {
	@ApiProperty({
		description: 'ID del producto al que se aplica el descuento',
		example: 1,
		type: 'integer',
	})
	@IsInt()
	@Type(() => Number)
	productId: number;

	@ApiProperty({
		description: 'Valor del descuento a aplicar al producto',
		example: 10.5,
		type: 'number',
		minimum: 0,
	})
	@IsNumber({ maxDecimalPlaces: 4 })
	@Min(0)
	@Type(() => Number)
	discountValue: number;

	@ApiProperty({
		description:
			'Cantidad mínima de productos requerida para aplicar el descuento',
		example: 2,
		type: 'integer',
		minimum: 1,
		default: 1,
	})
	@IsInt()
	@Min(1)
	@Type(() => Number)
	minQty: number = 1;

	@ApiPropertyOptional({
		description:
			'Cantidad máxima de productos para aplicar el descuento (null = sin límite)',
		example: 10,
		type: 'integer',
		minimum: 1,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	@Type(() => Number)
	maxQty?: number | null;
}
