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
} from 'typeorm';

@Entity({ name: 'stores', schema: 'sys' })
export class Store {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Company, { nullable: false })
	@JoinColumn({ name: 'company_id' })
	company: Company;

	@Column({ type: 'varchar', length: 255 })
	name: string;

	@Column({ type: 'text', nullable: true })
	address: string;

	@Column({ type: 'varchar', length: 20, nullable: true })
	phone: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	email: string;

	@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
	updatedAt: Date;

	@DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
	deletedAt: Date | null;

	@Column({
		type: 'enum',
		enum: StatusEnum,
		default: StatusEnum.ACTIVE,
		name: 'status',
	})
	status: StatusEnum;
}
