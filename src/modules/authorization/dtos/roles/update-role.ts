import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role';
import {
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsArray,
} from 'class-validator';
import { StatusEnum } from 'src/core/status.enum';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
	@ApiProperty({ description: 'The id of the role' })
	@IsNotEmpty()
	@IsNumber()
	id: number;

	@ApiProperty({
		description: 'The status of the role',
		enum: StatusEnum,
		enumName: 'StatusEnum',
	})
	@IsEnum(StatusEnum)
	@IsOptional()
	status?: StatusEnum;

	@ApiProperty({ description: 'The permissions of the role' })
	@IsArray()
	@IsNumber({}, { each: true })
	@IsOptional()
	permissions?: number[];
}
