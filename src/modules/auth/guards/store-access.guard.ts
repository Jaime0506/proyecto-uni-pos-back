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

		// 1. Verificar si el usuario tiene permiso store:access_all o es admin
		const userEntity = await this.dataSource.getRepository(User).findOne({
			where: { id: user.userId },
		});
		if (userEntity?.isSuperRoot) return true;

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
			if (
				userRole.role.name.toLowerCase().includes('admin') ||
				userRole.role.name.toLowerCase().includes('super')
			) {
				return true;
			}

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
		}

		// 2. Verificar asignación en sys.user_stores
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
}
