import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './entities/sale.entity';
import { Bonus } from './entities/bonuses.entity';
import { SaleItem } from './entities/sale-items.entity';
import { Customer } from './entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { RewardRule } from '../rewards/entities/reward-rule.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Sale,
			SaleItem,
			Bonus,
			Customer,
			Product,
			RewardRule,
		]),
		AuthorizationGuardModule,
	],
	controllers: [SalesController],
	providers: [SalesService],
	exports: [SalesService],
})
export class SalesModule {}
