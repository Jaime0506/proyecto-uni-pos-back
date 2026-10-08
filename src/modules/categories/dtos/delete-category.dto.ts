import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DeleteCategoryDto {
	@ApiProperty({ description: 'ID de la compañía' })
	@IsNumber()
	@IsNotEmpty()
	@Type(() => Number)
	companyId!: number;
}
