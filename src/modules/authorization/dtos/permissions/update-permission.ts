import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreatePermissionDto } from './create-permission';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { StatusEnum } from 'src/core/status.enum';

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {
	@ApiProperty({ description: 'The id of the permission' })
	@IsNotEmpty()
	@IsNumber()
	id: number;

	@ApiProperty({
		description: 'The status of the permission',
		enum: StatusEnum,
		enumName: 'StatusEnum',
	})
	@IsEnum(StatusEnum)
	@IsOptional()
	status?: StatusEnum;
}
