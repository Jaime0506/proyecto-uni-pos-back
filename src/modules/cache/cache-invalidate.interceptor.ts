import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import {
	CacheInvalidateOptions,
	CacheOptions,
} from './interfaces/cache-options.interface';
import { CacheService } from './cache.service';
import { CacheKeyGenerator } from './utils/key-generator.util';
import type { Request } from 'express';

@Injectable()
export class CacheInvalidateInterceptor implements NestInterceptor {
	private readonly logger = new Logger(CacheInvalidateInterceptor.name);

	constructor(
		private readonly reflector: Reflector,
		private readonly cacheService: CacheService,
		private readonly keyGenerator: CacheKeyGenerator,
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const cacheInvalidateOptions = this.reflector.get<CacheInvalidateOptions>(
			'cache-invalidate',
			context.getHandler(),
		);

		if (!cacheInvalidateOptions) {
			return next.handle();
		}

		const request = context.switchToHttp().getRequest<Request>();
		const user = request.user as { userId?: string } | undefined;
		const userId = user?.userId;

		const dynamicKeys: string[] = [];

		if (cacheInvalidateOptions.key) {
			dynamicKeys.push(
				this.keyGenerator.generateKey(
					cacheInvalidateOptions as CacheOptions,
					request,
					userId,
				),
			);
		}

		if (cacheInvalidateOptions.caches) {
			cacheInvalidateOptions.caches.forEach((cacheConfig) => {
				if (cacheConfig.key) {
					dynamicKeys.push(
						this.keyGenerator.generateKey(
							cacheConfig as CacheOptions,
							request,
							userId,
						),
					);
				}
			});
		}

		return next.handle().pipe(
			tap(() => {
				const allKeys = [
					...(cacheInvalidateOptions.keys || []),
					...dynamicKeys,
				];

				if (
					allKeys.length > 0 ||
					(cacheInvalidateOptions.patterns &&
						cacheInvalidateOptions.patterns.length > 0)
				) {
					this.cacheService
						.invalidate(allKeys, cacheInvalidateOptions.patterns)
						.then((deletedKeys) => {
							if (deletedKeys.length > 0) {
								this.logger.debug(
									`Cache invalidated accurately for: ${deletedKeys.join(', ')}`,
								);
							}
						})
						.catch((error) => {
							this.logger.warn('Failed to invalidate cache:', error);
						});
				}
			}),
		);
	}
}
