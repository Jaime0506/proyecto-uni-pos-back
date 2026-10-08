import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
	@ApiProperty({ description: 'El id del cliente' })
	@IsNotEmpty()
	@IsNumber()
	id!: number;
}
