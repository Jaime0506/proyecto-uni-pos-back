import { StatusEnum } from 'src/core/status.enum';
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
	Index,
	Unique,
} from 'typeorm';

@Entity({ name: 'customers', schema: 'sys' })
@Unique(['company', 'nationalId'])
@Index('customers_company_phone_idx', ['company', 'phone'])
@Index('customers_company_email_idx', ['company', 'email'])
export class Customer {
	@PrimaryGeneratedColumn('increment', { name: 'id' })
	id: number;

	@ManyToOne(() => Company, { nullable: false })
	@JoinColumn({ name: 'company_id' })
	company: Company;

	@Column({ type: 'varchar', length: 20, name: 'national_id', nullable: false })
	nationalId: string;

	@Column({ type: 'varchar', length: 100, name: 'first_name', nullable: true })
	firstName?: string;

	@Column({ type: 'varchar', length: 100, name: 'last_name', nullable: true })
	lastName?: string;

	@Column({ type: 'varchar', length: 20, name: 'phone', nullable: true })
	phone?: string;

	@Column({ type: 'varchar', length: 255, name: 'email', nullable: true })
	email?: string;

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

	@DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
	deletedAt?: Date | null;

	@Column({
		type: 'enum',
		enum: StatusEnum,
		default: StatusEnum.ACTIVE,
		name: 'status',
	})
	status: StatusEnum;
}
