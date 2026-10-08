import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	OneToMany,
	JoinColumn,
	Index,
} from 'typeorm';
import { Sale } from '../../sales/entities/sale.entity';
import { Company } from '../../companies/entities/company.entity';
import { Store } from '../../stores/entities/store.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { ReturnPolicy } from './return-policy.entity';
import type { SaleReturnItem } from './sale-return-item.entity';

@Entity('sale_returns', { schema: 'sys' })
@Index('idx_sale_returns_sale_id', ['saleId'])
@Index('idx_sale_returns_store_status', ['storeId', 'status'])
@Index('idx_sale_returns_customer', ['customerId'])
@Index('idx_sale_returns_created_at', ['createdAt'])
export class SaleReturn {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar', length: 50, unique: true, name: 'return_number' })
	returnNumber!: string;

	@Column({ type: 'int', name: 'sale_id' })
	saleId!: number;

	@ManyToOne(() => Sale, { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'sale_id' })
	sale?: Sale;

	@Column({ type: 'int', name: 'company_id' })
	companyId!: number;

	@ManyToOne(() => Company, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'company_id' })
	company?: Company;

	@Column({ type: 'int', name: 'store_id' })
	storeId!: number;

	@ManyToOne(() => Store, { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'store_id' })
	store?: Store;

	@Column({ type: 'int', nullable: true, name: 'customer_id' })
	customerId?: number | null;

	@ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'customer_id' })
	customer?: Customer | null;

	@Column({ type: 'int', nullable: true, name: 'policy_id' })
	policyId?: number | null;

	@ManyToOne(() => ReturnPolicy, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'policy_id' })
	policy?: ReturnPolicy | null;

	@Column({
		type: 'varchar',
		length: 30,
		default: 'PENDING_REVIEW',
		name: 'status',
	})
	status!:
		'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

	@Column({ type: 'varchar', length: 30, default: 'IN_STORE', name: 'channel' })
	channel!: string;

	@Column({ type: 'uuid', nullable: true, name: 'requested_by_user_id' })
	requestedByUserId?: string | null;

	@Column({ type: 'uuid', nullable: true, name: 'reviewed_by_user_id' })
	reviewedByUserId?: string | null;

	@Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
	reviewedAt?: Date | null;

	@Column({ type: 'varchar', length: 50, name: 'reason_category' })
	reasonCategory!: string;

	@Column({ type: 'text', nullable: true, name: 'customer_notes' })
	customerNotes?: string | null;

	@Column({ type: 'text', nullable: true, name: 'review_notes' })
	reviewNotes?: string | null;

	@Column({ type: 'text', nullable: true, name: 'rejection_reason' })
	rejectionReason?: string | null;

	@Column({
		type: 'numeric',
		precision: 18,
		scale: 4,
		default: 0,
		name: 'subtotal_refund',
	})
	subtotalRefund!: number;

	@Column({
		type: 'numeric',
		precision: 18,
		scale: 4,
		default: 0,
		name: 'tax_refund',
	})
	taxRefund!: number;

	@Column({
		type: 'numeric',
		precision: 18,
		scale: 4,
		default: 0,
		name: 'discount_adjustment',
	})
	discountAdjustment!: number;

	@Column({
		type: 'numeric',
		precision: 18,
		scale: 4,
		default: 0,
		name: 'total_refund',
	})
	totalRefund!: number;

	@Column({
		type: 'varchar',
		length: 20,
		nullable: true,
		name: 'refund_method',
	})
	refundMethod?: 'CASH' | 'BONUS' | null;

	@Column({
		type: 'varchar',
		length: 30,
		default: 'PENDING',
		name: 'refund_status',
	})
	refundStatus!: string;

	@Column({
		type: 'varchar',
		length: 100,
		nullable: true,
		name: 'refund_reference',
	})
	refundReference?: string | null;

	@OneToMany('SaleReturnItem', 'saleReturn', { cascade: true })
	items!: SaleReturnItem[];

	@CreateDateColumn({
		type: 'timestamptz',
		default: () => 'now()',
		name: 'created_at',
	})
	createdAt!: Date;

	@UpdateDateColumn({
		type: 'timestamptz',
		default: () => 'now()',
		name: 'updated_at',
	})
	updatedAt!: Date;
}
