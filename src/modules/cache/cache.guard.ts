import {
	Injectable,
	ExecutionContext,
	CanActivate,
	Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from './cache.service';
import { CacheOptions } from './interfaces/cache-options.interface';

@Injectable()
export class CacheGuard implements CanActivate {
	private readonly logger = new Logger(CacheGuard.name);

	constructor(
		private readonly cacheService: CacheService,
		private readonly reflector: Reflector,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const response = context.switchToHttp().getResponse();

		const cacheOptions = this.reflector.get<CacheOptions>(
			'cache',
			context.getHandler(),
		);

		if (!cacheOptions) return true;

		if (cacheOptions.condition && !cacheOptions.condition(request)) {
			return true;
		}

		const user = request.user as { userId?: string } | undefined;
		const userId = user?.userId;
		const key = this.cacheService.generateKey(cacheOptions, request, userId);

		const cachedResponse = await this.cacheService.get(key);
		if (cachedResponse) {
			this.logger.debug(`Cache HIT: ${key}`);
			(response.json as (body: unknown) => unknown)(cachedResponse);
			return false;
		}

		this.logger.debug(`Cache MISS: ${key}`);
		const originalJson = response.json as (body: unknown) => unknown;
		response.json = (body: unknown) => {
			this.cacheService.set(key, body, cacheOptions.ttl).catch((error) => {
				this.logger.warn(`Failed to cache response for key ${key}:`, error);
			});
			return originalJson.call(response, body);
		};

		return true;
	}
}
