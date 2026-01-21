import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { CacheKeyGenerator } from './utils/key-generator.util';
import { CacheOptions } from './interfaces/cache-options.interface';
import type { Request } from 'express';

@Injectable()
export class CacheService {
	private readonly logger = new Logger(CacheService.name);

	constructor(
		private readonly redisService: RedisService,
		private readonly keyGenerator: CacheKeyGenerator,
	) {}

	async get<T>(key: string): Promise<T | null> {
		try {
			return await this.redisService.getJson<T>(key);
		} catch (error) {
			this.logger.warn(`Cache read failed for key ${key}:`, error);
			return null;
		}
	}

	async set(
		key: string,
		value: string | number | object,
		ttl: string,
	): Promise<void> {
		try {
			await this.redisService.set(key, value, ttl);
		} catch (error) {
			this.logger.warn(`Cache write failed for key ${key}:`, error);
		}
	}

	async invalidate(keys?: string[], patterns?: string[]): Promise<number> {
		let totalDeleted = 0;

		if (keys && keys.length > 0) {
			try {
				totalDeleted += await this.redisService.del(...keys);
			} catch (error) {
				this.logger.warn('Cache invalidate failed for keys:', error);
			}
		}

		if (patterns && patterns.length > 0) {
			totalDeleted += await this.invalidateByPatterns(patterns);
		}

		return totalDeleted;
	}

	private async invalidateByPatterns(patterns: string[]): Promise<number> {
		let totalDeleted = 0;

		for (const pattern of patterns) {
			try {
				const keys = await this.redisService.scanKeys(pattern);
				if (keys.length > 0) {
					totalDeleted += await this.redisService.del(...keys);
				}
			} catch (error) {
				this.logger.warn(
					`Cache invalidate failed for pattern ${pattern}:`,
					error,
				);
			}
		}

		return totalDeleted;
	}

	generateKey(options: CacheOptions, req: Request, userId?: string): string {
		return this.keyGenerator.generateKey(options, req, userId);
	}
}
