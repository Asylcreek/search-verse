import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';

const defaultThrottleTtl = seconds(60);
const defaultThrottleLimit = 100;

function getPositiveInteger(
  config: ConfigService,
  key: string,
  fallback: number
) {
  const value = config.get<string>(key);
  const parsed = value === undefined ? fallback : Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: getPositiveInteger(config, 'THROTTLE_TTL', defaultThrottleTtl),
            limit: getPositiveInteger(
              config,
              'THROTTLE_LIMIT',
              defaultThrottleLimit
            ),
          },
        ],
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}
