import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class DeleteStoreDto {
	@ApiProperty({ description: 'El id de la tienda a eliminar' })
	@IsNotEmpty()
	@IsNumber()
	id!: number;
}

