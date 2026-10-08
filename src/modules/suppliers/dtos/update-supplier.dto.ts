import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { StatusEnum } from 'src/core/status.enum';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
	@ApiProperty({ description: 'El id del proveedor' })
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
