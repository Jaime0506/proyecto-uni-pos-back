import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class DeleteCustomerDto {
	@ApiProperty({ description: 'El id del cliente a eliminar' })
	@IsNotEmpty()
	@IsNumber()
	id!: number;
}
