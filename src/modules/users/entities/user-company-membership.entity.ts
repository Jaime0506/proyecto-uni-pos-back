import {
	Entity,
	Column,
	PrimaryColumn,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
} from 'typeorm';
import { User } from 'src/core/users/user.entity';
import { Company } from 'src/modules/companies/entities/company.entity';

@Entity({ schema: 'sys', name: 'user_company_memberships' })
export class UserCompanyMembership {
	@PrimaryColumn('uuid', { name: 'user_id' })
	userId!: string;

	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: 'user_id' })
	user!: User;

	@PrimaryColumn('integer', { name: 'company_id' })
	companyId!: number;

	@ManyToOne(() => Company, { nullable: false })
	@JoinColumn({ name: 'company_id' })
	company!: Company;

	@Column({
		type: 'boolean',
		name: 'is_active',
		default: true,
	})
	isActive!: boolean;

	@CreateDateColumn({
		type: 'timestamptz',
		name: 'joined_at',
		default: () => 'now()',
	})
	joinedAt!: Date;
}
