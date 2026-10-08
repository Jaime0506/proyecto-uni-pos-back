import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { Supplier } from './entities/supplier.entity';
import { Company } from '../companies/entities/company.entity';
import { AuthorizationGuardModule } from '../auth/authorization-guard/authorization-guard.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Supplier, Company]),
		AuthorizationGuardModule,
	],
	controllers: [SuppliersController],
	providers: [SuppliersService],
	exports: [SuppliersService],
})
export class SuppliersModule {}
