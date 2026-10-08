import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
	@ApiProperty({ description: 'La contraseña actual' })
	@IsNotEmpty()
	@IsString()
	@MinLength(6)
	oldPassword!: string;

	@ApiProperty({ description: 'La nueva contraseña' })
	@IsNotEmpty()
	@IsString()
	@MinLength(6)
	newPassword!: string;
}
