// src/auth/authorization-guard/authorization-guard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionGuard } from './permissions.guard';
import { PERMISSION_RESOLVER } from './permission-resolver';
import { MyPermissionResolverService } from './my-permission-resolver.service';
import { UserRole } from 'src/modules/authorization/entities/user-role.entity';
import { RolePermission } from 'src/modules/authorization/entities/role-permission.entity';

@Module({
	imports: [TypeOrmModule.forFeature([UserRole, RolePermission])],
	providers: [
		{ provide: PERMISSION_RESOLVER, useClass: MyPermissionResolverService },
		PermissionGuard,
		MyPermissionResolverService, // Exportar directamente también
	],
	exports: [PermissionGuard, PERMISSION_RESOLVER, MyPermissionResolverService],
})
export class AuthorizationGuardModule {}
