// src/infrastructure/database/typeorm/entities/user.entity.ts
import {
	Entity,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	PrimaryColumn,
	Index,
} from 'typeorm';

@Entity({ schema: 'sys', name: 'users' })
export class User {
	@PrimaryColumn('uuid', { name: 'id', default: () => 'gen_random_uuid()' })
	id!: string;

	@Index({ unique: true })
	@Column('varchar', { name: 'username', length: 50 })
	username!: string;

	@Index({ unique: true })
	@Column('varchar', { name: 'email', length: 255 })
	email!: string;

	@Column('varchar', { name: 'password', length: 255 })
	password!: string;

	@Index({ unique: true })
	@Column('varchar', { name: 'national_id', length: 64 })
	nationalId!: string;

	@Column('boolean', { name: 'is_active', default: () => 'true' })
	isActive!: boolean;

	@Column('varchar', { name: 'phone_number', length: 15, nullable: true })
	phoneNumber!: string | null;

	@Column('varchar', { name: 'first_name', length: 100 })
	firstName!: string;

	@Column('varchar', { name: 'last_name', length: 100 })
	lastName!: string;

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

	@DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
	deletedAt: Date | null;

	@Column('boolean', { name: 'is_super_root', default: () => 'false' })
	isSuperRoot!: boolean;
}
