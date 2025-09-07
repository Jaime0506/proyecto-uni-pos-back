import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './database/typeorm.config';

@Module({
	imports: [TypeOrmModule.forRootAsync(typeOrmConfig)],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
