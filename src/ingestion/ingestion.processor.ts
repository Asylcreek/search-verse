import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { INGESTION_QUEUE } from './ingestion.constants';
import { IngestionService } from './ingestion.service';

@Processor(INGESTION_QUEUE)
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private readonly ingestion: IngestionService) {
    super();
  }

  async process(job: Job<{ bibleId: string }>): Promise<void> {
    this.logger.log(`Job ${job.id}: ingesting ${job.data.bibleId}`);
    await this.ingestion.ingest(job.data.bibleId);
    this.logger.log(`Job ${job.id}: complete`);
  }
}
