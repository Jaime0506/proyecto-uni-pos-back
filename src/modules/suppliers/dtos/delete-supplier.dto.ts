import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class DeleteSupplierDto {
	@ApiProperty({ description: 'El id del proveedor a eliminar' })
	@IsNotEmpty()
	@IsNumber()
	id!: number;
}
