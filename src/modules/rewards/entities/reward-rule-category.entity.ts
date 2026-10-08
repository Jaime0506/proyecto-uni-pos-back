import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	CreateDateColumn,
	UpdateDateColumn,
	JoinColumn,
	Unique,
	Check,
	Index,
} from 'typeorm';
import { Category } from 'src/modules/categories/entities/category.entity';

const numericToNumber = {
	to: (value: number | null) => value,
	from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity({ schema: 'sys', name: 'reward_rule_categories' })
@Unique('ux_reward_rule_category_unique', ['rewardRuleId', 'categoryId'])
@Index('ix_reward_rule_categories_category_id', ['categoryId'])
@Index('ix_reward_rule_categories_reward_rule_id', ['rewardRuleId'])
@Check(
	'chk_rrc_discount_nonneg',
	'(discount_percentage IS NULL OR discount_percentage >= 0) AND (discount_value IS NULL OR discount_value >= 0)',
)
export class RewardRuleCategory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: 'reward_rule_id', type: 'int' })
	rewardRuleId: number;

	@ManyToOne('RewardRule', { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'reward_rule_id' })
	rewardRule: any;

	@Column({ name: 'category_id', type: 'int' })
	categoryId: number;

	@ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'category_id' })
	category: Category;

	@Column({
		name: 'discount_percentage',
		type: 'numeric',
		precision: 5,
		scale: 2,
		nullable: true,
		transformer: numericToNumber,
	})
	discountPercentage?: number | null;

	@Column({
		name: 'discount_value',
		type: 'numeric',
		precision: 12,
		scale: 4,
		nullable: true,
		transformer: numericToNumber,
	})
	discountValue?: number | null;

	@Column({ name: 'min_qty', type: 'int', default: 1 })
	minQty: number;

	@Column({ name: 'max_qty', type: 'int', nullable: true })
	maxQty?: number | null;

	@CreateDateColumn({
		type: 'timestamptz',
		name: 'created_at',
		default: () => 'now()',
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: 'timestamptz',
		name: 'updated_at',
		nullable: true,
		default: () => 'now()',
	})
	updatedAt?: Date | null;
}
