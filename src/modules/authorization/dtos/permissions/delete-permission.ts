import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class DeletePermissionDto {
	@ApiProperty({ description: 'The id of the permission' })
	@IsNotEmpty()
	@IsNumber()
	id: number;
}
