import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	OneToMany,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	JoinColumn,
	Index,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Company } from '../../companies/entities/company.entity';
import { Store } from '../../stores/entities/store.entity';
import type { PurchaseOrderItem } from './purchase-order-item.entity';

export enum PurchaseOrderStatus {
	ORDERED = 'ORDERED',
	PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
	COMPLETED = 'COMPLETED',
	CANCELLED = 'CANCELLED',
}

@Entity({ name: 'purchase_orders', schema: 'sys' })
@Index('idx_purchase_orders_company', ['companyId'])
@Index('idx_purchase_orders_store', ['storeId'])
@Index('idx_purchase_orders_supplier', ['supplierId'])
export class PurchaseOrder {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'company_id', type: 'int' })
	companyId!: number;

	@ManyToOne(() => Company, { nullable: false })
	@JoinColumn({ name: 'company_id' })
	company!: Company;

	@Column({ name: 'store_id', type: 'int' })
	storeId!: number;

	@ManyToOne(() => Store, { nullable: false })
	@JoinColumn({ name: 'store_id' })
	store!: Store;

	@Column({ name: 'supplier_id', type: 'int' })
	supplierId!: number;

	@ManyToOne(() => Supplier, { nullable: false })
	@JoinColumn({ name: 'supplier_id' })
	supplier!: Supplier;

	@Column({ name: 'order_number', type: 'varchar', length: 50 })
	orderNumber!: string;

	@Column({
		type: 'varchar',
		length: 30,
		default: PurchaseOrderStatus.ORDERED,
	})
	status!: PurchaseOrderStatus;

	@Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
	subtotal!: number;

	@Column({
		type: 'numeric',
		precision: 18,
		scale: 4,
		default: 0,
		name: 'tax_total',
	})
	taxTotal!: number;

	@Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
	total!: number;

	@Column({ type: 'text', nullable: true })
	notes?: string;

	@Column({ name: 'user_id', type: 'varchar', length: 100, nullable: true })
	userId?: string;

	@Column({
		name: 'expected_delivery_date',
		type: 'timestamptz',
		nullable: true,
	})
	expectedDeliveryDate?: Date;

	@OneToMany('PurchaseOrderItem', 'purchaseOrder')
	items!: PurchaseOrderItem[];

	@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
	updatedAt!: Date;

	@DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
	deletedAt?: Date | null;
}
