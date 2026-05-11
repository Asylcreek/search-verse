import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import morgan from 'morgan';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: true, credentials: true },
  });

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  await app.listen(process.env.PORT ?? 4000);

  process.on('unhandledRejection', async (reason: any) => {
    console.error(`Unhandled rejection, reason: ${reason.message}`);

    await app.close();
  });

  process.on('SIGTERM', async () => {
    console.info('SIGTERM signal received. Shutting down...');

    await app.close();
  });
}

bootstrap();
