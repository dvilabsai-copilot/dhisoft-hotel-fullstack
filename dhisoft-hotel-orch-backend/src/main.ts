import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(helmet());
  app.use(compression());
  const configuredOrigins = config.get<string>('CORS_ORIGINS');
  const corsOrigins = (configuredOrigins ?? 'http://localhost:6080,http://127.0.0.1:6080')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0 && origin !== '*');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const swagger = new DocumentBuilder().setTitle('DHISOFT Hotel OS API').setDescription('RainWood-first multi-tenant hotel commerce platform').setVersion('0.1').addBearerAuth().build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
  const port = Number(config.get<string>('PORT') ?? 6006);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
