import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	Index,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	JoinColumn,
} from 'typeorm';
import { Company } from 'src/modules/companies/entities/company.entity';
import { ProductCategory } from './product-category.entity';

@Entity({ name: 'products', schema: 'sys' })
@Index('products_company_name_idx', ['company', 'name'])
@Index('products_company_barcode_idx', ['company', 'barcode'])
export class Product {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(() => Company, { nullable: false })
	@JoinColumn({ name: 'company_id' })
	company!: Company;

	@ManyToOne(() => ProductCategory, { nullable: true })
	@JoinColumn({ name: 'category_id' })
	category!: ProductCategory;

	@Column({ type: 'varchar', length: 255 })
	name!: string;

	@Column({ type: 'varchar', length: 80, nullable: true })
	sku!: string;

	@Column({ type: 'varchar', length: 80, nullable: true })
	barcode!: string;

	@Column({ type: 'numeric', precision: 18, scale: 4, name: 'purchase_price' })
	purchasePrice!: number;

	@Column({ type: 'numeric', precision: 18, scale: 4, name: 'sale_price' })
	salePrice!: number;

	@Column({ type: 'boolean', default: false, name: 'tax_exempt' })
	taxExempt!: boolean;

	@Column({ type: 'int', default: 0 })
	stock!: number;

	@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
	createdAt!: Date;

	@UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
	updatedAt!: Date;

	@DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
	deletedAt!: Date | null;

	@Column({ type: 'text' })
	image!: string;

	@Column({ type: 'int', nullable: true, name: 'store_id' })
	storeId!: number;
}
