import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ActivateUserDto {
	@ApiProperty({ description: 'El id del usuario a reactivar' })
	@IsNotEmpty()
	@IsString()
	id_user!: string;
}
