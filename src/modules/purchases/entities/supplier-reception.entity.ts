import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	OneToMany,
	JoinColumn,
	CreateDateColumn,
	Index,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Store } from '../../stores/entities/store.entity';
import { Company } from '../../companies/entities/company.entity';
import type { PurchaseOrder } from './purchase-order.entity';
import type { SupplierReceptionItem } from './supplier-reception-item.entity';

@Entity({ name: 'supplier_receptions', schema: 'sys' })
@Index('idx_supplier_receptions_company', ['companyId'])
@Index('idx_supplier_receptions_supplier', ['supplierId'])
@Index('idx_supplier_receptions_store', ['storeId'])
export class SupplierReception {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'company_id', type: 'int' })
	companyId!: number;

	@ManyToOne(() => Company, { nullable: false })
	@JoinColumn({ name: 'company_id' })
	company!: Company;

	@Column({ name: 'store_id', type: 'int' })
	storeId!: number;

	@ManyToOne(() => Store, { nullable: false })
	@JoinColumn({ name: 'store_id' })
	store!: Store;

	@Column({ name: 'supplier_id', type: 'int' })
	supplierId!: number;

	@ManyToOne(() => Supplier, { nullable: false })
	@JoinColumn({ name: 'supplier_id' })
	supplier!: Supplier;

	@Column({ name: 'purchase_order_id', type: 'int', nullable: true })
	purchaseOrderId?: number | null;

	@ManyToOne('PurchaseOrder', { nullable: true })
	@JoinColumn({ name: 'purchase_order_id' })
	purchaseOrder?: PurchaseOrder | null;

	@Column({ name: 'invoice_number', type: 'varchar', length: 100 })
	invoiceNumber!: string;

	@Column({ name: 'user_id', type: 'varchar', length: 100, nullable: true })
	userId?: string;

	@Column({ type: 'text', nullable: true })
	notes?: string;

	@Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
	total!: number;

	@Column({
		name: 'reception_date',
		type: 'timestamptz',
		default: () => 'NOW()',
	})
	receptionDate!: Date;

	@OneToMany('SupplierReceptionItem', 'reception')
	items!: SupplierReceptionItem[];

	@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
	createdAt!: Date;
}
