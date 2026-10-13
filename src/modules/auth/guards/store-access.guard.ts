import {
	Injectable,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { Request } from 'express';
import { RequestUser } from 'src/types/global';
import { User } from 'src/core/users/user.entity';
import { UserRole } from 'src/modules/authorization/entities/user-role.entity';
import { RolePermission } from 'src/modules/authorization/entities/role-permission.entity';
import { UserStore } from 'src/modules/users/entities/user-store.entity';
import { StatusEnum } from 'src/core/status.enum';

@Injectable()
export class StoreAccessGuard implements CanActivate {
	constructor(private readonly dataSource: DataSource) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context
			.switchToHttp()
			.getRequest<Request & { user?: RequestUser }>();
		const user = req.user;

		if (!user) return true;
		if (user.isSuperRoot) return true;

		// Extraer storeId del body, query o params
		const rawStoreId =
			req.body?.storeId ?? req.query?.storeId ?? req.params?.storeId;

		if (rawStoreId === undefined || rawStoreId === null || rawStoreId === '') {
			return true;
		}

		const storeId = Number(rawStoreId);
		if (isNaN(storeId) || storeId <= 0) {
			return true;
		}

		const userEntity = await this.dataSource.getRepository(User).findOne({
			where: { id: user.userId },
		});
		if (userEntity?.isSuperRoot) return true;

		// 1. Si el usuario tiene asignaciones en sys.user_stores (ej. empleado de tienda),
		// DEBE estar asignado específicamente a esta tienda con isActive: true
		const userStoresCount = await this.dataSource
			.getRepository(UserStore)
			.count({
				where: {
					userId: user.userId,
					isActive: true,
				},
			});

		if (userStoresCount > 0) {
			const userStore = await this.dataSource.getRepository(UserStore).findOne({
				where: {
					userId: user.userId,
					storeId: storeId,
					isActive: true,
				},
			});

			if (!userStore) {
				throw new ForbiddenException({
					message:
						'No tienes permisos para acceder o gestionar datos de esta tienda',
					code: 'STORE-ACCESS-DENIED',
					storeId,
				});
			}

			return true;
		}

		// 2. Si no tiene asignaciones en sys.user_stores, verificar si es administrador global
		const userRole = await this.dataSource.getRepository(UserRole).findOne({
			where: {
				userId: user.userId,
				status: StatusEnum.ACTIVE,
				deletedAt: IsNull(),
			},
			relations: ['role'],
			order: { createdAt: 'DESC' },
		});

		if (userRole?.role) {
			// Permiso explícito store:access_all
			const hasAccessAll = await this.dataSource
				.getRepository(RolePermission)
				.findOne({
					where: {
						roleId: userRole.role.id,
						status: StatusEnum.ACTIVE,
						deletedAt: IsNull(),
						permission: {
							name: 'store:access_all',
							status: StatusEnum.ACTIVE,
						},
					},
					relations: ['permission'],
				});

			if (hasAccessAll) return true;

			// Permisos de administración de compañía a nivel global
			const hasCompanyAdmin = await this.dataSource
				.getRepository(RolePermission)
				.findOne({
					where: [
						{
							roleId: userRole.role.id,
							status: StatusEnum.ACTIVE,
							deletedAt: IsNull(),
							permission: {
								name: 'company:read',
								status: StatusEnum.ACTIVE,
							},
						},
						{
							roleId: userRole.role.id,
							status: StatusEnum.ACTIVE,
							deletedAt: IsNull(),
							permission: {
								name: 'company_admin:read',
								status: StatusEnum.ACTIVE,
							},
						},
					],
					relations: ['permission'],
				});

			if (hasCompanyAdmin) return true;
		}

		throw new ForbiddenException({
			message:
				'No tienes permisos para acceder o gestionar datos de esta tienda',
			code: 'STORE-ACCESS-DENIED',
			storeId,
		});
	}
}
