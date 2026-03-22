import {
	Controller,
	Get,
	Query,
	Res,
	UseGuards,
	ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/authorization-guard';
import { ReportsService } from './reports.service';
import { GetReportsDto } from './dto/get-reports.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('reports')
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	// 1. VENTAS
	@Get('sales')
	@ApiOperation({ summary: 'Reporte general de ventas (Paginado)' })
	async getSalesReport(@Query() getReportsDto: GetReportsDto) {
		return await this.reportsService.getSalesReport(getReportsDto);
	}

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
	@Get('inventory')
	@ApiOperation({ summary: 'Reporte de inventario y alertas (Paginado)' })
	async getInventoryReport(
		@Query() getReportsDto: GetReportsDto,
		@Query('lowStockThreshold', ParseIntPipe) lowStockThreshold: number = 5,
	) {
		return await this.reportsService.getInventoryReport(
			getReportsDto,
			lowStockThreshold,
		);
	}

	@Get('inventory/export')
	@ApiOperation({ summary: 'Exportar reporte de inventario a CSV' })
	async exportInventoryReport(
		@Query() getReportsDto: GetReportsDto,
		@Query('lowStockThreshold', ParseIntPipe) lowStockThreshold: number = 5,
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
	@Get('cash-closures')
	@ApiOperation({ summary: 'Reporte de cierres de caja (Paginado)' })
	async getCashClosuresReport(@Query() getReportsDto: GetReportsDto) {
		return await this.reportsService.getCashClosuresReport(getReportsDto);
	}

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
	@Get('top-selling')
	@ApiOperation({ summary: 'Reporte de productos más vendidos (Paginado)' })
	async getTopSellingProductsReport(@Query() getReportsDto: GetReportsDto) {
		return await this.reportsService.getTopSellingProductsReport(getReportsDto);
	}

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
}
