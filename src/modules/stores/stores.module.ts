import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from './entities/store.entity';
import { Company } from '../companies/entities/company.entity';
import { UserCompanyMembership } from '../users/entities/user-company-membership.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Store, Company, UserCompanyMembership]),
		AuthorizationGuardModule,
	],
	controllers: [StoresController],
	providers: [StoresService],
	exports: [StoresService],
})
export class StoresModule {}
