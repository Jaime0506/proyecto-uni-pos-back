import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Store } from '../../stores/entities/store.entity';

@Entity('return_policies', { schema: 'sys' })
@Index('idx_return_policies_lookup', ['companyId', 'storeId', 'isActive'])
export class ReturnPolicy {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int', name: 'company_id' })
	companyId!: number;

	@ManyToOne(() => Company, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'company_id' })
	company?: Company;

	@Column({ type: 'int', nullable: true, name: 'store_id' })
	storeId?: number | null;

	@ManyToOne(() => Store, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'store_id' })
	store?: Store | null;

	@Column({ type: 'varchar', length: 100 })
	name!: string;

	@Column({ type: 'text', nullable: true })
	description?: string;

	@Column({ type: 'int', default: 7, name: 'max_days_allowed' })
	maxDaysAllowed!: number;

	@Column({ type: 'boolean', default: true, name: 'allow_partial_returns' })
	allowPartialReturns!: boolean;

	@Column({ type: 'boolean', default: true, name: 'requires_original_receipt' })
	requiresOriginalReceipt!: boolean;

	@Column({ type: 'boolean', default: false, name: 'allow_opened_box' })
	allowOpenedBox!: boolean;

	@Column({ type: 'boolean', default: true, name: 'require_approval' })
	requireApproval!: boolean;

	@Column({
		type: 'varchar',
		length: 50,
		default: 'CASH,BONUS',
		name: 'allowed_refund_methods',
	})
	allowedRefundMethods!: string;

	@Column({ type: 'boolean', default: true, name: 'is_active' })
	isActive!: boolean;

	@CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'updated_at' })
	updatedAt!: Date;
}
