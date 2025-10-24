import {
	Entity,
	Column,
	CreateDateColumn,
	DeleteDateColumn,
	PrimaryGeneratedColumn,
	ManyToOne,
	JoinColumn,
	Unique,
} from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { StatusEnum } from '../../../core/status.enum';

@Entity({ schema: 'sys', name: 'role_permissions' })
@Unique(['roleId', 'permissionId'])
export class RolePermission {
	@PrimaryGeneratedColumn('increment', { name: 'id' })
	id!: number;

	@Column('integer', { name: 'role_id' })
	roleId!: number;

	@ManyToOne(() => Role, { nullable: false })
	@JoinColumn({ name: 'role_id' })
	role!: Role;

	@Column('integer', { name: 'permission_id' })
	permissionId!: number;

	@ManyToOne(() => Permission, { nullable: false })
	@JoinColumn({ name: 'permission_id' })
	permission!: Permission;

	@Column({
		type: 'enum',
		enum: StatusEnum,
		name: 'status',
		default: StatusEnum.ACTIVE,
	})
	status!: StatusEnum;

	@DeleteDateColumn({ type: 'timestamp', name: 'deleted_at', nullable: true })
	deletedAt!: Date | null;

	@CreateDateColumn({
		type: 'timestamp',
		name: 'created_at',
		default: () => 'CURRENT_TIMESTAMP',
	})
	createdAt!: Date;
}
