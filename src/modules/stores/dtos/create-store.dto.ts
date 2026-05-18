import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

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
}
