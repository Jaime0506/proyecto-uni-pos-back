import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';
import { BonificationsService } from './bonifications.service';
import { BonificationsController } from './bonifications.controller';
import { Bonus } from './entities/bonification.entity';
import { Customer } from '../sales/entities/customer.entity';
import { BonusTransaction } from '../sales/entities/bonus-transactions.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([Bonus, Customer, BonusTransaction]),
		AuthorizationGuardModule,
	],
	controllers: [BonificationsController],
	providers: [BonificationsService],
})
export class BonificationsModule {}
