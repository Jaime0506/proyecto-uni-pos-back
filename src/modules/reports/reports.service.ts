import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-items.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { GetReportsDto } from './dto/get-reports.dto';

@Injectable()
export class ReportsService {
	constructor(
		@InjectRepository(Sale)
		private readonly saleRepository: Repository<Sale>,
		@InjectRepository(SaleItem)
		private readonly saleItemRepository: Repository<SaleItem>,
		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>,
		@InjectRepository(Customer)
		private readonly customerRepository: Repository<Customer>,
	) {}

	// Utilidad generadora de CSV
	private generateCsv(data: any[], headers: string[]): string {
		if (!data || data.length === 0) {
			return headers.join(';') + '\n';
		}

		const csvRows: string[] = [];
		csvRows.push(headers.join(';'));

		for (const row of data) {
			const values = headers.map((header) => {
				const val =
					row[header] !== null && row[header] !== undefined ? row[header] : '';

				let strVal = String(val);

				// Reemplazar punto por coma en valores decimales para correcta interpretación en Excel
				if (typeof val === 'number') {
					strVal = strVal.replace('.', ',');
				} else if (typeof val === 'string' && /^-?\d*\.\d+$/.test(val)) {
					strVal = strVal.replace('.', ',');
				}

				// Escapar comillas dobles y envolver en comillas si hay punto y coma o saltos de línea
				if (
					strVal.includes(';') ||
					strVal.includes('"') ||
					strVal.includes('\n')
				) {
					return `"${strVal.replace(/"/g, '""')}"`;
				}
				return strVal;
			});
			csvRows.push(values.join(';'));
		}

		return csvRows.join('\n');
	}

	// -------------------------------------------------------------
	// 1. VENTAS
	// -------------------------------------------------------------
	async getSalesReport(dto: GetReportsDto) {
		const {
			companyId,
			storeId,
			startDate,
			endDate,
			page = 1,
			limit = 10,
		} = dto;

		const query = this.saleRepository
			.createQueryBuilder('sale')
			.leftJoinAndMapOne(
				'sale.customer',
				Customer,
				'customer',
				'customer.id = sale.customer_id',
			)
			.where('sale.company_id = :companyId', { companyId });

		if (storeId) {
			query.andWhere('sale.store_id = :storeId', { storeId });
		}
		if (startDate) {
			query.andWhere('sale.created_at >= :startDate', {
				startDate: new Date(startDate),
			});
		}
		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			query.andWhere('sale.created_at <= :endDate', { endDate: end });
		}

		query.orderBy('sale.created_at', 'DESC');

		const offset = (page - 1) * limit;
		query.skip(offset).take(limit);

		const [data, total] = await query.getManyAndCount();

		// Resumen total
		const totalsQuery = query.clone();
		totalsQuery.skip(0).take(undefined);
		// Limpiar el ORDER BY para evitar errores de agrupación en PostgreSQL
		totalsQuery.expressionMap.orderBys = {};
		const sumResult = await totalsQuery
			.select('SUM(sale.total)', 'totalAmount')
			.addSelect('SUM(sale.discount_total)', 'totalDiscount')
			.getRawOne<{ totalAmount: number; totalDiscount: number }>();

		return {
			ok: true,
			message: 'Reporte de ventas generado',
			data: {
				result: data,
				summary: {
					totalAmount: Number(sumResult?.totalAmount || 0),
					totalDiscount: Number(sumResult?.totalDiscount || 0),
				},
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			},
		};
	}

	async exportSalesReport(dto: GetReportsDto): Promise<string> {
		const { companyId, storeId, startDate, endDate } = dto;

		const query = this.saleRepository
			.createQueryBuilder('sale')
			.leftJoinAndMapOne(
				'sale.customer',
				Customer,
				'customer',
				'customer.id = sale.customer_id',
			)
			.where('sale.company_id = :companyId', { companyId });

		if (storeId) {
			query.andWhere('sale.store_id = :storeId', { storeId });
		}
		if (startDate) {
			query.andWhere('sale.created_at >= :startDate', {
				startDate: new Date(startDate),
			});
		}
		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			query.andWhere('sale.created_at <= :endDate', { endDate: end });
		}

		query.orderBy('sale.created_at', 'DESC');

		const data = await query.getMany();

		const formattedData = data.map((sale) => ({
			Fecha: new Date(sale.created_at).toISOString().split('T')[0],
			Hora: new Date(sale.created_at)
				.toISOString()
				.split('T')[1]
				.substring(0, 8),
			Sucursal: sale.store_id,
			Canal: sale.channel,
			Estado: sale.status,
			Cliente_ID: sale.customer_id || 'N/A',
			Cliente_Nombre: (sale as any).customer
				? `${(sale as any).customer.firstName || ''} ${(sale as any).customer.lastName || ''}`.trim()
				: 'N/A',
			Subtotal: sale.subtotal,
			Impuestos: sale.tax_total,
			Descuento: sale.discount_total,
			Total: sale.total,
		}));

		const headers = [
			'Fecha',
			'Hora',
			'Sucursal',
			'Canal',
			'Estado',
			'Cliente_ID',
			'Cliente_Nombre',
			'Subtotal',
			'Impuestos',
			'Descuento',
			'Total',
		];

		return this.generateCsv(formattedData, headers);
	}

	// -------------------------------------------------------------
	// 2. INVENTARIO
	// -------------------------------------------------------------
	async getInventoryReport(dto: GetReportsDto, lowStockThreshold: number) {
		const { companyId, page = 1, limit = 10 } = dto;

		const query = this.productRepository
			.createQueryBuilder('product')
			.leftJoinAndSelect('product.category', 'category')
			.where('product.company_id = :companyId', { companyId });

		query.orderBy('product.stock', 'ASC');

		const offset = (page - 1) * limit;
		query.skip(offset).take(limit);

		const [data, total] = await query.getManyAndCount();

		const result = data.map((p) => ({
			...p,
			isLowStock: p.stock <= lowStockThreshold,
		}));

		return {
			ok: true,
			message: 'Reporte de inventario generado',
			data: {
				result,
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			},
		};
	}

	async exportInventoryReport(
		dto: GetReportsDto,
		lowStockThreshold: number,
	): Promise<string> {
		const { companyId } = dto;

		const query = this.productRepository
			.createQueryBuilder('product')
			.leftJoinAndSelect('product.category', 'category')
			.where('product.company_id = :companyId', { companyId });

		query.orderBy('product.stock', 'ASC');

		const data = await query.getMany();

		const formattedData = data.map((p) => ({
			ID: p.id,
			Nombre: p.name,
			SKU: p.sku || 'N/A',
			Codigo_Barras: p.barcode || 'N/A',
			Categoria: p.category ? p.category.name : 'N/A',
			Precio_Compra: p.purchasePrice,
			Precio_Venta: p.salePrice,
			Exento_Impuesto: p.taxExempt ? 'SI' : 'NO',
			Stock: p.stock,
			Alerta_Stock_Bajo: p.stock <= lowStockThreshold ? 'SI' : 'NO',
		}));

		const headers = [
			'ID',
			'Nombre',
			'SKU',
			'Codigo_Barras',
			'Categoria',
			'Precio_Compra',
			'Precio_Venta',
			'Exento_Impuesto',
			'Stock',
			'Alerta_Stock_Bajo',
		];

		return this.generateCsv(formattedData, headers);
	}

	// -------------------------------------------------------------
	// 3. CIERRES DE CAJA (Agrupado por día y usuario)
	// -------------------------------------------------------------
	async getCashClosuresReport(dto: GetReportsDto) {
		const {
			companyId,
			storeId,
			startDate,
			endDate,
			page = 1,
			limit = 10,
		} = dto;

		const query = this.saleRepository
			.createQueryBuilder('sale')
			.select('DATE(sale.created_at)', 'date')
			.addSelect('sale.store_id', 'store_id')
			.addSelect('sale.user_id', 'user_id')
			.addSelect('COUNT(sale.id)', 'total_sales_count')
			.addSelect('SUM(sale.total)', 'total_amount')
			.addSelect('SUM(sale.discount_total)', 'total_discount')
			.where('sale.company_id = :companyId', { companyId });

		if (storeId) {
			query.andWhere('sale.store_id = :storeId', { storeId });
		}
		if (startDate) {
			query.andWhere('sale.created_at >= :startDate', {
				startDate: new Date(startDate),
			});
		}
		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			query.andWhere('sale.created_at <= :endDate', { endDate: end });
		}

		query
			.groupBy('DATE(sale.created_at)')
			.addGroupBy('sale.store_id')
			.addGroupBy('sale.user_id');

		query.orderBy('date', 'DESC');

		// Obtener total de grupos para la paginación (usando subquery o contando keys)
		const countQuery = query.clone();
		const rawCount = await countQuery.getRawMany();
		const total = rawCount.length;

		const offset = (page - 1) * limit;
		query.offset(offset).limit(limit);

		const data = await query.getRawMany();

		// Convertir strings numericos a numeros, parsear fechas
		const formattedData = data.map((row) => ({
			fecha: row.date,
			fechaString: new Date(row.date).toISOString().split('T')[0],
			storeId: row.store_id,
			userId: row.user_id || 'Desconocido',
			cantidadVentas: Number(row.total_sales_count),
			ingresoTotal: Number(row.total_amount || 0),
			descuentosTotal: Number(row.total_discount || 0),
		}));

		return {
			ok: true,
			message: 'Reporte de cierres de caja generado',
			data: {
				result: formattedData,
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			},
		};
	}

	async exportCashClosuresReport(dto: GetReportsDto): Promise<string> {
		const resultGroup = await this.getCashClosuresReport({
			...dto,
			page: 1,
			limit: 99999999,
		});
		const data = resultGroup.data.result;

		const formattedData = data.map((item) => ({
			Fecha: item.fechaString,
			Sucursal: item.storeId,
			Usuario_ID: item.userId,
			Ventas_Totales: item.cantidadVentas,
			Descuentos_Acumulados: item.descuentosTotal,
			Ingreso_Total: item.ingresoTotal,
		}));

		const headers = [
			'Fecha',
			'Sucursal',
			'Usuario_ID',
			'Ventas_Totales',
			'Descuentos_Acumulados',
			'Ingreso_Total',
		];

		return this.generateCsv(formattedData, headers);
	}

	// -------------------------------------------------------------
	// 4. MÁS VENDIDOS
	// -------------------------------------------------------------
	async getTopSellingProductsReport(dto: GetReportsDto) {
		const {
			companyId,
			storeId,
			startDate,
			endDate,
			page = 1,
			limit = 10,
		} = dto;

		const query = this.saleItemRepository
			.createQueryBuilder('si')
			.innerJoin(Sale, 's', 's.id = si.sale_id')
			.innerJoin(Product, 'p', 'p.id = si.product_id')
			.select('p.id', 'product_id')
			.addSelect('p.name', 'product_name')
			.addSelect('p.sku', 'product_sku')
			.addSelect('SUM(si.quantity)', 'total_quantity_sold')
			.addSelect('SUM(si.line_total)', 'total_revenue')
			.where('s.company_id = :companyId', { companyId });

		if (storeId) {
			query.andWhere('s.store_id = :storeId', { storeId });
		}
		if (startDate) {
			query.andWhere('s.created_at >= :startDate', {
				startDate: new Date(startDate),
			});
		}
		if (endDate) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			query.andWhere('s.created_at <= :endDate', { endDate: end });
		}

		query.groupBy('p.id').addGroupBy('p.name').addGroupBy('p.sku');

		query.orderBy('total_quantity_sold', 'DESC');

		const countQuery = query.clone();
		const rawCount = await countQuery.getRawMany();
		const total = rawCount.length;

		const offset = (page - 1) * limit;
		query.offset(offset).limit(limit);

		const data = await query.getRawMany();

		const formattedData = data.map((row) => ({
			productId: row.product_id,
			productName: row.product_name,
			productSku: row.product_sku || 'N/A',
			quantitySold: Number(row.total_quantity_sold || 0),
			revenue: Number(row.total_revenue || 0),
		}));

		return {
			ok: true,
			message: 'Reporte de productos más vendidos generado',
			data: {
				result: formattedData,
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			},
		};
	}

	async exportTopSellingProductsReport(dto: GetReportsDto): Promise<string> {
		const resultGroup = await this.getTopSellingProductsReport({
			...dto,
			page: 1,
			limit: 99999999,
		});
		const data = resultGroup.data.result;

		const formattedData = data.map((item) => ({
			Producto_ID: item.productId,
			Nombre: item.productName,
			SKU: item.productSku,
			Cantidad_Vendida: item.quantitySold,
			Ingresos_Totales: item.revenue,
		}));

		const headers = [
			'Producto_ID',
			'Nombre',
			'SKU',
			'Cantidad_Vendida',
			'Ingresos_Totales',
		];

		return this.generateCsv(formattedData, headers);
	}
}
