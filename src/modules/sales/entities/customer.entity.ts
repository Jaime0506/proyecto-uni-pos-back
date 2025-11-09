import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
} from 'typeorm';

@Entity({ name: 'customers', schema: 'sys' })
export class Customer {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: 'company_id' })
	companyId: number;

	@Column({ name: 'national_id', type: 'varchar', length: 20 })
	nationalId: string;

	@Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
	firstName?: string;

	@Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
	lastName?: string;

	@Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
	phone?: string;

	@Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
	email?: string;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
	updatedAt: Date;

	@DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
	deletedAt?: Date;
}
