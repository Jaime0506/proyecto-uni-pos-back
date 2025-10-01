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
import { Company } from 'src/modules/companies/entities/company.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { User } from 'src/core/users/user.entity';
import { RewardRuleProduct } from './reward-rule-product.entity';

@Entity({ schema: 'sys', name: 'reward_rules' })
@Index('ix_reward_rules_company_active_dates', [
	'companyId',
	'isActive',
	'startsAt',
	'endsAt',
])
@Index('ix_reward_rules_store_id', ['storeId'])
export class RewardRule {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: 'company_id', type: 'int', nullable: true })
	companyId?: number | null;

	@ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'company_id' })
	company?: Company | null;

	@Column({ name: 'title', type: 'varchar', length: 120 })
	title: string;

	@Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
	startsAt?: Date | null;

	@Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
	endsAt?: Date | null;

	@Column({ name: 'is_active', type: 'boolean', default: () => 'true' })
	isActive: boolean;

	@CreateDateColumn({
		type: 'timestamptz',
		name: 'created_at',
		default: () => 'now()',
	})
	createdAt: Date;

	@Column({ name: 'store_id', type: 'int', nullable: true })
	storeId?: number | null;

	@ManyToOne(() => Store, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'store_id' })
	store?: Store | null;

	@Column({ name: 'created_by', type: 'uuid', nullable: true })
	createdBy?: string | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'created_by' })
	createdByUser?: User | null;

	@Column({ name: 'description', type: 'text', nullable: true })
	description?: string | null;

	@DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
	deletedAt?: Date | null;

	@UpdateDateColumn({
		type: 'timestamptz',
		name: 'updated_at',
		default: () => 'now()',
	})
	updatedAt: Date;

	@OneToMany(() => RewardRuleProduct, (rrp) => rrp.rewardRule, {
		cascade: false,
	})
	products?: RewardRuleProduct[];
}
