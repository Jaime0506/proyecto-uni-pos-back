import {
	Entity,
	Column,
	PrimaryColumn,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/core/users/user.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { Company } from 'src/modules/companies/entities/company.entity';

@Entity({ schema: 'sys', name: 'user_stores' })
export class UserStore {
	@PrimaryColumn('uuid', { name: 'user_id' })
	userId!: string;

	@ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user!: User;

	@PrimaryColumn('integer', { name: 'store_id' })
	storeId!: number;

	@ManyToOne(() => Store, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'store_id' })
	store!: Store;

	@Column('integer', { name: 'company_id' })
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

	@Column('uuid', { name: 'assigned_by', nullable: true })
	assignedBy?: string | null;

	@CreateDateColumn({
		type: 'timestamptz',
		name: 'created_at',
		default: () => 'now()',
	})
	createdAt!: Date;

	@UpdateDateColumn({
		type: 'timestamptz',
		name: 'updated_at',
		default: () => 'now()',
	})
	updatedAt!: Date;
}
