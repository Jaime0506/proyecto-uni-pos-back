import {
	BadRequestException,
	Controller,
	Get,
	HttpCode,
	ParseIntPipe,
	Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CustomerPortalService } from './customer-portal.service';

@ApiTags('Customer Portal (Public)')
@Controller('customer-portal')
export class CustomerPortalController {
	constructor(
		private readonly customerPortalService: CustomerPortalService,
	) {}

	// Buscar cliente por cédula — devuelve todas las empresas/tiendas donde existe
	@Get('lookup')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Buscar cliente por cédula (endpoint público)',
	})
	@ApiQuery({ name: 'nationalId', type: String, required: true })
	async lookup(@Query('nationalId') nationalId: string) {
		if (!nationalId || nationalId.trim().length < 5) {
			throw new BadRequestException(
				'La cédula debe tener al menos 5 caracteres.',
			);
		}

		const result =
			await this.customerPortalService.lookupCustomer(nationalId);

		return {
			ok: true,
			message: 'Búsqueda realizada correctamente',
			data: { result },
		};
	}

	// Obtener saldo de bonos del cliente en una empresa/tienda específica
	@Get('bonus')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Obtener saldo de bonos del cliente (endpoint público)',
	})
	@ApiQuery({ name: 'customerId', type: Number, required: true })
	@ApiQuery({ name: 'companyId', type: Number, required: true })
	@ApiQuery({ name: 'storeId', type: Number, required: true })
	async getBonus(
		@Query('customerId', ParseIntPipe) customerId: number,
		@Query('companyId', ParseIntPipe) companyId: number,
		@Query('storeId', ParseIntPipe) storeId: number,
	) {
		const bonus = await this.customerPortalService.getBonus(
			customerId,
			companyId,
			storeId,
		);

		return {
			ok: true,
			message: 'Bonos obtenidos correctamente',
			data: { result: bonus },
		};
	}

	// Obtener historial completo de transacciones del cliente
	@Get('transactions')
	@HttpCode(200)
	@ApiOperation({
		summary:
			'Obtener historial de transacciones de bonos del cliente (endpoint público)',
	})
	@ApiQuery({ name: 'customerId', type: Number, required: true })
	@ApiQuery({ name: 'companyId', type: Number, required: true })
	@ApiQuery({ name: 'storeId', type: Number, required: true })
	async getTransactions(
		@Query('customerId', ParseIntPipe) customerId: number,
		@Query('companyId', ParseIntPipe) companyId: number,
		@Query('storeId', ParseIntPipe) storeId: number,
	) {
		const transactions = await this.customerPortalService.getTransactions(
			customerId,
			companyId,
			storeId,
		);

		return {
			ok: true,
			message: 'Historial de transacciones obtenido correctamente',
			data: { result: transactions },
		};
	}
}
