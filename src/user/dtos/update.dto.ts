import { ApiProperty, PartialType } from '@nestjs/swagger';
import { RegisterDto } from '../../auth/dtos/register.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDto extends PartialType(RegisterDto) {
	@ApiProperty({ description: 'El id del usuario' })
	@IsNotEmpty()
	@IsString()
	id_user!: string;
}
