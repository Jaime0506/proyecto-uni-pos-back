import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsIn,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsPositive,
	IsString,
	ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnItemInputDto {
	@ApiProperty({ description: 'ID del ítem de venta original (sale_items.id)' })
	@IsInt()
	@IsNotEmpty()
	saleItemId!: number;

	@ApiProperty({ description: 'ID del producto' })
	@IsInt()
	@IsNotEmpty()
	productId!: number;

	@ApiProperty({
		description: 'Cantidad específica a devolver de este producto',
	})
	@IsInt()
	@IsPositive()
	quantity!: number;

	@ApiProperty({
		description: 'Condición física del producto devuelto',
		enum: [
			'SEALED_NEW',
			'OPEN_BOX_GOOD',
			'DEFECTIVE_FACTORY',
			'DAMAGED_CUSTOMER',
		],
	})
	@IsString()
	@IsIn([
		'SEALED_NEW',
		'OPEN_BOX_GOOD',
		'DEFECTIVE_FACTORY',
		'DAMAGED_CUSTOMER',
	])
	itemCondition!: string;

	@ApiProperty({
		description:
			'Indica si el producto es apto para reingresar al inventario vendible',
		default: true,
	})
	@IsBoolean()
	restockApproved!: boolean;

	@ApiPropertyOptional({
		description: 'Motivo u observación específica de este producto',
	})
	@IsString()
	@IsOptional()
	itemReason?: string;
}

export class CreateReturnRequestDto {
	@ApiProperty({
		description: 'ID de la venta a la cual pertenece la devolución',
	})
	@IsInt()
	@IsNotEmpty()
	saleId!: number;

	@ApiProperty({ description: 'ID de la empresa' })
	@IsInt()
	@IsNotEmpty()
	companyId!: number;

	@ApiProperty({ description: 'ID de la tienda' })
	@IsInt()
	@IsNotEmpty()
	storeId!: number;

	@ApiProperty({
		description: 'Categoría principal del motivo de la devolución',
		example: 'DEFECTIVE_PRODUCT',
	})
	@IsString()
	@IsNotEmpty()
	reasonCategory!: string;

	@ApiProperty({
		description: 'Método de reembolso seleccionado (únicamente CASH o BONUS)',
		enum: ['CASH', 'BONUS'],
	})
	@IsString()
	@IsIn(['CASH', 'BONUS'])
	preferredRefundMethod!: 'CASH' | 'BONUS';

	@ApiPropertyOptional({
		description: 'Notas o comentarios manifestados por el cliente',
	})
	@IsString()
	@IsOptional()
	customerNotes?: string;

	@ApiProperty({
		description: 'Lista granular producto por producto a devolver',
		type: [ReturnItemInputDto],
	})
	@IsArray()
	@ArrayMinSize(1, {
		message: 'Debe seleccionar al menos un producto para la devolución.',
	})
	@ValidateNested({ each: true })
	@Type(() => ReturnItemInputDto)
	items!: ReturnItemInputDto[];
}
