import { OmitType, PartialType, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(
	OmitType(CreateCategoryDto, ['companyId'] as const),
) {
	@ApiProperty({
		description: 'ID de la compañía requerida para validación y caché',
	})
	@IsInt()
	@IsNotEmpty()
	companyId!: number;
}
