import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { CacheOptions } from '../interfaces/cache-options.interface';

@Injectable()
export class CacheKeyGenerator {
	generateKey(options: CacheOptions, req: Request, userId?: string): string {
		const parts = [options.key];

		if (options.userId && userId) {
			parts.push(`user:${userId}`);
		}

		if (options.userFields && req.user) {
			const user = req.user as Record<string, unknown>;
			options.userFields.forEach((field) => {
				const value = user[field];
				if (value !== undefined && value !== null) {
					let stringValue: string;
					if (typeof value === 'object') {
						stringValue = JSON.stringify(value);
					} else {
						stringValue = String(value as string);
					}
					parts.push(`user:${field}:${stringValue}`);
				}
			});
		}

		if (options.body && req.body) {
			options.body.forEach((field) => {
				const body = req.body as Record<string, unknown>;
				const value = body[field];
				if (value !== undefined && value !== null) {
					parts.push(`${field}:${String(value as string)}`);
				}
			});
		}

		if (options.headers) {
			options.headers.forEach((header) => {
				const value = req.headers[header.toLowerCase()];
				if (value !== undefined) {
					let stringValue: string;
					if (Array.isArray(value)) {
						stringValue = value.join(',');
					} else {
						stringValue = String(value);
					}
					parts.push(`${header}:${stringValue}`);
				}
			});
		}

		return parts.join(':');
	}
}
