import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
} from 'typeorm';
import { User } from '../../core/users/user.entity';

@Entity({ schema: 'sys', name: 'sessions' })
export class Session {
	@PrimaryGeneratedColumn('increment') id!: number;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
	user!: User;

	@Index({ unique: true })
	@Column({ name: 'jti_access', type: 'uuid' })
	jtiAccess!: string;

	@Column({ name: 'device_id', type: 'varchar', length: 200, nullable: true })
	deviceId?: string;

	@Column({ name: 'login_at', type: 'timestamptz', default: () => 'now()' })
	loginAt!: Date;

	@Column({ name: 'logout_at', type: 'timestamptz', nullable: true })
	logoutAt?: Date | null;

	@Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
	lastSeenAt?: Date | null;

	@Column({ name: 'expires_at', type: 'timestamptz' })
	expiresAt!: Date;

	@Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
	revokedAt?: Date | null;

	@Column({ name: 'revoked_reason', type: 'text', nullable: true })
	revokedReason?: string | null;

	@Column({ name: 'ip', type: 'inet', nullable: true })
	ip?: string | null;

	@Column({ name: 'user_agent', type: 'text', nullable: true })
	userAgent?: string | null;

	@Column({ name: 'company_id', type: 'int', nullable: true })
	companyId?: number | null;
}
