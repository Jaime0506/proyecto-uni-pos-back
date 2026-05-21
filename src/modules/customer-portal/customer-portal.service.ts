import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface CustomerLookupResult {
	customerId: number;
	nationalId: string;
	firstName: string | null;
	lastName: string | null;
	phone: string | null;
	email: string | null;
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

			return rows.map(
				(row: any): CustomerLookupResult => ({
					customerId: Number(row.customer_id),
					nationalId: row.national_id,
					firstName: row.first_name ?? null,
					lastName: row.last_name ?? null,
					phone: row.phone ?? null,
					email: row.email ?? null,
					companyId: Number(row.company_id),
					companyName: row.company_name,
					storeId: Number(row.store_id),
					storeName: row.store_name,
					storeAddress: row.store_address ?? null,
				}),
			);
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

			return rows.map(
				(row: any): TransactionResult => ({
					id: Number(row.id),
					amount: Number(row.amount),
					previousAmount: Number(row.previous_amount),
					newAmount: Number(row.new_amount),
					saleId: row.sale_id ? Number(row.sale_id) : null,
					createdAt: row.created_at,
				}),
			);
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException(
				'Error al obtener el historial de transacciones',
			);
		}
	}
}
