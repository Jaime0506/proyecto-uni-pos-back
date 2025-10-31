import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { AuthorizationController } from './authorization.controller';
import { RolePermission } from './entities/role-permission.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
	imports: [
		TypeOrmModule.forFeature([UserRole, Role, Permission, RolePermission]),
	],
	controllers: [AuthorizationController],
	providers: [AuthorizationService],
})
export class AuthorizationModule {}
