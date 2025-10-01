import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
} from 'typeorm';

@Entity({ name: 'companies', schema: 'sys' })
export class Company {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 255 })
	name: string;

	@Column({ type: 'varchar', length: 50, unique: true })
	nit: string;

	@Column({ type: 'text', nullable: true })
	address: string;

	@Column({ type: 'text', nullable: true })
	dns: string;

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
}
