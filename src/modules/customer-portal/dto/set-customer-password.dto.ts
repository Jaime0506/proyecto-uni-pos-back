import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, MinLength } from 'class-validator';

export class SetCustomerPasswordDto {
	@ApiProperty({ description: 'ID del cliente', example: 1 })
	@IsInt()
	@IsPositive()
	customerId!: number;

	@ApiProperty({ description: 'ID de la empresa', example: 1 })
	@IsInt()
	@IsPositive()
	companyId!: number;

	@ApiProperty({ description: 'ID de la tienda', example: 1 })
	@IsInt()
	@IsPositive()
	storeId!: number;

	@ApiProperty({ description: 'Contraseña elegida por el cliente (mínimo 6 caracteres)', example: 'ClaveSegura123' })
	@IsString()
	@IsNotEmpty({ message: 'La contraseña es requerida' })
	@MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
	password!: string;
}
