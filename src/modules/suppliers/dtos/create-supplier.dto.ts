import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	IsEmail,
	IsInt,
	Min,
} from 'class-validator';

export class CreateSupplierDto {
	@ApiProperty({ description: 'El id de la compañía' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	companyId!: number;

	@ApiProperty({ description: 'El nombre del proveedor' })
	@IsNotEmpty()
	@IsString()
	name!: string;

	@ApiPropertyOptional({ description: 'El nombre de contacto del proveedor' })
	@IsOptional()
	@IsString()
	contactName?: string;

	@ApiPropertyOptional({ description: 'El teléfono del proveedor' })
	@IsOptional()
	@IsString()
	phone?: string;

	@ApiPropertyOptional({ description: 'El email del proveedor' })
	@IsOptional()
	@IsEmail()
	email?: string;

	@ApiPropertyOptional({ description: 'La dirección del proveedor' })
	@IsOptional()
	@IsString()
	address?: string;
}
