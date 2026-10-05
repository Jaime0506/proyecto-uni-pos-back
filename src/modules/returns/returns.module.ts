import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { SaleReturn } from './entities/sale-return.entity';
import { SaleReturnItem } from './entities/sale-return-item.entity';
import { ReturnPolicy } from './entities/return-policy.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-items.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../products/entities/stock-movement.entity';
import { Bonus } from '../sales/entities/bonuses.entity';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			SaleReturn,
			SaleReturnItem,
			ReturnPolicy,
			Sale,
			SaleItem,
			Product,
			StockMovement,
			Bonus,
		]),
		AuditModule,
		AuthorizationGuardModule,
	],
	controllers: [ReturnsController],
	providers: [ReturnsService],
	exports: [ReturnsService],
})
export class ReturnsModule {}
