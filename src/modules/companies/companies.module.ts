import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyService } from './companies.service';
import { CompanyController } from './companies.controller';
import { Company } from './entities/company.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [TypeOrmModule.forFeature([Company]), AuthorizationGuardModule],
	controllers: [CompanyController],
	providers: [CompanyService],
	exports: [CompanyService],
})
export class CompaniesModule {}
