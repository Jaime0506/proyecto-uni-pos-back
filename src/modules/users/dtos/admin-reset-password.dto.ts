import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
	@ApiProperty({ description: 'ID del usuario al que se restablecerá la contraseña' })
	@IsNotEmpty()
	@IsString()
	userId!: string;

	@ApiProperty({ description: 'Nueva contraseña para el usuario' })
	@IsNotEmpty()
	@IsString()
	@MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
	newPassword!: string;
}
