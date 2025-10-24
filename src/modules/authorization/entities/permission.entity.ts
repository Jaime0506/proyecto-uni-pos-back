import {
	Entity,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	PrimaryColumn,
	Index,
} from 'typeorm';
import { StatusEnum } from '../../../core/status.enum';

@Entity({ schema: 'sys', name: 'permissions' })
export class Permission {
	@PrimaryColumn('integer', { name: 'id' })
	id!: number;

	@Index({ unique: true })
	@Column('varchar', { name: 'name', length: 100 })
	name!: string;

	@Column('varchar', { name: 'description', length: 255, nullable: true })
	description!: string | null;

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

	@UpdateDateColumn({
		type: 'timestamp',
		name: 'updated_at',
		default: () => 'CURRENT_TIMESTAMP',
	})
	updatedAt!: Date;
}
