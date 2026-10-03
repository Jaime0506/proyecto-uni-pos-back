import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
	@ApiPropertyOptional({
		description: 'Motivo del cierre de sesión',
		example: 'inactivity_timeout',
	})
	@IsOptional()
	@IsString()
	reason?: string;
}
