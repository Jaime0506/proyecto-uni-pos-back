import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Min,
	ValidateNested,
} from 'class-validator';

export class PurchaseOrderItemDto {
	@ApiProperty({ description: 'ID del producto a pedir' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	productId!: number;

	@ApiProperty({ description: 'Cantidad de unidades solicitadas' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	quantityOrdered!: number;

	@ApiProperty({ description: 'Costo unitario de compra acordado' })
	@IsNotEmpty()
	@IsNumber()
	@Min(0)
	unitCost!: number;

	@ApiPropertyOptional({
		description: 'Porcentaje de IVA/impuesto (ej. 19)',
		default: 0,
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	taxRate?: number;
}

export class CreatePurchaseOrderDto {
	@ApiProperty({ description: 'ID de la compañía' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	companyId!: number;

	@ApiProperty({ description: 'ID de la tienda / sucursal destino' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	storeId!: number;

	@ApiProperty({ description: 'ID del proveedor' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	supplierId!: number;

	@ApiPropertyOptional({
		description: 'Fecha estimada de entrega (ISO string)',
	})
	@IsOptional()
	@IsString()
	expectedDeliveryDate?: string;

	@ApiPropertyOptional({ description: 'Notas u observaciones del pedido' })
	@IsOptional()
	@IsString()
	notes?: string;

	@ApiProperty({
		description: 'Lista de productos solicitados en el pedido',
		type: [PurchaseOrderItemDto],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PurchaseOrderItemDto)
	items!: PurchaseOrderItemDto[];
}
