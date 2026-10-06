import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { Company } from '../companies/entities/company.entity';
import { Store } from '../stores/entities/store.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Bonus } from '../sales/entities/bonuses.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';
import { CustomerPortalModule } from '../customer-portal/customer-portal.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Customer, Company, Store, Sale, Bonus]),
		AuthorizationGuardModule,
		CustomerPortalModule,
	],
	controllers: [CustomersController],
	providers: [CustomersService],
	exports: [CustomersService],
})
export class CustomersModule {}
