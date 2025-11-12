import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';

export class CreateUserWithRoleDto extends RegisterDto {
	@ApiProperty({ description: 'El id del rol' })
	@IsOptional()
	@IsNumber()
	roleId!: number;

	@ApiPropertyOptional({ description: 'El id de la compañía' })
	@IsOptional()
	@IsNumber()
	companyId!: number;
}
