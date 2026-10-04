import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { compareSync, hashSync } from 'bcrypt';

export interface CustomerLookupResult {
	customerId: number;
	nationalId: string;
	firstName: string | null;
	lastName: string | null;
	phone: string | null;
	email: string | null;
	hasPassword: boolean;
	companyId: number;
	companyName: string;
	storeId: number;
	storeName: string;
	storeAddress: string | null;
}

export interface BonusResult {
	totalAmount: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface TransactionResult {
	id: number;
	amount: number;
	previousAmount: number;
	newAmount: number;
	saleId: number | null;
	createdAt: Date;
}

export interface CustomerPurchaseItem {
	id: number;
	productId: number;
	productName: string;
	productImage?: string | null;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
}

export interface CustomerPurchase {
	id: number;
	total: number;
	subtotal: number;
	discountTotal: number;
	claimBonus: boolean;
	status: string;
	channel: string;
	createdAt: Date;
	itemsCount: number;
	items: CustomerPurchaseItem[];
}

@Injectable()
export class CustomerPortalService {
	constructor(private readonly dataSource: DataSource) {}

	// Buscar cliente por cédula en todas las empresas y tiendas donde aparece
	async lookupCustomer(nationalId: string): Promise<CustomerLookupResult[]> {
		if (!nationalId || nationalId.trim().length < 5) {
			throw new BadRequestException(
				'La cédula debe tener al menos 5 caracteres.',
			);
		}

		try {
			const rows = await this.dataSource.query(
				`
				SELECT
					c.id              AS customer_id,
					c.national_id     AS national_id,
					c.first_name      AS first_name,
					c.last_name       AS last_name,
					c.phone           AS phone,
					c.email           AS email,
					(c.password IS NOT NULL) AS has_password,
					co.id             AS company_id,
					co.name           AS company_name,
					s.id              AS store_id,
					s.name            AS store_name,
					s.address         AS store_address
				FROM sys.customers c
				INNER JOIN sys.companies co ON co.id = c.company_id
				INNER JOIN sys.stores   s  ON s.id  = c.store_id
				WHERE c.national_id = $1
				  AND c.deleted_at IS NULL
				  AND co.status    = 'active'
				  AND s.deleted_at IS NULL
				ORDER BY co.name, s.name
				`,
				[nationalId.trim()],
			);

			return rows.map((row: any): CustomerLookupResult => ({
				customerId: Number(row.customer_id),
				nationalId: row.national_id,
				firstName: row.first_name ?? null,
				lastName: row.last_name ?? null,
				phone: row.phone ?? null,
				email: row.email ?? null,
				hasPassword: Boolean(row.has_password),
				companyId: Number(row.company_id),
				companyName: row.company_name,
				storeId: Number(row.store_id),
				storeName: row.store_name,
				storeAddress: row.store_address ?? null,
			}));
		} catch (error) {
			console.error(error);
			if (error instanceof BadRequestException) throw error;
			throw new InternalServerErrorException('Error al buscar el cliente');
		}
	}

	// Obtener el saldo de bonos del cliente en una empresa/tienda específica
	async getBonus(
		customerId: number,
		companyId: number,
		storeId: number,
	): Promise<BonusResult | null> {
		try {
			const rows = await this.dataSource.query(
				`
				SELECT
					total_amount  AS total_amount,
					created_at    AS created_at,
					updated_at    AS updated_at
				FROM sys.bonuses
				WHERE customer_id = $1
				  AND company_id  = $2
				  AND store_id    = $3
				LIMIT 1
				`,
				[customerId, companyId, storeId],
			);

			if (!rows || rows.length === 0) return null;

			const row = rows[0];
			return {
				totalAmount: Number(row.total_amount),
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			};
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Error al obtener los bonos');
		}
	}

	// Obtener el historial de transacciones del cliente (sin paginación, todas)
	async getTransactions(
		customerId: number,
		companyId: number,
		storeId: number,
	): Promise<TransactionResult[]> {
		try {
			const rows = await this.dataSource.query(
				`
				SELECT
					id               AS id,
					amount           AS amount,
					previous_amount  AS previous_amount,
					new_amount       AS new_amount,
					sale_id          AS sale_id,
					created_at       AS created_at
				FROM sys.bonus_transactions
				WHERE customer_id = $1
				  AND company_id  = $2
				  AND store_id    = $3
				ORDER BY created_at DESC
				`,
				[customerId, companyId, storeId],
			);

			return rows.map((row: any): TransactionResult => ({
				id: Number(row.id),
				amount: Number(row.amount),
				previousAmount: Number(row.previous_amount),
				newAmount: Number(row.new_amount),
				saleId: row.sale_id ? Number(row.sale_id) : null,
				createdAt: row.created_at,
			}));
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al obtener el historial de transacciones',
			);
		}
	}

	// Obtener el historial de compras del cliente con sus ítems
	async getPurchases(
		customerId: number,
		companyId: number,
		storeId: number,
	): Promise<CustomerPurchase[]> {
		try {
			const rows = await this.dataSource.query(
				`
				SELECT
					s.id              AS sale_id,
					s.total           AS total,
					s.subtotal        AS subtotal,
					s.discount_total  AS discount_total,
					s.status          AS status,
					s.channel         AS channel,
					s.claim_bonus     AS claim_bonus,
					s.created_at      AS created_at,
					si.id             AS item_id,
					si.quantity       AS quantity,
					si.unit_price     AS unit_price,
					si.line_total     AS line_total,
					si.product_id     AS product_id,
					COALESCE(p.name, 'Producto no disponible') AS product_name,
					p.image           AS product_image
				FROM sys.sales s
				LEFT JOIN sys.sale_items si ON si.sale_id = s.id
				LEFT JOIN sys.products p    ON p.id = si.product_id
				WHERE s.customer_id = $1
				  AND s.company_id  = $2
				  AND s.store_id    = $3
				  AND s.deleted_at IS NULL
				ORDER BY s.created_at DESC, si.id ASC
				`,
				[customerId, companyId, storeId],
			);

			const salesMap = new Map<number, CustomerPurchase>();

			for (const row of rows) {
				const saleId = Number(row.sale_id);
				if (!salesMap.has(saleId)) {
					salesMap.set(saleId, {
						id: saleId,
						total: Number(row.total),
						subtotal: Number(row.subtotal),
						discountTotal: Number(row.discount_total),
						claimBonus: Boolean(row.claim_bonus),
						status: row.status,
						channel: row.channel,
						createdAt: row.created_at,
						itemsCount: 0,
						items: [],
					});
				}

				if (row.item_id) {
					const purchase = salesMap.get(saleId)!;
					purchase.items.push({
						id: Number(row.item_id),
						productId: Number(row.product_id),
						productName: row.product_name,
						productImage: row.product_image ?? null,
						quantity: Number(row.quantity),
						unitPrice: Number(row.unit_price),
						lineTotal: Number(row.line_total),
					});
					purchase.itemsCount += Number(row.quantity);
				}
			}

			return Array.from(salesMap.values());
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al obtener el historial de compras',
			);
		}
	}

	// Requerimiento B1: Definir contraseña por primera vez o tras restablecimiento
	async setPassword(
		customerId: number,
		companyId: number,
		storeId: number,
		password: string,
	): Promise<{ ok: boolean; message: string }> {
		if (!password || password.trim().length < 6) {
			throw new BadRequestException(
				'La contraseña debe tener al menos 6 caracteres.',
			);
		}

		try {
			const rows = await this.dataSource.query(
				`SELECT id, company_id, password FROM sys.customers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
				[customerId, companyId],
			);

			if (!rows || rows.length === 0) {
				throw new NotFoundException('Cliente no encontrado');
			}

			if (rows[0].password) {
				throw new BadRequestException(
					'El cliente ya tiene una contraseña configurada. Inicia sesión con tu contraseña o solicita su restablecimiento en la tienda.',
				);
			}

			const hashedPassword = hashSync(password.trim(), 10);

			await this.dataSource.query(
				`UPDATE sys.customers SET password = $1, updated_at = now() WHERE id = $2`,
				[hashedPassword, customerId],
			);

			return {
				ok: true,
				message: 'Contraseña registrada correctamente.',
			};
		} catch (error) {
			console.error(error);
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				'Error al registrar la contraseña del cliente',
			);
		}
	}

	// Requerimiento B1: Verificar contraseña de cliente recurrente
	async verifyPassword(
		customerId: number,
		companyId: number,
		storeId: number,
		password: string,
	): Promise<{ ok: boolean; verified: boolean; message: string }> {
		if (!password) {
			throw new BadRequestException('La contraseña es requerida.');
		}

		try {
			const rows = await this.dataSource.query(
				`SELECT id, password FROM sys.customers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
				[customerId, companyId],
			);

			if (!rows || rows.length === 0) {
				throw new NotFoundException('Cliente no encontrado');
			}

			const customer = rows[0];

			if (!customer.password) {
				throw new BadRequestException(
					'El cliente no tiene una contraseña configurada. Por favor, crea una contraseña.',
				);
			}

			const isValid = compareSync(password, customer.password);

			if (!isValid) {
				throw new UnauthorizedException(
					'Contraseña incorrecta. Si la olvidaste, puedes solicitar su restablecimiento en la tienda.',
				);
			}

			return {
				ok: true,
				verified: true,
				message: 'Autenticación exitosa',
			};
		} catch (error) {
			console.error(error);
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException ||
				error instanceof UnauthorizedException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				'Error al verificar la contraseña',
			);
		}
	}
}
