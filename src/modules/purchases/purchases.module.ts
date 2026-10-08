import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { SupplierReception } from './entities/supplier-reception.entity';
import { SupplierReceptionItem } from './entities/supplier-reception-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Store } from '../stores/entities/store.entity';
import { Company } from '../companies/entities/company.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../products/entities/stock-movement.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			PurchaseOrder,
			PurchaseOrderItem,
			SupplierReception,
			SupplierReceptionItem,
			Supplier,
			Store,
			Company,
			Product,
			StockMovement,
		]),
		AuthorizationGuardModule,
	],
	controllers: [PurchasesController],
	providers: [PurchasesService],
	exports: [PurchasesService],
})
export class PurchasesModule {}
