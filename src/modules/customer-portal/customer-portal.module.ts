import { Module } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerPortalController } from './customer-portal.controller';

@Module({
	controllers: [CustomerPortalController],
	providers: [CustomerPortalService],
	exports: [CustomerPortalService],
})
export class CustomerPortalModule {}
