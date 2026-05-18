import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ApiBibleModule } from '../api-bible/api-bible.module';
import { DatabaseModule } from '../database/database.module';
import { INGESTION_QUEUE } from './ingestion.constants';
import { IngestionController } from './ingestion.controller';
import { IngestionProcessor } from './ingestion.processor';
import { IngestionService } from './ingestion.service';
import { RefreshScheduler } from './refresh.scheduler';

@Module({
  imports: [
    ApiBibleModule,
    DatabaseModule,
    BullModule.registerQueue({ name: INGESTION_QUEUE }),
  ],
  controllers: [IngestionController],
  providers: [IngestionService, IngestionProcessor, RefreshScheduler],
})
export class IngestionModule {}
