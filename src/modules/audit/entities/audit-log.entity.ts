import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { User } from 'src/core/users/user.entity';

@Entity({ schema: 'sys', name: 'audit_logs' })
@Index('audit_logs_user_idx', ['userId'])
@Index('audit_logs_company_idx', ['companyId'])
@Index('audit_logs_module_idx', ['module'])
@Index('audit_logs_action_idx', ['action'])
@Index('audit_logs_created_at_idx', ['createdAt'])
export class AuditLog {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ name: 'user_id', type: 'uuid', nullable: true })
	userId?: string | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'user_id' })
	user?: User | null;

	@Column({ name: 'company_id', type: 'int', nullable: true })
	companyId?: number | null;

	@Column({ name: 'store_id', type: 'int', nullable: true })
	storeId?: number | null;

	@Column({ type: 'varchar', length: 50 })
	module!: string; // USERS, AUTH, INVENTORY, SALES, ROLES

	@Column({ type: 'varchar', length: 100 })
	action!: string; // USER_CREATED, USER_UPDATED, USER_DEACTIVATED, USER_ACTIVATED, LOGIN, PASSWORD_CHANGED

	@Column({ name: 'entity_name', type: 'varchar', length: 100, nullable: true })
	entityName?: string | null;

	@Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
	entityId?: string | null;

	@Column({ type: 'text', nullable: true })
	description?: string | null;

	@Column({ type: 'jsonb', nullable: true })
	details?: Record<string, any> | null;

	@Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
	ipAddress?: string | null;

	@CreateDateColumn({
		type: 'timestamptz',
		name: 'created_at',
		default: () => 'now()',
	})
	createdAt!: Date;
}
