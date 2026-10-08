import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class DeleteRoleDto {
	@ApiProperty({ description: 'The id of the role' })
	@IsNotEmpty()
	@IsNumber()
	id: number;
}
