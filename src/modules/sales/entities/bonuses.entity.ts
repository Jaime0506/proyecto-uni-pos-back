import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('bonuses', { schema: 'sys' })
export class Bonus {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int', unique: true })
	customer_id!: number;

	@Column({ type: 'int', nullable: true })
	company_id?: number | null;

	@Column({ type: 'int', nullable: true })
	store_id?: number | null;

	@Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
	total_amount!: number;

	@CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
	created_at!: Date;

	@UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
	updated_at!: Date;
}
