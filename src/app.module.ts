import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApiBibleModule } from './api-bible/api-bible.module';
import { DatabaseModule } from './database/database.module';
import { validate } from './env-validation/env.validation';
import { GlobalExceptionFilter } from './utils/global-exception.filter';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate }), DatabaseModule, ApiBibleModule],
  controllers: [],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
