import { Company } from 'src/modules/companies/entities/company.entity';
import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	JoinColumn,
} from 'typeorm';

@Entity({ name: 'product_categories', schema: 'sys' })
export class ProductCategory {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Company, { nullable: false })
	@JoinColumn({ name: 'company_id' })
	company: Company;

	@Column({ type: 'varchar', length: 255 })
	name: string;

	@Column({ type: 'text', nullable: true })
	description: string;

	@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
	updatedAt: Date;

	@DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
	deletedAt: Date | null;
}
