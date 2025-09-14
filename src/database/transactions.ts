import { DataSource, QueryRunner } from 'typeorm';

/**
 * Función genérica para procesar transacciones de base de datos
 * @param dataSource - El DataSource de TypeORM
 * @param transactionCallback - Función que contiene las operaciones a ejecutar en la transacción
 * @returns Promise con el resultado de la transacción
 */
export async function processTransaction<T>(
	dataSource: DataSource,
	transactionCallback: (queryRunner: QueryRunner) => Promise<T>,
): Promise<T> {
	const queryRunner: QueryRunner = dataSource.createQueryRunner();

	await queryRunner.connect();
	await queryRunner.startTransaction();

	try {
		// Ejecutar las operaciones dentro de la transacción
		const result = await transactionCallback(queryRunner);

		// Si todo salió bien, hacer commit
		await queryRunner.commitTransaction();

		return result;
	} catch (error) {
		// Si hay error, hacer rollback
		await queryRunner.rollbackTransaction();
		throw error;
	} finally {
		// Siempre liberar la conexión
		await queryRunner.release();
	}
}

/**
 * Función helper para ejecutar queries simples en una transacción
 * @param dataSource - El DataSource de TypeORM
 * @param query - Query SQL a ejecutar
 * @param parameters - Parámetros para el query (opcional)
 * @returns Promise con el resultado del query
 */
export async function executeQueryInTransaction<T = unknown>(
	dataSource: DataSource,
	query: string,
	parameters?: unknown[],
): Promise<T> {
	return processTransaction(dataSource, async (queryRunner) => {
		return (await queryRunner.query(query, parameters)) as T;
	});
}

/**
 * Función helper para ejecutar múltiples queries en una sola transacción
 * @param dataSource - El DataSource de TypeORM
 * @param queries - Array de objetos con query y parámetros
 * @returns Promise con los resultados de todos los queries
 */
export async function executeMultipleQueriesInTransaction<T = unknown>(
	dataSource: DataSource,
	queries: Array<{ query: string; parameters?: unknown[] }>,
): Promise<T[]> {
	return processTransaction(dataSource, async (queryRunner) => {
		const results: T[] = [];

		for (const { query, parameters } of queries) {
			const result = (await queryRunner.query(query, parameters)) as T;
			results.push(result);
		}

		return results;
	});
}
