import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
	@ApiProperty({ description: 'Número de cédula del cliente' })
	@IsNotEmpty()
	@IsString()
	nationalId!: string;

	@ApiProperty({ description: 'ID de la empresa a la que pertenece el cliente' })
	@IsNotEmpty()
	companyId!: number;

	@ApiProperty({ description: 'ID de la tienda a la que pertenece el cliente' })
	@IsNotEmpty()
	storeId!: number;

	@ApiPropertyOptional({ description: 'Nombre(s) del cliente' })
	@IsOptional()
	@IsString()
	firstName?: string;

	@ApiPropertyOptional({ description: 'Apellido(s) del cliente' })
	@IsOptional()
	@IsString()
	lastName?: string;

	@ApiPropertyOptional({ description: 'Teléfono del cliente' })
	@IsOptional()
	@IsString()
	phone?: string;

	@ApiPropertyOptional({ description: 'Correo electrónico del cliente' })
	@IsOptional()
	@IsString()
	email?: string;
}
