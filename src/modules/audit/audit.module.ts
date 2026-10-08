import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { UserCompanyMembership } from '../users/entities/user-company-membership.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Global()
@Module({
	imports: [
		TypeOrmModule.forFeature([AuditLog, UserCompanyMembership]),
		AuthorizationGuardModule,
	],
	controllers: [AuditController],
	providers: [AuditService],
	exports: [AuditService],
})
export class AuditModule {}
