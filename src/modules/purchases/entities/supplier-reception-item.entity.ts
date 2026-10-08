import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
} from 'typeorm';
import type { SupplierReception } from './supplier-reception.entity';
import { Product } from '../../products/entities/product.entity';

@Entity({ name: 'supplier_reception_items', schema: 'sys' })
export class SupplierReceptionItem {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'reception_id', type: 'int' })
	receptionId!: number;

	@ManyToOne('SupplierReception', 'items', {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'reception_id' })
	reception!: SupplierReception;

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

	@Column({ name: 'quantity_received', type: 'int' })
	quantityReceived!: number;

	@Column({ name: 'unit_cost', type: 'numeric', precision: 18, scale: 4 })
	unitCost!: number;

	@Column({ name: 'line_total', type: 'numeric', precision: 18, scale: 4 })
	lineTotal!: number;

	@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
	createdAt!: Date;
}
