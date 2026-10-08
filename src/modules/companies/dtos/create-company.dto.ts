import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	IsEmail,
	IsInt,
	Min,
} from 'class-validator';

export class CreateCompanyDto {
	@ApiProperty({ description: 'El nombre de la compañía' })
	@IsNotEmpty()
	@IsString()
	name!: string;

	@ApiProperty({ description: 'El NIT de la compañía' })
	@IsNotEmpty()
	@IsString()
	nit!: string;

	@ApiPropertyOptional({ description: 'La dirección de la compañía' })
	@IsOptional()
	@IsString()
	address?: string;

	@ApiPropertyOptional({ description: 'El DNS de la compañía' })
	@IsOptional()
	@IsString()
	dns?: string;

	@ApiPropertyOptional({ description: 'El teléfono de la compañía' })
	@IsOptional()
	@IsString()
	phone?: string;

	@ApiPropertyOptional({ description: 'El email de la compañía' })
	@IsOptional()
	@IsEmail()
	email?: string;

	@ApiPropertyOptional({
		description: 'El número máximo de tiendas permitidas',
		default: 1,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	maxStores?: number;
}
