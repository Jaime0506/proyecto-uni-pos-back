import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class DeleteCompanyDto {
	@ApiProperty({ description: 'El id de la compañía' })
	@IsNotEmpty()
	@IsNumber()
	id!: number;
}
