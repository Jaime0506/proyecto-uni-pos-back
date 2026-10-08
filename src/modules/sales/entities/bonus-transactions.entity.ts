import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
} from 'typeorm';

@Entity('bonus_transactions', { schema: 'sys' })
export class BonusTransaction {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int' })
	customer_id!: number;

	@Column({ type: 'int', nullable: true })
	sale_id!: number | null;

	@Column({ type: 'int' })
	company_id!: number;

	@Column({ type: 'int' })
	store_id!: number;

	// Tipo de movimiento: EARN, REDEEM, REFUND, ADJUSTMENT
	@Column({ type: 'varchar', length: 30, default: 'EARN' })
	type!: 'EARN' | 'REDEEM' | 'REFUND' | 'ADJUSTMENT';

	// cuánto se suma o resta en esta operación
	@Column({ type: 'numeric', precision: 18, scale: 2 })
	amount!: number;

	// saldo antes del movimiento
	@Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
	previous_amount!: number;

	// saldo después del movimiento
	@Column({ type: 'numeric', precision: 18, scale: 2 })
	new_amount!: number;

	// notas explicativas para trazabilidad y auditoría
	@Column({ type: 'text', nullable: true })
	notes?: string | null;

	@CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
	created_at!: Date;
}
