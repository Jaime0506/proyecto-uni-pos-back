import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	CreateDateColumn,
	JoinColumn,
	Index,
} from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'stock_movements', schema: 'sys' })
@Index('stock_movements_product_idx', ['productId'])
@Index('stock_movements_store_idx', ['storeId'])
export class StockMovement {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int', name: 'product_id' })
	productId!: number;

	@ManyToOne(() => Product, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'product_id' })
	product?: Product;

	@Column({ type: 'int', name: 'company_id' })
	companyId!: number;

	@Column({ type: 'int', name: 'store_id' })
	storeId!: number;

	@Column({ type: 'varchar', length: 100, nullable: true, name: 'user_id' })
	userId?: string;

	@Column({ type: 'varchar', length: 50 })
	type!:
		| 'INITIAL'
		| 'MANUAL_ENTRY'
		| 'SALE'
		| 'ADJUSTMENT'
		| 'RETURN'
		| 'PURCHASE'
		| 'PRICE_CHANGE';

	@Column({ type: 'int' })
	quantity!: number;

	@Column({ type: 'int', name: 'previous_stock' })
	previousStock!: number;

	@Column({ type: 'int', name: 'new_stock' })
	newStock!: number;

	@Column({ type: 'text', nullable: true })
	reason?: string;

	@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
	createdAt!: Date;
}
