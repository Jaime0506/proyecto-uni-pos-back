import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
} from 'typeorm';

@Entity('sale_items', { schema: 'sys' })
export class SaleItem {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int' })
	sale_id!: number;

	@Column({ type: 'int' })
	product_id!: number;

	@Column({ type: 'int' })
	quantity!: number;

	@Column({ type: 'numeric', precision: 18, scale: 4 })
	unit_price!: number;

	@Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
	discount!: number;

	@Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
	vat_rate?: number;

	@Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
	vat_amount!: number;

	@Column({ type: 'numeric', precision: 18, scale: 4 })
	line_total!: number;
}
