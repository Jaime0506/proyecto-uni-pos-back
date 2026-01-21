import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { CacheInvalidateInterceptor } from '../cache-invalidate.interceptor';
import { CacheInvalidateOptions } from '../interfaces/cache-options.interface';

export const CacheInvalidate = (options: CacheInvalidateOptions) => {
	return applyDecorators(
		SetMetadata('cache-invalidate', options),
		UseInterceptors(CacheInvalidateInterceptor),
	);
};
