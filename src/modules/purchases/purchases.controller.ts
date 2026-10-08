import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { GetPurchaseOrdersDto } from './dto/get-purchase-orders.dto';
import { CreateSupplierReceptionDto } from './dto/create-supplier-reception.dto';
import { GetReceptionsDto } from './dto/get-receptions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('purchases')
export class PurchasesController {
	constructor(private readonly purchasesService: PurchasesService) {}

	// 1. CREAR PEDIDO DE COMPRA
	@Post('orders')
	@RequirePermissions(['purchase_order:create'])
	@HttpCode(200)
	@ApiOperation({ summary: 'Registrar un nuevo pedido de compra a proveedor' })
	async createPurchaseOrder(
		@Body() dto: CreatePurchaseOrderDto,
		@Req() req: any,
	) {
		const userId = req.user?.id || req.user?.sub;
		return await this.purchasesService.createPurchaseOrder(dto, userId);
	}

	// 2. LISTAR PEDIDOS DE COMPRA
	@Get('orders')
	@RequirePermissions(['purchase_order:read'])
	@HttpCode(200)
	@ApiOperation({
		summary: 'Listar pedidos de compra con filtros y paginación',
	})
	async getPurchaseOrders(@Query() dto: GetPurchaseOrdersDto) {
		return await this.purchasesService.getPurchaseOrders(dto);
	}

	// 3. DETALLE DE UN PEDIDO DE COMPRA
	@Get('orders/:id')
	@RequirePermissions(['purchase_order:read'])
	@HttpCode(200)
	@ApiOperation({ summary: 'Consultar detalle de un pedido de compra' })
	async getPurchaseOrderById(@Param('id', ParseIntPipe) id: number) {
		return await this.purchasesService.getPurchaseOrderById(id);
	}

	// 4. CANCELAR PEDIDO DE COMPRA
	@Patch('orders/:id/cancel')
	@RequirePermissions(['purchase_order:cancel'])
	@HttpCode(200)
	@ApiOperation({ summary: 'Cancelar un pedido de compra no recibido' })
	async cancelPurchaseOrder(@Param('id', ParseIntPipe) id: number) {
		return await this.purchasesService.cancelPurchaseOrder(id);
	}

	// 5. REGISTRAR RECEPCIÓN DE MERCANCÍA
	@Post('receptions')
	@RequirePermissions(['reception:create'])
	@HttpCode(200)
	@ApiOperation({
		summary: 'Registrar entrega de mercancía y actualizar inventario',
	})
	async createSupplierReception(
		@Body() dto: CreateSupplierReceptionDto,
		@Req() req: any,
	) {
		const userId = req.user?.id || req.user?.sub;
		return await this.purchasesService.createSupplierReception(dto, userId);
	}

	// 6. LISTAR RECEPCIONES DE MERCANCÍA
	@Get('receptions')
	@RequirePermissions(['reception:read'])
	@HttpCode(200)
	@ApiOperation({ summary: 'Listar recepciones de mercancía' })
	async getSupplierReceptions(@Query() dto: GetReceptionsDto) {
		return await this.purchasesService.getSupplierReceptions(dto);
	}

	// 7. DETALLE DE UNA RECEPCIÓN DE MERCANCÍA
	@Get('receptions/:id')
	@RequirePermissions(['reception:read'])
	@HttpCode(200)
	@ApiOperation({ summary: 'Consultar detalle de una recepción de mercancía' })
	async getSupplierReceptionById(@Param('id', ParseIntPipe) id: number) {
		return await this.purchasesService.getSupplierReceptionById(id);
	}
}
