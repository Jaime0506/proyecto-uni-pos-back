import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	ParseIntPipe,
	Post,
	Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CustomerPortalService } from './customer-portal.service';
import { SetCustomerPasswordDto } from './dto/set-customer-password.dto';
import { VerifyCustomerPasswordDto } from './dto/verify-customer-password.dto';

@ApiTags('Customer Portal (Public)')
@Controller('customer-portal')
export class CustomerPortalController {
	constructor(private readonly customerPortalService: CustomerPortalService) {}

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

		const result = await this.customerPortalService.lookupCustomer(nationalId);

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

	// Obtener historial completo de compras del cliente con detalle de productos
	@Get('purchases')
	@HttpCode(200)
	@ApiOperation({
		summary:
			'Obtener historial de compras del cliente con detalle de productos (endpoint público)',
	})
	@ApiQuery({ name: 'customerId', type: Number, required: true })
	@ApiQuery({ name: 'companyId', type: Number, required: true })
	@ApiQuery({ name: 'storeId', type: Number, required: true })
	async getPurchases(
		@Query('customerId', ParseIntPipe) customerId: number,
		@Query('companyId', ParseIntPipe) companyId: number,
		@Query('storeId', ParseIntPipe) storeId: number,
	) {
		const purchases = await this.customerPortalService.getPurchases(
			customerId,
			companyId,
			storeId,
		);

		return {
			ok: true,
			message: 'Historial de compras obtenido correctamente',
			data: { result: purchases },
		};
	}

	// Requerimiento B1: Establecer contraseña por primera vez o tras restablecimiento
	@Post('set-password')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Definir contraseña de acceso del cliente (endpoint público)',
	})
	async setPassword(@Body() dto: SetCustomerPasswordDto) {
		const result = await this.customerPortalService.setPassword(
			dto.customerId,
			dto.companyId,
			dto.storeId,
			dto.password,
		);

		return {
			ok: true,
			message: result.message,
		};
	}

	// Requerimiento B1: Verificar contraseña de cliente recurrente
	@Post('verify-password')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Verificar contraseña de acceso del cliente (endpoint público)',
	})
	async verifyPassword(@Body() dto: VerifyCustomerPasswordDto) {
		const result = await this.customerPortalService.verifyPassword(
			dto.customerId,
			dto.companyId,
			dto.storeId,
			dto.password,
		);

		return {
			ok: true,
			message: result.message,
			data: { verified: result.verified },
		};
	}

	// Obtener historial completo de devoluciones del cliente
	@Get('returns')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Obtener historial de devoluciones del cliente (endpoint público)',
	})
	@ApiQuery({ name: 'customerId', type: Number, required: true })
	@ApiQuery({ name: 'companyId', type: Number, required: true })
	@ApiQuery({ name: 'storeId', type: Number, required: true })
	async getReturns(
		@Query('customerId', ParseIntPipe) customerId: number,
		@Query('companyId', ParseIntPipe) companyId: number,
		@Query('storeId', ParseIntPipe) storeId: number,
	) {
		const returns = await this.customerPortalService.getReturns(
			customerId,
			companyId,
			storeId,
		);

		return {
			ok: true,
			message: 'Historial de devoluciones obtenido correctamente',
			data: { result: returns },
		};
	}
}
