import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { CacheGuard } from '../cache.guard';
import { CacheOptions } from '../interfaces/cache-options.interface';

export const Cache = (options: CacheOptions) => {
	return applyDecorators(SetMetadata('cache', options), UseGuards(CacheGuard));
};
