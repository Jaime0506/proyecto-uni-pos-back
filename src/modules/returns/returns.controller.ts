import {
	Body,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Request,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ApproveReturnDto, RejectReturnDto } from './dto/review-return.dto';
import { GetAllReturnsDto } from './dto/get-all-returns.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermissions } from '../auth/authorization-guard';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('sales/returns')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReturnsController {
	constructor(private readonly returnsService: ReturnsService) {}

	@RequirePermissions({ anyOf: ['sale:read', 'return:create', 'return:read'] })
	@Post('eligibility')
	@ApiOperation({
		summary: 'Validar si una venta es apta para devolución y obtener saldos disponibles por producto',
	})
	async checkEligibility(
		@Body() body: { saleId: number; companyId?: number; storeId?: number },
	) {
		return await this.returnsService.checkEligibility(
			body.saleId,
			body.companyId,
			body.storeId,
		);
	}

	@RequirePermissions(['return:create'])
	@Post('create')
	@ApiOperation({
		summary: 'Registrar una solicitud de devolución granular (producto por producto)',
	})
	async createReturn(
		@Body() dto: CreateReturnRequestDto,
		@Request() req: { user: { userId: string } },
	) {
		const userId = req.user.userId;
		return await this.returnsService.createReturn(dto, userId, 'IN_STORE');
	}

	@RequirePermissions(['return:read'])
	@Post('get-all')
	@ApiOperation({
		summary: 'Consultar listado de devoluciones con filtros',
	})
	async getAllReturns(@Body() dto: GetAllReturnsDto) {
		return await this.returnsService.getAllReturns(dto);
	}

	@RequirePermissions(['return:read'])
	@Get(':id')
	@ApiOperation({
		summary: 'Consultar detalle completo de una devolución por ID',
	})
	async getReturnById(@Param('id', ParseIntPipe) id: number) {
		return await this.returnsService.getReturnById(id);
	}

	@RequirePermissions(['return:approve'])
	@Post(':id/approve')
	@ApiOperation({
		summary:
			'Aprobar solicitud de devolución: reintegra inventario físico si aplica y liquida reembolso (CASH o BONUS)',
	})
	async approveReturn(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: ApproveReturnDto,
		@Request() req: { user: { userId: string } },
	) {
		const userId = req.user.userId;
		return await this.returnsService.approveReturn(id, userId, dto);
	}

	@RequirePermissions(['return:reject'])
	@Post(':id/reject')
	@ApiOperation({
		summary: 'Rechazar solicitud de devolución con justificación formal',
	})
	async rejectReturn(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: RejectReturnDto,
		@Request() req: { user: { userId: string } },
	) {
		const userId = req.user.userId;
		return await this.returnsService.rejectReturn(id, userId, dto);
	}

	@RequirePermissions(['return:read'])
	@Get(':id/receipt-data')
	@ApiOperation({
		summary: 'Obtener datos formateados para impresión de comprobante digital en PDF',
	})
	async getReceiptData(@Param('id', ParseIntPipe) id: number) {
		return await this.returnsService.getReceiptData(id);
	}
}
