import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogsDto } from './dtos/query-audit-logs.dto';
import { UserCompanyMembership } from '../users/entities/user-company-membership.entity';

@Injectable()
export class AuditService {
	constructor(
		@InjectRepository(AuditLog)
		private readonly auditRepo: Repository<AuditLog>,
		@InjectRepository(UserCompanyMembership)
		private readonly membershipRepo: Repository<UserCompanyMembership>,
	) {}

	async logAction(params: {
		userId?: string | null;
		companyId?: number | null;
		storeId?: number | null;
		module: string;
		action: string;
		entityName?: string;
		entityId?: string;
		description?: string;
		details?: Record<string, any>;
		ipAddress?: string;
	}): Promise<AuditLog | null> {
		try {
			const audit = this.auditRepo.create({
				userId: params.userId,
				companyId: params.companyId,
				storeId: params.storeId,
				module: params.module,
				action: params.action,
				entityName: params.entityName,
				entityId: params.entityId,
				description: params.description,
				details: params.details,
				ipAddress: params.ipAddress,
			});
			return await this.auditRepo.save(audit);
		} catch (error) {
			console.error('Error al registrar auditoría en bitácora:', error);
			return null;
		}
	}

	async getAdminLogs(query: QueryAuditLogsDto) {
		const page = query.page || 1;
		const limit = query.limit || 20;
		const skip = (page - 1) * limit;

		const qb = this.auditRepo
			.createQueryBuilder('audit')
			.leftJoinAndSelect('audit.user', 'user')
			.orderBy('audit.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (query.userId) {
			qb.andWhere('audit.userId = :userId', { userId: query.userId });
		}
		if (query.module) {
			qb.andWhere('audit.module = :module', { module: query.module });
		}
		if (query.action) {
			qb.andWhere('audit.action = :action', { action: query.action });
		}
		if (query.startDate) {
			qb.andWhere('audit.createdAt >= :startDate', {
				startDate: new Date(query.startDate),
			});
		}
		if (query.endDate) {
			const end = new Date(query.endDate);
			end.setHours(23, 59, 59, 999);
			qb.andWhere('audit.createdAt <= :endDate', { endDate: end });
		}
		if (query.search) {
			qb.andWhere(
				'(audit.description ILIKE :search OR user.username ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
				{ search: `%${query.search}%` },
			);
		}

		const [items, total] = await qb.getManyAndCount();

		return {
			ok: true,
			message: 'Bitácora obtenida correctamente',
			data: {
				result: items,
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			},
		};
	}

	async getStoreLogs(query: QueryAuditLogsDto, requesterUserId: string) {
		const membership = await this.membershipRepo.findOne({
			where: { userId: requesterUserId, isActive: true },
		});

		if (!membership) {
			throw new UnauthorizedException(
				'El administrador no tiene una compañía asignada',
			);
		}

		const page = query.page || 1;
		const limit = query.limit || 20;
		const skip = (page - 1) * limit;

		const qb = this.auditRepo
			.createQueryBuilder('audit')
			.leftJoinAndSelect('audit.user', 'user')
			.where('audit.companyId = :companyId', {
				companyId: membership.companyId,
			})
			.orderBy('audit.createdAt', 'DESC')
			.skip(skip)
			.take(limit);

		if (query.userId) {
			qb.andWhere('audit.userId = :userId', { userId: query.userId });
		}
		if (query.module) {
			qb.andWhere('audit.module = :module', { module: query.module });
		}
		if (query.action) {
			qb.andWhere('audit.action = :action', { action: query.action });
		}
		if (query.startDate) {
			qb.andWhere('audit.createdAt >= :startDate', {
				startDate: new Date(query.startDate),
			});
		}
		if (query.endDate) {
			const end = new Date(query.endDate);
			end.setHours(23, 59, 59, 999);
			qb.andWhere('audit.createdAt <= :endDate', { endDate: end });
		}
		if (query.search) {
			qb.andWhere(
				'(audit.description ILIKE :search OR user.username ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
				{ search: `%${query.search}%` },
			);
		}

		const [items, total] = await qb.getManyAndCount();

		return {
			ok: true,
			message: 'Bitácora obtenida correctamente',
			data: {
				result: items,
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			},
		};
	}
}
