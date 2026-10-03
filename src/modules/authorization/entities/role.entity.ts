import {
	Entity,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	PrimaryGeneratedColumn,
	ManyToOne,
	JoinColumn,
	Index,
	Unique,
} from 'typeorm';
import { Company } from 'src/modules/companies/entities/company.entity';
import { StatusEnum } from '../../../core/status.enum';

@Entity({ schema: 'sys', name: 'roles' })
@Unique('roles_company_name_uk', ['companyId', 'name'])
export class Role {
	@PrimaryGeneratedColumn('increment', { name: 'id' })
	id!: number;

	@Column('integer', { name: 'company_id' })
	companyId!: number;

	@ManyToOne(() => Company, { nullable: false })
	@JoinColumn({ name: 'company_id' })
	company!: Company;

	@Column('varchar', { name: 'name', length: 100 })
	name!: string;

	@Column('varchar', { name: 'description', length: 255, nullable: true })
	description!: string | null;

	@Column({
		type: 'enum',
		enum: StatusEnum,
		enumName: 'status_enum',
		name: 'status',
		default: StatusEnum.ACTIVE,
	})
	status!: StatusEnum;

	@DeleteDateColumn({ type: 'timestamp', name: 'deleted_at', nullable: true })
	deletedAt!: Date | null;

	@UpdateDateColumn({
		type: 'timestamp',
		name: 'updated_at',
		default: () => 'CURRENT_TIMESTAMP',
	})
	updatedAt!: Date;

	@CreateDateColumn({
		type: 'timestamp',
		name: 'created_at',
		default: () => 'CURRENT_TIMESTAMP',
	})
	createdAt!: Date;
}
