import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class VerifyCustomerPasswordDto {
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

	@ApiProperty({
		description: 'Contraseña ingresada por el cliente',
		example: 'ClaveSegura123',
	})
	@IsString()
	@IsNotEmpty({ message: 'La contraseña es requerida' })
	password!: string;
}
