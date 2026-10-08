import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteDto {
	@ApiProperty({ description: 'El id del usuario' })
	@IsNotEmpty()
	@IsString()
	id_user!: string;
}
