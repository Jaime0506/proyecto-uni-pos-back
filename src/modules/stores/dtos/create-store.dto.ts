import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	IsInt,
	IsNumber,
	Min,
	Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStoreDto {
	@ApiProperty({ description: 'El id de la compañía' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	companyId!: number;

	@ApiProperty({ description: 'El nombre de la tienda' })
	@IsNotEmpty()
	@IsString()
	name!: string;

	@ApiPropertyOptional({ description: 'El NIT de la tienda (opcional)' })
	@IsOptional()
	@IsString()
	nit?: string;

	@ApiPropertyOptional({ description: 'La dirección de la tienda' })
	@IsOptional()
	@IsString()
	address?: string;

	@ApiPropertyOptional({ description: 'El teléfono de la tienda' })
	@IsOptional()
	@IsString()
	phone?: string;

	@ApiPropertyOptional({ description: 'El email de la tienda' })
	@IsOptional()
	// @IsEmail()
	email?: string;

	@ApiPropertyOptional({
		description: 'Porcentaje de IVA por defecto de la tienda (0 a 100)',
		example: 19,
		default: 19,
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100)
	@Type(() => Number)
	ivaPercentage?: number;
}
