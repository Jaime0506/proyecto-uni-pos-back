import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-items.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { User } from 'src/core/users/user.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';
import { PurchaseOrder } from '../purchases/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../purchases/entities/purchase-order-item.entity';
import { SupplierReception } from '../purchases/entities/supplier-reception.entity';
import { SupplierReceptionItem } from '../purchases/entities/supplier-reception-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Sale,
			SaleItem,
			Product,
			Customer,
			User,
			PurchaseOrder,
			PurchaseOrderItem,
			SupplierReception,
			SupplierReceptionItem,
			Supplier,
		]),
		AuthorizationGuardModule,
	],
	controllers: [ReportsController],
	providers: [ReportsService],
})
export class ReportsModule {}
