import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsPositive,
	ValidateNested,
} from 'class-validator';

export class CreateSaleItemDto {
	@ApiProperty({ description: 'ID del producto' })
	@IsNotEmpty()
	@IsNumber()
	id!: number;

	@ApiProperty({ description: 'Cantidad vendida' })
	@IsNotEmpty()
	@IsNumber()
	@IsPositive()
	quantity!: number;

	@ApiProperty({ description: 'Precio unitario de venta' })
	@IsNotEmpty()
	@IsNumber()
	unit_price!: number;

	@ApiProperty({ description: 'Total de la línea (precio * cantidad)' })
	@IsNotEmpty()
	@IsNumber()
	line_total!: number;

	@ApiPropertyOptional({
		description: 'Tasa porcentual de IVA aplicada (ej: 19 o 0)',
	})
	@IsOptional()
	@IsNumber()
	vat_rate?: number;

	@ApiPropertyOptional({
		description: 'Monto de IVA liquidado para esta línea',
	})
	@IsOptional()
	@IsNumber()
	vat_amount?: number;
}

export class CreateSaleDto {
	@ApiProperty({ description: 'ID de la empresa' })
	@IsNotEmpty()
	@IsNumber()
	companyId!: number;

	@ApiProperty({ description: 'ID de la tienda' })
	@IsNotEmpty()
	@IsNumber()
	storeId!: number;

	@ApiPropertyOptional({
		description: 'ID del cliente (opcional para venta anónima)',
	})
	@IsOptional()
	@IsNumber()
	customerId?: number | null;

	@ApiPropertyOptional({ description: 'ID de la campaña aplicada (opcional)' })
	@IsOptional()
	@IsNumber()
	campaignId?: number | null;

	@ApiProperty({
		description: 'Lista de productos seleccionados en la venta',
		type: [CreateSaleItemDto],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateSaleItemDto)
	products!: CreateSaleItemDto[];

	@ApiPropertyOptional({ description: 'Subtotal base antes de impuestos' })
	@IsOptional()
	@IsNumber()
	subtotal?: number;

	@ApiPropertyOptional({ description: 'Total consolidado de impuestos (IVA)' })
	@IsOptional()
	@IsNumber()
	tax_total?: number;

	@ApiProperty({ description: 'Total de la venta' })
	@IsNotEmpty()
	@IsNumber()
	total!: number;

	@ApiPropertyOptional({
		description: 'Total de descuento o bonificación aplicada',
	})
	@IsOptional()
	@IsNumber()
	discount_total?: number;

	@ApiPropertyOptional({
		description: 'Indica si el cliente reclama su saldo de bonos',
	})
	@IsOptional()
	@IsBoolean()
	claimBonus?: boolean;

	@ApiPropertyOptional({
		description: 'Método de pago utilizado',
		enum: ['cash', 'transfer', 'qr', 'card'],
		default: 'cash',
	})
	@IsOptional()
	@IsIn(['cash', 'transfer', 'qr', 'card'])
	payment_method?: string;

	@ApiPropertyOptional({
		description: 'Monto entregado por el cliente en efectivo',
	})
	@IsOptional()
	@IsNumber()
	amount_paid?: number;

	@ApiPropertyOptional({
		description: 'Cambio o vueltos entregados al cliente',
	})
	@IsOptional()
	@IsNumber()
	change_given?: number;
}
