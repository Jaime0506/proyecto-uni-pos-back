import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { Company } from '../companies/entities/company.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Customer, Company]),
		AuthorizationGuardModule,
	],
	controllers: [CustomersController],
	providers: [CustomersService],
	exports: [CustomersService],
})
export class CustomersModule {}
