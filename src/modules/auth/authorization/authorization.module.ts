// src/auth/authorization/authorization.module.ts
import { Module } from '@nestjs/common';
import { PermissionGuard } from './permissions.guard';
import { PERMISSION_RESOLVER } from './permission-resolver';
import { MyPermissionResolverService } from './my-permission-resolver.service';

@Module({
	providers: [
		{ provide: PERMISSION_RESOLVER, useClass: MyPermissionResolverService },
		PermissionGuard,
	],
	exports: [PermissionGuard, PERMISSION_RESOLVER],
})
export class AuthorizationModule {}
