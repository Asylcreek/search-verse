import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Queue } from 'bullmq';

import { IngestDto } from './dto/ingest.dto';
import { INGESTION_QUEUE, INGEST_JOB } from './ingestion.constants';

@Controller('translations')
export class IngestionController {
  constructor(@InjectQueue(INGESTION_QUEUE) private readonly queue: Queue) {}

  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  async ingest(@Body() dto: IngestDto): Promise<{ jobId: string }> {
    const job = await this.queue.add(INGEST_JOB, { bibleId: dto.bibleId });
    if (!job.id) {
      throw new Error('Failed to enqueue ingestion job: job ID is missing');
    }
    return { jobId: job.id };
  }
}
