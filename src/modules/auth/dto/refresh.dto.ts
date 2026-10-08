import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
	@ApiProperty({ description: 'El token de refresco' })
	@IsNotEmpty()
	@IsString()
	refreshToken!: string;
}
