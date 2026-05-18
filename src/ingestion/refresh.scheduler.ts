import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations } from '../database/schema';
import { INGESTION_QUEUE, INGEST_JOB } from './ingestion.constants';

const STALE_REFRESH_AGE_DAYS = 30;

@Injectable()
export class RefreshScheduler {
  private readonly logger = new Logger(RefreshScheduler.name);

  constructor(
    @InjectQueue(INGESTION_QUEUE) private readonly queue: Queue,
    @Inject(DRIZZLE_CLIENT)
    private readonly db: PostgresJsDatabase
  ) {}

  async refreshStaleTranslations(): Promise<void> {
    const stale = await this.db
      .select({ id: translations.id })
      .from(translations)
      .where(
        sql`${translations.lastSyncedAt} < now() - (${STALE_REFRESH_AGE_DAYS} * interval '1 day')
          OR ${translations.lastSyncedAt} IS NULL`
      );

    if (!stale.length) return;

    this.logger.log(
      `Scheduling refresh for ${stale.length} stale translations`
    );

    await this.queue.addBulk(
      stale.map(({ id }) => ({
        name: INGEST_JOB,
        data: { bibleId: id },
        opts: { jobId: `refresh-${id}` },
      }))
    );
  }
}
