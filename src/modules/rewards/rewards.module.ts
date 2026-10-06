import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { RewardRule } from './entities/reward-rule.entity';
import { RewardRuleProduct } from './entities/reward-rule-product.entity';
import { RewardRuleCategory } from './entities/reward-rule-category.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			RewardRule,
			RewardRuleProduct,
			RewardRuleCategory,
			Product,
			Category,
		]),
		AuthorizationGuardModule,
	],
	controllers: [RewardsController],
	providers: [RewardsService],
	exports: [RewardsService],
})
export class RewardsModule {}
