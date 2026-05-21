import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LookupCustomerDto {
	@ApiProperty({ description: 'Número de cédula del cliente', example: '1234567890' })
	@IsString()
	@IsNotEmpty({ message: 'La cédula es requerida' })
	@MinLength(5, { message: 'La cédula debe tener al menos 5 caracteres' })
	nationalId!: string;
}
