import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './database/typeorm.config';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RedisModule } from './modules/redis/redis.module';
import { ProductsModule } from './modules/products/products.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { StoresModule } from './modules/stores/stores.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { SalesModule } from './modules/sales/sales.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { BonificationsModule } from './modules/bonifications/bonifications.module';
import { CacheModule } from './modules/cache/cache.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CategoriesModule } from './modules/categories/categories.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
		TypeOrmModule.forRootAsync(typeOrmConfig),
		RedisModule,
		CacheModule,
		AuthModule,
		UsersModule,
		ProductsModule,
		CompaniesModule,
		StoresModule,
		RewardsModule,
		AuthorizationModule,
		SalesModule,
		SuppliersModule,
		BonificationsModule,
		CustomersModule,
		ReportsModule,
		CategoriesModule,
	],
})
export class AppModule {}
