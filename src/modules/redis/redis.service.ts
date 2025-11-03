import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
	constructor(@InjectRedis() private readonly redis: Redis) {}

	/**
	 * Parsea un formato de tiempo (1s, 1m, 1h, 1d) a segundos
	 */
	private parseTimeToSeconds(timeStr: string): number {
		const match = timeStr.match(/^(\d+)([smhd])$/i);
		if (!match) {
			throw new Error(
				`Formato de tiempo inválido: ${timeStr}. Use formatos como: 1s, 1m, 1h, 1d`,
			);
		}

		const value = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();

		const multipliers: Record<string, number> = {
			s: 1, // segundos
			m: 60, // minutos
			h: 3600, // horas
			d: 86400, // días
		};

		return value * multipliers[unit];
	}

	/**
	 * Calcula un TTL con variación de ±10%
	 */
	private calculateTtlWithVariation(baseSeconds: number): number {
		// Variación de ±10%
		const variationPercent = 0.1;
		const delta = Math.floor(baseSeconds * variationPercent);
		const randomVariation = Math.floor(Math.random() * (delta * 2 + 1)) - delta; // [-delta, +delta]
		const finalTtl = baseSeconds + randomVariation;

		// Asegurar que el TTL sea al menos 1 segundo
		return Math.max(1, finalTtl);
	}

	/**
	 * Establece una key con un valor y tiempo de expiración
	 * @param key - La clave a establecer
	 * @param value - El valor a almacenar (puede ser string, objeto, etc.)
	 * @param expiration - Tiempo de expiración en formato: 1s, 1m, 1h, 1d
	 * @returns Promise que resuelve cuando la operación se completa
	 */
	async set(
		key: string,
		value: string | number | object,
		expiration?: string,
	): Promise<void> {
		const stringValue =
			typeof value === 'string'
				? value
				: typeof value === 'object'
					? JSON.stringify(value)
					: String(value);

		if (expiration) {
			const baseSeconds = this.parseTimeToSeconds(expiration);
			const ttl = this.calculateTtlWithVariation(baseSeconds);
			await this.redis.setex(key, ttl, stringValue);
		} else {
			await this.redis.set(key, stringValue);
		}
	}

	/**
	 * Obtiene el valor de una key
	 * @param key - La clave a obtener
	 * @returns Promise que resuelve con el valor o null si no existe
	 */
	async get(key: string): Promise<string | null> {
		return await this.redis.get(key);
	}

	/**
	 * Obtiene el valor de una key y lo parsea como JSON
	 * @param key - La clave a obtener
	 * @returns Promise que resuelve con el objeto parseado o null si no existe
	 */
	async getJson<T = any>(key: string): Promise<T | null> {
		const value = await this.redis.get(key);
		if (!value) return null;
		try {
			return JSON.parse(value) as T;
		} catch (error) {
			throw new Error(`Error al parsear JSON de la key ${key}: ${error}`);
		}
	}

	/**
	 * Elimina una o más keys
	 * @param keys - La(s) clave(s) a eliminar
	 * @returns Promise que resuelve con el número de keys eliminadas
	 */
	async del(...keys: string[]): Promise<number> {
		return await this.redis.del(...keys);
	}

	/**
	 * Verifica si una key existe
	 * @param key - La clave a verificar
	 * @returns Promise que resuelve con true si existe, false si no
	 */
	async exists(key: string): Promise<boolean> {
		const result = await this.redis.exists(key);
		return result === 1;
	}

	/**
	 * Establece el tiempo de expiración de una key existente
	 * @param key - La clave
	 * @param expiration - Tiempo de expiración en formato: 1s, 1m, 1h, 1d
	 * @returns Promise que resuelve con true si se estableció, false si la key no existe
	 */
	async expire(key: string, expiration: string): Promise<boolean> {
		const baseSeconds = this.parseTimeToSeconds(expiration);
		const ttl = this.calculateTtlWithVariation(baseSeconds);
		const result = await this.redis.expire(key, ttl);
		return result === 1;
	}

	/**
	 * Obtiene el tiempo de expiración restante de una key (en segundos)
	 * @param key - La clave
	 * @returns Promise que resuelve con el TTL en segundos, -1 si no tiene expiración, -2 si no existe
	 */
	async ttl(key: string): Promise<number> {
		return await this.redis.ttl(key);
	}
}
