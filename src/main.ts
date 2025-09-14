import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const config = new DocumentBuilder()
		.setTitle('Proyecto Uni Pos')
		.setDescription('API del proyecto Uni Pos')
		.setVersion('1.0')
		.addBearerAuth()
		.build();

	const documentFactory = () => SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, documentFactory);

	app.useGlobalPipes(new ValidationPipe());
	app.setGlobalPrefix('api/v1');

	await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(console.error);
