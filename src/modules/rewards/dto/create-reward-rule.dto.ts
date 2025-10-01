import {
	IsString,
	IsOptional,
	IsBoolean,
	IsDateString,
	IsInt,
	IsArray,
	ValidateNested,
	MinLength,
	MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRewardRuleProductDto } from './create-reward-rule-product.dto';

export class CreateRewardRuleDto {
	@ApiProperty({
		description: 'Título de la regla de recompensa',
		example: 'Descuento de Verano 2024',
		minLength: 1,
		maxLength: 120,
	})
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	title: string;

	@ApiPropertyOptional({
		description: 'Descripción detallada de la regla de recompensa',
		example:
			'Promoción especial de verano con descuentos en productos seleccionados',
		maxLength: 1000,
	})
	@IsOptional()
	@IsString()
	@MaxLength(1000)
	description?: string | null;

	@ApiPropertyOptional({
		description: 'Fecha y hora de inicio de la regla de recompensa',
		example: '2024-06-01T00:00:00.000Z',
		type: 'string',
		format: 'date-time',
	})
	@IsOptional()
	@IsDateString()
	startsAt?: Date | null;

	@ApiPropertyOptional({
		description: 'Fecha y hora de fin de la regla de recompensa',
		example: '2024-08-31T23:59:59.999Z',
		type: 'string',
		format: 'date-time',
	})
	@IsOptional()
	@IsDateString()
	endsAt?: Date | null;

	@ApiPropertyOptional({
		description: 'Indica si la regla de recompensa está activa',
		example: true,
		default: true,
	})
	@IsOptional()
	@IsBoolean()
	isActive?: boolean = true;

	@ApiPropertyOptional({
		description: 'ID de la compañía asociada a la regla de recompensa',
		example: 1,
		type: 'integer',
	})
	@IsOptional()
	@IsInt()
	@Type(() => Number)
	companyId?: number | null;

	@ApiPropertyOptional({
		description: 'ID de la tienda asociada a la regla de recompensa',
		example: 1,
		type: 'integer',
	})
	@IsOptional()
	@IsInt()
	@Type(() => Number)
	storeId?: number | null;

	@ApiProperty({
		description:
			'Lista de productos con sus respectivos descuentos y cantidades',
		type: [CreateRewardRuleProductDto],
		example: [
			{
				productId: 1,
				discountValue: 10.5,
				minQty: 2,
				maxQty: 10,
			},
			{
				productId: 2,
				discountValue: 5.0,
				minQty: 1,
				maxQty: 5,
			},
		],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateRewardRuleProductDto)
	products: CreateRewardRuleProductDto[];
}
