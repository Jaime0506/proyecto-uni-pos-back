import type { Request } from 'express';

export interface CacheOptions {
	key: string;
	ttl: string;
	params?: string[];
	query?: string[];
	body?: string[];
	headers?: string[];
	userId?: boolean;
	userFields?: string[];
	condition?: (req: Request) => boolean;
}

export interface CacheInvalidateOptions {
	keys?: string[];
	patterns?: string[];
	params?: string[];
	query?: string[];
	body?: string[];
	headers?: string[];
	userFields?: string[];
}
