import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
	@ApiProperty({
		description: 'El nombre de usuario del usuario',
	})
	@IsNotEmpty()
	@IsString()
	userName!: string;

	@ApiProperty({ description: 'La contraseña del usuario' })
	@IsNotEmpty()
	@IsString()
	@MinLength(6)
	password!: string;

	// opcionales para auditoría
	@IsOptional()
	@ApiPropertyOptional({ description: 'El ID del dispositivo del usuario' })
	deviceId?: string;

	@IsOptional()
	@ApiPropertyOptional({ description: 'El ID de la empresa del usuario' })
	companyId?: number; // contexto tenant (opcional)
}
