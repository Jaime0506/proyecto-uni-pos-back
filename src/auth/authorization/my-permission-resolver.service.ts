// // src/auth/authorization/my-permission-resolver.service.ts
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { PermissionResolver } from './permission-resolver';
// import { UserRole } from '../../core/authz/user-role.entity'; // user_roles (tenant)
// import { RolePermission } from '../../core/authz/role-permission.entity'; // role_permissions
// import { Permission } from '../../core/authz/permission.entity'; // permissions
// import { Redis } from 'ioredis'; // o el cliente que uses
// import { Inject } from '@nestjs/common';

// type Snapshot = Set<string>;

// function jitteredTtl(baseSeconds: number, pct = 0.15) {
// 	const delta = Math.floor(baseSeconds * pct);
// 	const rnd = Math.floor(Math.random() * (delta * 2 + 1)) - delta; // [-delta, +delta]
// 	return baseSeconds + rnd;
// }

// @Injectable()
// export class MyPermissionResolverService implements PermissionResolver {
// 	private readonly ttlSeconds = 600; // 10 min

// 	constructor(
// 		@InjectRepository(UserRole)
// 		private readonly userRoleRepo: Repository<UserRole>,
// 		@InjectRepository(RolePermission)
// 		private readonly rolePermRepo: Repository<RolePermission>,
// 		@InjectRepository(Permission)
// 		private readonly permRepo: Repository<Permission>,
// 		@Inject('REDIS_CLIENT') private readonly redis: Redis, // regístralo en un módulo de Infra
// 	) {}

// 	private cacheKey(userId: string, tenantId: string | null) {
// 		return `perms:${userId}:${tenantId ?? 'global'}`;
// 	}

// 	async getUserPermissions(
// 		userId: string,
// 		tenantId: string | null,
// 	): Promise<Snapshot> {
// 		const cacheKey = this.cacheKey(userId, tenantId);
// 		// 1) Cache read
// 		const cached = await this.redis.get(cacheKey);
// 		if (cached) return new Set(JSON.parse(cached) as string[]);

// 		// 2) Cargar roles del usuario (globales + por tenant)
// 		//    Opción A (tu elección previa): NO usamos company_id NULL para root (root usa flag),
// 		//    pero igual puedes tener roles globales válidos; ajusta si los usas.
// 		const rolesTenant = await this.userRoleRepo.find({
// 			where: { userId, companyId: tenantId }, // por tenant
// 			select: { roleId: true },
// 		});

// 		// (Si tu modelo contempla también user_roles globales, aquí los cargarías y unirías)

// 		const roleIds = [...new Set(rolesTenant.map((r) => r.roleId))];
// 		if (roleIds.length === 0) {
// 			await this.redis.set(
// 				cacheKey,
// 				JSON.stringify([]),
// 				'EX',
// 				jitteredTtl(this.ttlSeconds),
// 			);
// 			return new Set();
// 		}

// 		// 3) Resolver permisos de esos roles
// 		const rolePerms = await this.rolePermRepo.find({
// 			where: { roleId: roleIds.length ? roleIds : undefined },
// 			relations: { permission: true },
// 			select: { permission: { code: true } as any }, // code = 'invoice:read', etc.
// 		});

// 		// 4) Expandir alias/jerarquías si usas (p.ej. manage ⇒ CRUD)
// 		const codes = new Set<string>();
// 		for (const rp of rolePerms) {
// 			const code = rp.permission.code;
// 			if (!code) continue;
// 			if (code.endsWith(':manage')) {
// 				const res = code.split(':')[0];
// 				['read', 'create', 'update', 'delete'].forEach((a) =>
// 					codes.add(`${res}:${a}`),
// 				);
// 			} else {
// 				codes.add(code);
// 			}
// 		}

// 		// 5) Guardar snapshot en cache con TTL + jitter
// 		await this.redis.set(
// 			cacheKey,
// 			JSON.stringify(Array.from(codes)),
// 			'EX',
// 			jitteredTtl(this.ttlSeconds),
// 		);

// 		return codes;
// 	}

// 	/** Llama esto cuando cambies roles/permisos de un usuario (invalida cache) */
// 	async invalidate(userId: string, tenantId: string | null) {
// 		await this.redis.del(this.cacheKey(userId, tenantId));
// 	}
// }

// src/auth/authorization/my-permission-resolver.service.ts
import { Injectable } from '@nestjs/common';
import { PermissionResolver } from './permission-resolver';

type Snapshot = Set<string>;

@Injectable()
export class MyPermissionResolverService implements PermissionResolver {
	// Demo: permisos “hardcodeados” por usuario/tenant (cámbialo a tu gusto)
	private demo: Record<string, string[]> = {
		// clave: `${userId}:${tenantId}`
		'u1:1': ['invoice:read', 'invoice:create', 'inventory:*'],
		'u2:1': ['invoice:read'],
	};

	// Simulamos el async x errores de tipos
	async getUserPermissions(
		userId: string,
		tenantId: string | null,
	): Promise<Snapshot> {
		return new Promise((resolve) => {
			const key = `${userId}:${tenantId ?? 'global'}`;
			const perms = this.demo[key] ?? [];
			resolve(new Set(perms));
		});
	}
}
