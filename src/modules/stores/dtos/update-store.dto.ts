import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateStoreDto } from './create-store.dto';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { StatusEnum } from 'src/core/status.enum';

export class UpdateStoreDto extends PartialType(CreateStoreDto) {
	@ApiProperty({ description: 'El id de la tienda' })
	@IsNotEmpty()
	@IsNumber()
	id!: number;

	@ApiPropertyOptional({
		description: 'El estado de la tienda',
		enum: StatusEnum,
		enumName: 'StatusEnum',
	})
	@IsEnum(StatusEnum)
	@IsOptional()
	status?: StatusEnum;
}
