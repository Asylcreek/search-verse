import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEvents } from 'bullmq';

import { createRedisConnection } from '../config/redis.config';
import { INGESTION_QUEUE } from '../ingestion/ingestion.constants';

@Injectable()
export class IngestQueueEventsService {
  constructor(private readonly config: ConfigService) {}

  create(): QueueEvents {
    return new QueueEvents(INGESTION_QUEUE, {
      connection: createRedisConnection(this.config),
    });
  }
}
