import { ApiPropertyOptional } from '@nestjs/swagger';
import {
	ArrayUnique,
	IsArray,
	IsInt,
	IsNumber,
	IsOptional,
} from 'class-validator';
import { UpdateDto } from './update.dto';

export class UpdateUserWithRoleDto extends UpdateDto {
	@ApiPropertyOptional({ description: 'El id del rol' })
	@IsOptional()
	@IsNumber()
	roleId?: number;

	@ApiPropertyOptional({ description: 'El id de la compañía' })
	@IsOptional()
	@IsNumber()
	companyId?: number;

	@ApiPropertyOptional({
		description: 'IDs de las tiendas asignadas al usuario',
		type: [Number],
	})
	@IsOptional()
	@IsArray()
	@ArrayUnique()
	@IsInt({ each: true })
	storeIds?: number[];
}
