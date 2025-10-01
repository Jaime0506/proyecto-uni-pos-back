import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetAllProductsDto {
	@ApiProperty({ description: 'El id de la empresa para pruebas el 1' })
	@IsNotEmpty()
	@IsNumber()
	companyId: number;
}
