import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class GetPurchaseOrdersDto {
	@ApiPropertyOptional({ description: 'ID de la compañía' })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	companyId?: number;

	@ApiPropertyOptional({ description: 'ID de la tienda / sucursal' })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	storeId?: number;

	@ApiPropertyOptional({ description: 'ID del proveedor' })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	supplierId?: number;

	@ApiPropertyOptional({
		description: 'Estado del pedido',
		enum: PurchaseOrderStatus,
	})
	@IsOptional()
	@IsEnum(PurchaseOrderStatus)
	status?: PurchaseOrderStatus;

	@ApiPropertyOptional({ description: 'Fecha inicio filtro (YYYY-MM-DD)' })
	@IsOptional()
	@IsString()
	startDate?: string;

	@ApiPropertyOptional({ description: 'Fecha fin filtro (YYYY-MM-DD)' })
	@IsOptional()
	@IsString()
	endDate?: string;

	@ApiPropertyOptional({ description: 'Número de página', default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({ description: 'Elementos por página', default: 10 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit?: number = 10;
}
