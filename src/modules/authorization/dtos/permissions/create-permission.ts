import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
	@ApiProperty({ description: 'The name of the permission' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiPropertyOptional({ description: 'The description of the permission' })
	@IsString()
	@IsOptional()
	description?: string;
}
