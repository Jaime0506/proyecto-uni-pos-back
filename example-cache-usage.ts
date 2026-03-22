// // Ejemplo de uso del sistema de cache con userFields
// import { Controller, Get, Req } from '@nestjs/common';
// import { Cache } from 'src/modules/cache/decorators/cache.decorator';
// import { CacheInvalidate } from 'src/modules/cache/decorators/cache-invalidate.decorator';
// import type { Request } from 'express';
// import { RequestUser } from 'src/types/global';

// @Controller('authorization')
// export class AuthorizationController {
// 	constructor(private readonly authorizationService: any) {}

// 	// ✅ EJEMPLO COMPLETADO: Cache basado en campos del usuario
// 	@Get('get-all-roles-and-permissions-by-user-id')
// 	@Cache({
// 		key: 'user:roles-and-permissions',
// 		ttl: '5M',
// 		userFields: ['userId', 'companyId'], // Cache por usuario específico y compañía
// 	})
// 	async getAllRolesAndPermissionsByUserId(
// 		@Req() req: Request & { user: RequestUser },
// 	) {
// 		return await this.authorizationService.getAllRolesAndPermissionsByUserId(
// 			req,
// 		);
// 	}

// 	// Invalidación cuando se actualizan roles/permisos
// 	@Patch('roles/update')
// 	@CacheInvalidate({
// 		patterns: ['user:roles-and-permissions:*'], // Invalida todas las keys de roles/permisos
// 	})
// 	async updateRole(@Body() dto: any) {
// 		return this.authorizationService.updateRole(dto);
// 	}
// }
