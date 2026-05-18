import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

export function createRedisConnection(
  config: ConfigService
): ConnectionOptions {
  const host = config.getOrThrow<string>('REDIS_HOST');
  const port = parseInt(config.getOrThrow<string>('REDIS_PORT'), 10);
  const password = config.get<string>('REDIS_PASSWORD');
  const useTls = config.get<string>('REDIS_USE_TLS') === 'true';

  return {
    host,
    port,
    password,
    tls: useTls ? { host, port } : undefined,
  };
}
