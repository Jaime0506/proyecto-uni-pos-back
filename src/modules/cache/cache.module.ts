import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheKeyGenerator } from './utils/key-generator.util';
import { CacheInvalidateInterceptor } from './cache-invalidate.interceptor';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
	imports: [RedisModule],
	providers: [CacheService, CacheKeyGenerator, CacheInvalidateInterceptor],
	exports: [CacheService, CacheKeyGenerator, CacheInvalidateInterceptor],
})
export class CacheModule {}
