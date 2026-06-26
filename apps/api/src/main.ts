import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Env } from './common/config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.getHttpAdapter().getInstance().set('query parser', 'extended');
  const config = app.get(ConfigService<Env, true>);

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  // La validation des entrées passe par ZodValidationPipe au niveau des routes.
  app.enableShutdownHooks();

  const port =
    config.get('PORT', { infer: true }) ?? config.get('API_PORT', { infer: true }) ?? 4000;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
