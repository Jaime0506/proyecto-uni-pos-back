import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	IsNumber,
	IsArray,
} from 'class-validator';

export class CreateRoleDto {
	@ApiProperty({ description: 'The company id of the role' })
	@IsNumber()
	@IsNotEmpty()
	companyId: number;

	@ApiProperty({ description: 'The name of the role' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiPropertyOptional({ description: 'The description of the role' })
	@IsString()
	@IsOptional()
	description?: string;

	@ApiPropertyOptional({ description: 'The permissions of the role' })
	@IsArray()
	@IsNumber({}, { each: true })
	@IsOptional()
	permissions?: number[];
}
