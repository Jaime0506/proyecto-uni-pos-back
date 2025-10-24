import {
	Entity,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	PrimaryGeneratedColumn,
	ManyToOne,
	JoinColumn,
	Unique,
} from 'typeorm';
import { User } from 'src/core/users/user.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import { Role } from './role.entity';
import { StatusEnum } from '../../../core/status.enum';

@Entity({ schema: 'sys', name: 'user_roles' })
@Unique(['userId', 'roleId'])
export class UserRole {
	@PrimaryGeneratedColumn('increment', { name: 'id' })
	id!: number;

	@Column('uuid', { name: 'user_id' })
	userId!: string;

	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: 'user_id' })
	user!: User;

	@Column('integer', { name: 'company_id' })
	companyId!: number;

	@ManyToOne(() => Company, { nullable: false })
	@JoinColumn({ name: 'company_id' })
	company!: Company;

	@Column('integer', { name: 'role_id' })
	roleId!: number;

	@ManyToOne(() => Role, { nullable: false })
	@JoinColumn({ name: 'role_id' })
	role!: Role;

	@Column({
		type: 'enum',
		enum: StatusEnum,
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
