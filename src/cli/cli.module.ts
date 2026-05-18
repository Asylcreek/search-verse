import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BullConfigModule } from '../config/bull-config.module';
import { validate } from '../env-validation/env.validation';
import { INGESTION_QUEUE } from '../ingestion/ingestion.constants';
import { IngestQueueEventsService } from './ingest-queue-events.service';
import { IngestCommand } from './ingest.command';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    BullConfigModule,
    BullModule.registerQueue({ name: INGESTION_QUEUE }),
  ],
  providers: [IngestCommand, IngestQueueEventsService],
})
export class CliModule {}
