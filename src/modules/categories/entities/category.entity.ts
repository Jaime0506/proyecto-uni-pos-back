import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	ManyToOne,
	JoinColumn,
	OneToMany,
	Unique,
} from 'typeorm';
import { Company } from 'src/modules/companies/entities/company.entity';

@Entity({ name: 'product_categories', schema: 'sys' })
@Unique(['companyId', 'name'])
export class Category {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ name: 'company_id', type: 'int' })
	companyId!: number;

	@ManyToOne(() => Company)
	@JoinColumn({ name: 'company_id' })
	company!: Company;

	@Column({ type: 'varchar', length: 120 })
	name!: string;

	@Column({ name: 'parent_id', type: 'int', nullable: true })
	parentId!: number | null;

	@ManyToOne(() => Category, (category) => category.children)
	@JoinColumn({ name: 'parent_id' })
	parent!: Category;

	@OneToMany(() => Category, (category) => category.parent)
	children!: Category[];

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
	updatedAt!: Date;

	@DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
	deletedAt!: Date;
}
