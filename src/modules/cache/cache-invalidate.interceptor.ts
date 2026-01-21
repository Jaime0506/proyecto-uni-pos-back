import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { CacheInvalidateOptions } from './interfaces/cache-options.interface';
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

		// Generar keys dinámicas basadas en el request
		const dynamicKeys = this.generateDynamicKeys(
			cacheInvalidateOptions,
			request,
		);

		return next.handle().pipe(
			tap(() => {
				const allKeys = [
					...(cacheInvalidateOptions.keys || []),
					...dynamicKeys,
				];

				this.cacheService
					.invalidate(allKeys, cacheInvalidateOptions.patterns)
					.then((deletedCount) => {
						this.logger.debug(
							`Cache invalidated: ${deletedCount} keys/patterns`,
						);
					})
					.catch((error) => {
						this.logger.warn('Failed to invalidate cache:', error);
					});
			}),
		);
	}

	private generateDynamicKeys(
		options: CacheInvalidateOptions,
		request: Request,
	): string[] {
		const keys: string[] = [];

		// Generar keys basadas en params
		if (options.params) {
			options.params.forEach((param) => {
				const value = request.params[param];
				if (value) {
					keys.push(`${param}:${value}`);
				}
			});
		}

		// Generar keys basadas en query
		if (options.query) {
			options.query.forEach((param) => {
				const value = request.query[param];
				if (value !== undefined && value !== null) {
					let stringValue: string;
					if (Array.isArray(value)) {
						stringValue = value.map((v) => String(v as string)).join(',');
					} else if (typeof value === 'object') {
						stringValue = JSON.stringify(value);
					} else {
						stringValue = String(value);
					}
					keys.push(`${param}:${stringValue}`);
				}
			});
		}

		// Generar keys basadas en body
		if (options.body && request.body) {
			options.body.forEach((field) => {
				const body = request.body as Record<string, unknown>;
				const value = body[field];
				if (value !== undefined && value !== null) {
					let stringValue: string;
					if (typeof value === 'object') {
						stringValue = JSON.stringify(value);
					} else {
						stringValue = String(value as string);
					}
					keys.push(`${field}:${stringValue}`);
				}
			});
		}

		// Generar keys basadas en headers
		if (options.headers) {
			options.headers.forEach((header) => {
				const value = request.headers[header.toLowerCase()];
				if (value !== undefined) {
					let stringValue: string;
					if (Array.isArray(value)) {
						stringValue = value.join(',');
					} else {
						stringValue = String(value);
					}
					keys.push(`${header}:${stringValue}`);
				}
			});
		}

		// Generar keys basadas en userFields
		if (options.userFields && request.user) {
			const user = request.user as Record<string, unknown>;
			options.userFields.forEach((field) => {
				const value = user[field];
				if (value !== undefined && value !== null) {
					let stringValue: string;
					if (typeof value === 'object') {
						stringValue = JSON.stringify(value);
					} else {
						stringValue = String(value as string);
					}
					keys.push(`user:${field}:${stringValue}`);
				}
			});
		}

		return keys;
	}
}
