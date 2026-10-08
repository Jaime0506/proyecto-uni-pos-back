// src/auth/authorization/my-permission-resolver.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PermissionResolver } from './permission-resolver';
import { UserRole } from 'src/modules/authorization/entities/user-role.entity';
import { RolePermission } from 'src/modules/authorization/entities/role-permission.entity';
import { RedisService } from 'src/modules/redis/redis.service';
import { StatusEnum } from 'src/core/status.enum';

type Snapshot = Set<string>;

@Injectable()
export class MyPermissionResolverService implements PermissionResolver {
	private readonly ttlExpiration = '10m'; // 10 minutos con variación ±10%

	constructor(
		@InjectRepository(UserRole)
		private readonly userRoleRepository: Repository<UserRole>,
		@InjectRepository(RolePermission)
		private readonly rolePermissionRepository: Repository<RolePermission>,
		private readonly redisService: RedisService,
	) {}

	/**
	 * Genera la clave de cache para los permisos de un usuario
	 */
	private cacheKey(userId: string, tenantId: string | null): string {
		return `perms:${userId}:${tenantId ?? 'global'}`;
	}

	/**
	 * Convierte el array de permisos a Set
	 */
	private expandPermissions(permissions: string[]): Set<string> {
		const expanded = new Set<string>();

		for (const perm of permissions) {
			if (!perm) continue;
			expanded.add(perm);
		}

		return expanded;
	}

	/**
	 * Obtiene los permisos del usuario desde la base de datos
	 */
	private async loadUserPermissionsFromDb(
		userId: string,
		tenantId: string | null,
	): Promise<Set<string>> {
		// Obtener el rol activo del usuario
		// Si se proporciona tenantId (companyId), filtrar por él
		const whereCondition = tenantId
			? {
					userId,
					companyId: parseInt(tenantId, 10),
					status: StatusEnum.ACTIVE,
					deletedAt: IsNull(),
				}
			: {
					userId,
					status: StatusEnum.ACTIVE,
					deletedAt: IsNull(),
				};

		const userRole = await this.userRoleRepository.findOne({
			where: whereCondition,
			relations: ['role'],
			order: {
				createdAt: 'DESC',
			},
		});

		// Si el usuario no tiene rol, retornar Set vacío
		if (!userRole || !userRole.role) {
			return new Set<string>();
		}

		const role = userRole.role;

		// Obtener solo permisos activos para el rol
		const rolePermissions = await this.rolePermissionRepository.find({
			where: {
				roleId: role.id,
				status: StatusEnum.ACTIVE,
				deletedAt: IsNull(),
			},
			relations: ['permission'],
		});

		// Filtrar solo permisos activos y extraer nombres
		const permissions = rolePermissions
			.filter(
				(rp) =>
					rp.permission?.status === StatusEnum.ACTIVE &&
					rp.permission?.deletedAt === null,
			)
			.map((rp) => rp.permission?.name)
			.filter((name): name is string => name !== undefined && name !== null);

		// Expandir alias/jerarquías (ej: "invoice:manage" => CRUD)
		return this.expandPermissions(permissions);
	}

	/**
	 * Devuelve el snapshot de permisos del usuario para el tenant actual.
	 * Implementa cache con Redis para mejorar el rendimiento.
	 */
	async getUserPermissions(
		userId: string,
		tenantId: string | null,
	): Promise<Snapshot> {
		const cacheKey = this.cacheKey(userId, tenantId);

		// 1) Intentar obtener desde cache
		try {
			const cached = await this.redisService.getJson<string[]>(cacheKey);
			if (cached && Array.isArray(cached)) {
				return new Set(cached);
			}
		} catch (error) {
			// Si hay error al leer cache, continuar con la carga desde DB
			console.warn(`Error al leer cache de permisos: ${error}`);
		}

		// 2) Si no está en cache, cargar desde la base de datos
		const permissions = await this.loadUserPermissionsFromDb(userId, tenantId);

		// 3) Guardar en cache con TTL y variación ±10%
		try {
			const permissionsArray = Array.from(permissions);
			await this.redisService.set(
				cacheKey,
				permissionsArray,
				this.ttlExpiration,
			);
		} catch (error) {
			// Si hay error al guardar en cache, no es crítico, solo loguear
			console.warn(`Error al guardar cache de permisos: ${error}`);
		}

		return permissions;
	}

	/**
	 * Invalida el cache de permisos de un usuario
	 * Llama esto cuando cambies roles/permisos de un usuario
	 */
	async invalidate(userId: string, tenantId: string | null): Promise<void> {
		const cacheKey = this.cacheKey(userId, tenantId);
		await this.redisService.del(cacheKey);
	}

	/**
	 * Invalida el cache de permisos de todos los usuarios para un tenant
	 * Útil cuando se actualizan permisos de un rol compartido
	 * Nota: Esta implementación requeriría usar SCAN de Redis o mantener un índice.
	 * Por simplicidad, puedes llamar a invalidate para cada usuario cuando
	 * se actualice un rol compartido.
	 */
	invalidateByTenant(tenantId: string | null): void {
		// Implementación futura: usar SCAN de Redis para invalidar
		// todos los usuarios de un tenant específico
		// const pattern = `perms:*:${tenantId ?? 'global'}`;
		console.warn(
			`Invalidación masiva por tenant no implementada. Tenant: ${tenantId ?? 'global'}`,
		);
	}
}
