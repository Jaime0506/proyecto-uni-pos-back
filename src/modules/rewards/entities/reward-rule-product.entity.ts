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
import { RewardRule } from './reward-rule.entity';
import { Product } from 'src/modules/products/entities/product.entity';

const numericToNumber = {
	to: (value: number | null) => value,
	from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity({ schema: 'sys', name: 'reward_rule_products' })
@Unique('ux_reward_rule_product_unique', ['rewardRuleId', 'productId'])
@Index('ix_reward_rule_products_product_id', ['productId'])
@Index('ix_reward_rule_products_reward_rule_id', ['rewardRuleId'])
@Check('chk_rrp_discount_nonneg', '"discount_value" >= 0')
export class RewardRuleProduct {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: 'reward_rule_id', type: 'int' })
	rewardRuleId: number;

	@ManyToOne(() => RewardRule, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'reward_rule_id' })
	rewardRule: RewardRule;

	@Column({ name: 'product_id', type: 'int' })
	productId: number;

	@ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'product_id' })
	product: Product;

	@Column({
		name: 'discount_value',
		type: 'numeric',
		precision: 12,
		scale: 4,
		transformer: numericToNumber,
	})
	discountValue: number;

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
		default: () => 'now()',
	})
	updatedAt: Date;
}
