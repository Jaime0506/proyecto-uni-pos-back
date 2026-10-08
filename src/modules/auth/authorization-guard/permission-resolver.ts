// src/auth/authorization/permission-resolver.ts
export interface PermissionResolver {
	/**
	 * Devuelve el snapshot de permisos del usuario para el tenant actual.
	 * Debe incluir expansiones de alias/commodines si las usas.
	 */
	getUserPermissions(
		userId: string,
		tenantId: string | null,
	): Promise<Set<string>>;
}

export const PERMISSION_RESOLVER = 'PermissionResolver';
