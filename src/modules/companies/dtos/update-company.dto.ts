import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { StatusEnum } from 'src/core/status.enum';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
	@ApiProperty({ description: 'El id de la compañía' })
	@IsNotEmpty()
	@IsNumber()
	id!: number;

	@ApiPropertyOptional({
		description: 'El estado de la compañía',
		enum: StatusEnum,
		enumName: 'StatusEnum',
	})
	@IsEnum(StatusEnum)
	@IsOptional()
	status?: StatusEnum;
}
