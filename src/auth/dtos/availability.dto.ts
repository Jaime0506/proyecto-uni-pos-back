import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AvailabilityDto {
	@ApiProperty({ description: 'El nombre de usuario o email del usuario' })
	@IsNotEmpty()
	@IsString()
	username!: string;

	@ApiProperty({ description: 'El email del usuario' })
	@IsNotEmpty()
	@IsString()
	@IsEmail()
	email!: string;

	@ApiProperty({ description: 'El numero de identificacion del usuario' })
	@IsNotEmpty()
	@IsString()
	nationalId!: string;
}
