import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	IsEmail,
	IsInt,
	Min,
	MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
	@ApiProperty({ description: 'El id de la compañía' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	companyId!: number;

	@ApiProperty({
		description: 'El número de identificación nacional del cliente',
	})
	@IsNotEmpty()
	@IsString()
	@MaxLength(20)
	nationalId!: string;

	@ApiPropertyOptional({ description: 'El nombre del cliente' })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	firstName?: string;

	@ApiPropertyOptional({ description: 'El apellido del cliente' })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	lastName?: string;

	@ApiPropertyOptional({ description: 'El teléfono del cliente' })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	phone?: string;

	@ApiPropertyOptional({ description: 'El email del cliente' })
	@IsOptional()
	@IsEmail()
	@MaxLength(255)
	email?: string;
}
