import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { RewardRule } from './entities/reward-rule.entity';
import { RewardRuleProduct } from './entities/reward-rule-product.entity';
import { Product } from '../products/entities/product.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([RewardRule, RewardRuleProduct, Product]),
		AuthorizationGuardModule,
	],
	controllers: [RewardsController],
	providers: [RewardsService],
	exports: [RewardsService],
})
export class RewardsModule {}
