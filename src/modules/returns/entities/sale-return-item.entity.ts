import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
	Index,
} from 'typeorm';
import type { SaleReturn } from './sale-return.entity';
import { SaleItem } from '../../sales/entities/sale-items.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('sale_return_items', { schema: 'sys' })
@Index('idx_return_items_return_id', ['saleReturnId'])
@Index('idx_return_items_sale_item', ['saleItemId'])
@Index('idx_return_items_product', ['productId'])
export class SaleReturnItem {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int', name: 'sale_return_id' })
	saleReturnId!: number;

	@ManyToOne('SaleReturn', 'items', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sale_return_id' })
	saleReturn?: SaleReturn;

	@Column({ type: 'int', name: 'sale_item_id' })
	saleItemId!: number;

	@ManyToOne(() => SaleItem, { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'sale_item_id' })
	saleItem?: SaleItem;

	@Column({ type: 'int', name: 'product_id' })
	productId!: number;

	@ManyToOne(() => Product, { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'product_id' })
	product?: Product;

	@Column({ type: 'varchar', length: 255, name: 'product_name' })
	productName!: string;

	@Column({ type: 'int' })
	quantity!: number;

	@Column({ type: 'numeric', precision: 18, scale: 4, name: 'unit_price' })
	unitPrice!: number;

	@Column({
		type: 'numeric',
		precision: 18,
		scale: 4,
		default: 0,
		name: 'discount_unit',
	})
	discountUnit!: number;

	@Column({
		type: 'numeric',
		precision: 5,
		scale: 2,
		default: 0,
		name: 'tax_rate',
	})
	taxRate!: number;

	@Column({
		type: 'numeric',
		precision: 18,
		scale: 4,
		default: 0,
		name: 'tax_amount',
	})
	taxAmount!: number;

	@Column({ type: 'numeric', precision: 18, scale: 4, name: 'line_subtotal' })
	lineSubtotal!: number;

	@Column({
		type: 'numeric',
		precision: 18,
		scale: 4,
		name: 'line_total_refund',
	})
	lineTotalRefund!: number;

	@Column({
		type: 'varchar',
		length: 50,
		default: 'SEALED_NEW',
		name: 'item_condition',
	})
	itemCondition!: string;

	@Column({ type: 'varchar', length: 255, nullable: true, name: 'item_reason' })
	itemReason?: string | null;

	@Column({ type: 'boolean', default: true, name: 'restock_approved' })
	restockApproved!: boolean;

	@CreateDateColumn({
		type: 'timestamptz',
		default: () => 'now()',
		name: 'created_at',
	})
	createdAt!: Date;
}
