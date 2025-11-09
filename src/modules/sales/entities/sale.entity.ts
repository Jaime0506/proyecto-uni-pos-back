import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
} from 'typeorm';

@Entity('sales', { schema: 'sys' })
export class Sale {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'int' })
	company_id: number;

	@Column({ type: 'int', nullable: true })
	campaign_id: number;

	@Column({ type: 'int' })
	store_id: number;

	@Column({ type: 'uuid', nullable: true })
	user_id?: string;

	@Column({ type: 'int', nullable: true })
	customer_id?: number;

	@Column({ type: 'varchar', length: 20, default: 'in_store' })
	channel: string;

	@Column({ type: 'varchar', length: 10, default: 'pending' })
	status: string;

	@Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
	subtotal: number;

	@Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
	tax_total: number;

	@Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
	discount_total: number;

	@Column({ type: 'numeric', precision: 18, scale: 4 })
	total: number;

	@Column({ type: 'text', nullable: true })
	notes?: string;

	@CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
	created_at: Date;

	@Column({ type: 'timestamptz', nullable: true })
	deleted_at?: Date;
}
