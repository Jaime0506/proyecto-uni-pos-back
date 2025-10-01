// src/auth/authorization/permissions.guard.ts
import {
	Injectable,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
	PERMISSIONS_META_KEY,
	RequiredPermissions,
} from './permissions.decorator';
import type { PermissionResolver } from './permission-resolver';
import { PERMISSION_RESOLVER } from './permission-resolver';

interface AuthenticatedUser {
	userId: string;
	tenantId?: string | null;
	isSuperRoot?: boolean;
}

interface AuthenticatedRequest extends Request {
	user?: AuthenticatedUser;
}

function hasOne(required: string[], snapshot: Set<string>): boolean {
	return required.some((perm) => hasPerm(perm, snapshot));
}

function hasAll(required: string[], snapshot: Set<string>): boolean {
	return required.every((perm) => hasPerm(perm, snapshot));
}

/** Soporta comodines en snapshot: 'invoice:*' o '*' global si lo usas */
function hasPerm(perm: string, snapshot: Set<string>): boolean {
	if (snapshot.has(perm)) return true;
	if (snapshot.has('*')) return true; // por si implementas rol comodín (no necesario con isSuperRoot)
	const [res] = perm.split(':');
	return snapshot.has(`${res}:*`);
}

@Injectable()
export class PermissionGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		@Inject(PERMISSION_RESOLVER)
		private readonly resolver: PermissionResolver,
	) {}

	async canActivate(ctx: ExecutionContext): Promise<boolean> {
		const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

		const user = req?.user;

		// 0) Si no hay usuario, este guard no autentica; delega a JwtAuthGuard antes
		if (!user) {
			throw new ForbiddenException({
				code: 'AUTHZ-NO-USER',
				title: 'No authenticated user found',
			});
		}

		// 1) Super Root: short-circuit (permite todo, omite resolver)
		if (user.isSuperRoot) return true;

		// 2) Lee permisos requeridos desde metadata
		const required: RequiredPermissions | undefined = this.reflector.get(
			PERMISSIONS_META_KEY,
			ctx.getHandler(),
		);

		// Si el endpoint no declaró permisos, no bloquea
		if (
			!required ||
			(required.allOf.length === 0 && required.anyOf.length === 0)
		) {
			return true;
		}

		// 3) Obtén snapshot cacheado
		const tenantId =
			user.tenantId ?? (req.headers['x-tenant-id'] as string) ?? null; // ajusta a tu estrategia; ideal: venir del JWT/claim
		const snapshot = await this.resolver.getUserPermissions(
			user.userId,
			tenantId,
		);

		// 4) Evalúa reglas (allOf/anyOf)
		const okAll = required.allOf.length
			? hasAll(required.allOf, snapshot)
			: true;
		const okAny = required.anyOf.length
			? hasOne(required.anyOf, snapshot)
			: true;

		if (okAll && okAny) return true;

		// 5) Denegado
		throw new ForbiddenException({
			code: 'AUTHZ-DENIED',
			title: 'Insufficient permissions',
			detail: {
				needAllOf: required.allOf,
				needAnyOf: required.anyOf,
			},
		});
	}
}
