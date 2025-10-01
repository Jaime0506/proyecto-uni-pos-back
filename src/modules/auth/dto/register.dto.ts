import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsPhoneNumber,
	IsString,
	MinLength,
} from 'class-validator';

export class RegisterDto {
	@ApiProperty({ description: 'El nombre de usuario del usuario' })
	@IsNotEmpty()
	@IsString()
	firstName!: string;

	@ApiProperty({ description: 'El apellido del usuario' })
	@IsNotEmpty()
	@IsString()
	lastName!: string;

	@ApiProperty({ description: 'El correo electrónico del usuario' })
	@IsNotEmpty()
	@IsString()
	@IsEmail()
	email!: string;

	@ApiProperty({ description: 'El numero de identificacion del' })
	@IsNotEmpty()
	@IsString()
	nationalId!: string;

	@ApiProperty({ description: 'La contraseña del usuario' })
	@IsNotEmpty()
	@IsString()
	@MinLength(6)
	password!: string;

	@ApiPropertyOptional({ description: 'El numero de telefono del usuario' })
	@IsOptional()
	@IsString()
	@IsPhoneNumber()
	phoneNumber?: string;
}
