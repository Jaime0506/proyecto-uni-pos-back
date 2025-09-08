import { ConfigModule, ConfigService } from '@nestjs/config';
import {
	TypeOrmModuleAsyncOptions,
	TypeOrmModuleOptions,
} from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
	imports: [ConfigModule.forRoot({ isGlobal: true })],
	inject: [ConfigService],
	useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
		type: 'postgres',
		host: config.get<string>('NEON_HOST'),
		port: parseInt(config.get<string>('NEON_PORT') ?? '5432', 10),
		username: config.get<string>('NEON_USER'),
		password: config.get<string>('NEON_PASSWORD'),
		database: config.get<string>('NEON_DB'),
		schema: config.get<string>('NEON_SCHEMA') ?? 'sys', // esquema por defecto
		ssl: true,
		entities: [__dirname + '/../**/*.entity{.ts,.js}'],
		synchronize: false, // usamos migraciones
	}),
};
