import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetAllSalesDto {
	@ApiProperty({ description: 'El id de la empresa' })
	@IsNotEmpty()
	@IsNumber()
	companyId: number;

	@ApiProperty({ description: 'El id de la tienda' })
	@IsNotEmpty()
	@IsNumber()
	storeId: number;

	@ApiPropertyOptional({ description: 'Fecha de inicio del rango (YYYY-MM-DD)' })
	@IsOptional()
	@IsString()
	startDate?: string;

	@ApiPropertyOptional({ description: 'Fecha de fin del rango (YYYY-MM-DD)' })
	@IsOptional()
	@IsString()
	endDate?: string;

	@ApiPropertyOptional({
		description: 'Texto de búsqueda por número de factura (ID) o cliente (cédula/nombre)',
	})
	@IsOptional()
	@IsString()
	search?: string;
}

