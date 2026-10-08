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

export class ReceptionItemDto {
	@ApiProperty({ description: 'ID del producto recibido' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	productId!: number;

	@ApiProperty({ description: 'Cantidad física recibida' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	quantityReceived!: number;

	@ApiProperty({ description: 'Costo unitario de compra' })
	@IsNotEmpty()
	@IsNumber()
	@Min(0)
	unitCost!: number;
}

export class CreateSupplierReceptionDto {
	@ApiProperty({ description: 'ID de la compañía' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	companyId!: number;

	@ApiProperty({ description: 'ID de la tienda / sucursal que recibe' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	storeId!: number;

	@ApiProperty({ description: 'ID del proveedor que entrega' })
	@IsNotEmpty()
	@IsInt()
	@Min(1)
	supplierId!: number;

	@ApiPropertyOptional({
		description:
			'ID del pedido de compra origen (opcional si es entrega directa)',
	})
	@IsOptional()
	@IsInt()
	purchaseOrderId?: number;

	@ApiProperty({
		description:
			'Número de factura o remisión física entregada por el proveedor',
	})
	@IsNotEmpty()
	@IsString()
	invoiceNumber!: string;

	@ApiPropertyOptional({
		description: 'Notas de recepción o estado del paquete',
	})
	@IsOptional()
	@IsString()
	notes?: string;

	@ApiProperty({
		description: 'Lista de productos recibidos en la entrega',
		type: [ReceptionItemDto],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ReceptionItemDto)
	items!: ReceptionItemDto[];
}
