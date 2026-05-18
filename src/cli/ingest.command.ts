import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Command, CommandRunner, Option } from 'nest-commander';

import { INGESTION_QUEUE, INGEST_JOB } from '../ingestion/ingestion.constants';
import { IngestQueueEventsService } from './ingest-queue-events.service';

@Command({
  name: 'ingest',
  description: 'Ingest a Bible translation into the database',
})
export class IngestCommand extends CommandRunner {
  constructor(
    @InjectQueue(INGESTION_QUEUE) private readonly queue: Queue,
    private readonly queueEvents: IngestQueueEventsService
  ) {
    super();
  }

  @Option({
    flags: '--bible-id <bibleId>',
    description: 'api.bible Bible ID to ingest',
  })
  parseBibleId(val: string): string {
    const trimmed = val.trim();
    if (!trimmed) {
      throw new Error('--bible-id value cannot be empty or whitespace-only');
    }
    return trimmed;
  }

  async run(_params: string[], options: { bibleId?: string }): Promise<void> {
    if (!options.bibleId) {
      throw new Error('--bible-id is required');
    }

    const job = await this.queue.add(INGEST_JOB, {
      bibleId: options.bibleId,
    });
    console.log(
      `Job ${job.id} enqueued for ${options.bibleId}. Waiting for completion...`
    );

    const queueEvents = this.queueEvents.create();
    let queueEventsClosed = false;
    const closeQueueEventsOnce = async () => {
      if (queueEventsClosed) return;
      queueEventsClosed = true;
      await queueEvents.close();
    };
    const closeQueueEvents = () => {
      void closeQueueEventsOnce();
    };
    process.once('SIGINT', closeQueueEvents);
    process.once('SIGTERM', closeQueueEvents);

    try {
      await job.waitUntilFinished(queueEvents);
      console.log(`Ingestion complete for ${options.bibleId}`);
    } catch (err) {
      throw new Error(
        `Ingestion failed for ${options.bibleId}: ${(err as Error).message}`
      );
    } finally {
      process.removeListener('SIGINT', closeQueueEvents);
      process.removeListener('SIGTERM', closeQueueEvents);
      await closeQueueEventsOnce();
    }
  }
}
