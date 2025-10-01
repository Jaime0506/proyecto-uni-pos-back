// src/auth/authorization/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_META_KEY = 'required_permissions';

export type RequirePermissionsInput =
	| string[]
	| { allOf?: string[]; anyOf?: string[] };

export interface RequiredPermissions {
	allOf: string[];
	anyOf: string[];
}

/**
 * Uso:
 *  @RequirePermissions('invoice:create', 'invoice:read')  // allOf por defecto
 *  @RequirePermissions({ anyOf: ['invoice:update', 'invoice:approve'] })
 */
export function RequirePermissions(
	input: RequirePermissionsInput,
	...rest: string[]
) {
	const normalized =
		Array.isArray(input) || rest.length
			? {
					allOf: [...(Array.isArray(input) ? input : [input]), ...rest],
					anyOf: [],
				}
			: { allOf: input.allOf ?? [], anyOf: input.anyOf ?? [] };

	return SetMetadata(PERMISSIONS_META_KEY, normalized);
}
