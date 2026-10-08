import {
	Controller,
	Get,
	Query,
	Res,
	UseGuards,
	ParseIntPipe,
	DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
	PermissionGuard,
	RequirePermissions,
} from '../auth/authorization-guard';
import { ReportsService } from './reports.service';
import { GetReportsDto } from './dto/get-reports.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('reports')
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	// 1. VENTAS
	@RequirePermissions(['report:read'])
	@Get('sales')
	@ApiOperation({ summary: 'Reporte general de ventas (Paginado)' })
	async getSalesReport(@Query() getReportsDto: GetReportsDto) {
		return await this.reportsService.getSalesReport(getReportsDto);
	}

	@RequirePermissions(['report:read'])
	@Get('sales/export')
	@ApiOperation({ summary: 'Exportar reporte de ventas a CSV' })
	async exportSalesReport(
		@Query() getReportsDto: GetReportsDto,
		@Res() res: Response,
	) {
		const csvData = await this.reportsService.exportSalesReport(getReportsDto);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename=ventas.csv');
		res.send(csvData);
	}

	// 2. INVENTARIO
	@RequirePermissions(['report:read'])
	@Get('inventory')
	@ApiOperation({ summary: 'Reporte de inventario y alertas (Paginado)' })
	async getInventoryReport(
		@Query() getReportsDto: GetReportsDto,
		@Query('lowStockThreshold', new DefaultValuePipe(5), ParseIntPipe)
		lowStockThreshold: number,
	) {
		return await this.reportsService.getInventoryReport(
			getReportsDto,
			lowStockThreshold,
		);
	}

	@RequirePermissions(['report:read'])
	@Get('inventory/export')
	@ApiOperation({ summary: 'Exportar reporte de inventario a CSV' })
	async exportInventoryReport(
		@Query() getReportsDto: GetReportsDto,
		@Query('lowStockThreshold', new DefaultValuePipe(5), ParseIntPipe)
		lowStockThreshold: number,
		@Res() res: Response,
	) {
		const csvData = await this.reportsService.exportInventoryReport(
			getReportsDto,
			lowStockThreshold,
		);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename=inventario.csv');
		res.send(csvData);
	}

	// 3. CIERRES DE CAJA
	@RequirePermissions(['report:read'])
	@Get('cash-closures')
	@ApiOperation({ summary: 'Reporte de cierres de caja (Paginado)' })
	async getCashClosuresReport(@Query() getReportsDto: GetReportsDto) {
		return await this.reportsService.getCashClosuresReport(getReportsDto);
	}

	@RequirePermissions(['report:read'])
	@Get('cash-closures/export')
	@ApiOperation({ summary: 'Exportar reporte de cierres de caja a CSV' })
	async exportCashClosuresReport(
		@Query() getReportsDto: GetReportsDto,
		@Res() res: Response,
	) {
		const csvData =
			await this.reportsService.exportCashClosuresReport(getReportsDto);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename=cierres_caja.csv',
		);
		res.send(csvData);
	}

	// 4. MÁS VENDIDOS
	@RequirePermissions(['report:read'])
	@Get('top-selling')
	@ApiOperation({ summary: 'Reporte de productos más vendidos (Paginado)' })
	async getTopSellingProductsReport(@Query() getReportsDto: GetReportsDto) {
		return await this.reportsService.getTopSellingProductsReport(getReportsDto);
	}

	@RequirePermissions(['report:read'])
	@Get('top-selling/export')
	@ApiOperation({ summary: 'Exportar reporte de más vendidos a CSV' })
	async exportTopSellingProductsReport(
		@Query() getReportsDto: GetReportsDto,
		@Res() res: Response,
	) {
		const csvData =
			await this.reportsService.exportTopSellingProductsReport(getReportsDto);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename=mas_vendidos.csv',
		);
		res.send(csvData);
	}

	// 5. COMPRAS POR PROVEEDOR
	@RequirePermissions(['report:read'])
	@Get('purchases')
	@ApiOperation({ summary: 'Reporte de compras por proveedor (Paginado)' })
	async getPurchasesReport(@Query() getReportsDto: GetReportsDto) {
		return await this.reportsService.getPurchasesReport(getReportsDto);
	}

	@RequirePermissions(['report:read'])
	@Get('purchases/export')
	@ApiOperation({ summary: 'Exportar reporte de compras por proveedor a CSV' })
	async exportPurchasesReport(
		@Query() getReportsDto: GetReportsDto,
		@Res() res: Response,
	) {
		const csvData =
			await this.reportsService.exportPurchasesReport(getReportsDto);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename=compras_proveedores.csv',
		);
		res.send(csvData);
	}

	// 6. PRODUCTOS SUMINISTRADOS POR PROVEEDOR
	@RequirePermissions(['report:read'])
	@Get('supplier-products')
	@ApiOperation({
		summary: 'Reporte de productos suministrados por proveedor (Paginado)',
	})
	async getSupplierProductsReport(@Query() getReportsDto: GetReportsDto) {
		return await this.reportsService.getSupplierProductsReport(getReportsDto);
	}

	@RequirePermissions(['report:read'])
	@Get('supplier-products/export')
	@ApiOperation({
		summary: 'Exportar reporte de productos suministrados a CSV',
	})
	async exportSupplierProductsReport(
		@Query() getReportsDto: GetReportsDto,
		@Res() res: Response,
	) {
		const csvData =
			await this.reportsService.exportSupplierProductsReport(getReportsDto);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename=productos_suministrados.csv',
		);
		res.send(csvData);
	}
}
