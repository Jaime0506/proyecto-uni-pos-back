import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { UpdateDto } from './update.dto';

export class UpdateUserWithRoleDto extends UpdateDto {
	@ApiPropertyOptional({ description: 'El id del rol' })
	@IsOptional()
	@IsNumber()
	roleId?: number;
}
