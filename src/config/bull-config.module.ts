import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createRedisConnection } from './redis.config';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: createRedisConnection(config),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class BullConfigModule {}
