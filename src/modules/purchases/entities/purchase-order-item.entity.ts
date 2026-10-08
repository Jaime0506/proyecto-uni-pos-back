import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
} from 'typeorm';
import type { PurchaseOrder } from './purchase-order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity({ name: 'purchase_order_items', schema: 'sys' })
export class PurchaseOrderItem {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'purchase_order_id', type: 'int' })
	purchaseOrderId!: number;

	@ManyToOne('PurchaseOrder', 'items', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'purchase_order_id' })
	purchaseOrder!: PurchaseOrder;

	@Column({ name: 'product_id', type: 'int' })
	productId!: number;

	@ManyToOne(() => Product, { nullable: false })
	@JoinColumn({ name: 'product_id' })
	product!: Product;

	@Column({
		name: 'product_name',
		type: 'varchar',
		length: 255,
		nullable: true,
	})
	productName?: string;

	@Column({ name: 'quantity_ordered', type: 'int' })
	quantityOrdered!: number;

	@Column({ name: 'quantity_received', type: 'int', default: 0 })
	quantityReceived!: number;

	@Column({ name: 'unit_cost', type: 'numeric', precision: 18, scale: 4 })
	unitCost!: number;

	@Column({
		name: 'tax_rate',
		type: 'numeric',
		precision: 5,
		scale: 2,
		default: 0,
	})
	taxRate!: number;

	@Column({
		name: 'tax_amount',
		type: 'numeric',
		precision: 18,
		scale: 4,
		default: 0,
	})
	taxAmount!: number;

	@Column({ name: 'line_total', type: 'numeric', precision: 18, scale: 4 })
	lineTotal!: number;

	@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
	createdAt!: Date;
}
