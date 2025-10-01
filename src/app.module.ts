import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './database/typeorm.config';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RedisModule } from './infra/redis/redis.module';
import { AuthorizationModule } from './auth/authorization/authorization.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
		TypeOrmModule.forRootAsync(typeOrmConfig),
		RedisModule,
		AuthModule,
		UserModule,
		AuthorizationModule,
	],
	controllers: [],
})
export class AppModule {}
