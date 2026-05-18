import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { ApiBibleModule } from './api-bible/api-bible.module';
import { BullConfigModule } from './config/bull-config.module';
import { DatabaseModule } from './database/database.module';
import { validate } from './env-validation/env.validation';
import { IngestionModule } from './ingestion/ingestion.module';
import { GlobalExceptionFilter } from './utils/global-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    BullConfigModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    ApiBibleModule,
    IngestionModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        stopAtFirstError: true,
      }),
    },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
