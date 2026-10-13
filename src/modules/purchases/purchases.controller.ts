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
import { Request } from 'express';
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
import { RequestUser } from 'src/types/global';

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
		@Req() req: Request & { user: RequestUser },
	) {
		const userId = req.user?.userId || (req as any).user?.id || (req as any).user?.sub;
		return await this.purchasesService.createPurchaseOrder(dto, userId, req.user);
	}

	// 2. LISTAR PEDIDOS DE COMPRA
	@Get('orders')
	@RequirePermissions(['purchase_order:read'])
	@HttpCode(200)
	@ApiOperation({
		summary: 'Listar pedidos de compra con filtros y paginación',
	})
	async getPurchaseOrders(
		@Query() dto: GetPurchaseOrdersDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.purchasesService.getPurchaseOrders(dto, req.user);
	}

	// 3. DETALLE DE UN PEDIDO DE COMPRA
	@Get('orders/:id')
	@RequirePermissions(['purchase_order:read'])
	@HttpCode(200)
	@ApiOperation({ summary: 'Consultar detalle de un pedido de compra' })
	async getPurchaseOrderById(
		@Param('id', ParseIntPipe) id: number,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.purchasesService.getPurchaseOrderById(id, req.user);
	}

	// 4. CANCELAR PEDIDO DE COMPRA
	@Patch('orders/:id/cancel')
	@RequirePermissions(['purchase_order:cancel'])
	@HttpCode(200)
	@ApiOperation({ summary: 'Cancelar un pedido de compra no recibido' })
	async cancelPurchaseOrder(
		@Param('id', ParseIntPipe) id: number,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.purchasesService.cancelPurchaseOrder(id, req.user);
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
		@Req() req: Request & { user: RequestUser },
	) {
		const userId = req.user?.userId || (req as any).user?.id || (req as any).user?.sub;
		return await this.purchasesService.createSupplierReception(dto, userId, req.user);
	}

	// 6. LISTAR RECEPCIONES DE MERCANCÍA
	@Get('receptions')
	@RequirePermissions(['reception:read'])
	@HttpCode(200)
	@ApiOperation({ summary: 'Listar recepciones de mercancía' })
	async getSupplierReceptions(
		@Query() dto: GetReceptionsDto,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.purchasesService.getSupplierReceptions(dto, req.user);
	}

	// 7. DETALLE DE UNA RECEPCIÓN DE MERCANCÍA
	@Get('receptions/:id')
	@RequirePermissions(['reception:read'])
	@HttpCode(200)
	@ApiOperation({ summary: 'Consultar detalle de una recepción de mercancía' })
	async getSupplierReceptionById(
		@Param('id', ParseIntPipe) id: number,
		@Req() req: Request & { user: RequestUser },
	) {
		return await this.purchasesService.getSupplierReceptionById(id, req.user);
	}
}
