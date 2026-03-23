import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
	@ApiProperty({ description: 'Nombre de la categoría', example: 'Bebidas' })
	@IsString()
	@IsNotEmpty()
	name!: string;

	@ApiProperty({ description: 'ID de la compañía' })
	@IsInt()
	@IsNotEmpty()
	companyId!: number;

	@ApiPropertyOptional({
		description: 'ID de la categoría padre, para subcategorías',
		example: 1,
	})
	@IsOptional()
	@IsInt()
	parentId?: number;
}
