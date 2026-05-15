import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT';

export const databaseProviders = [
  {
    provide: DRIZZLE_CLIENT,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      const client = postgres(config.getOrThrow<string>('DB_URI'), {
        max: 10,
        idle_timeout: 30,
        connect_timeout: 10,
      });
      return drizzle(client, { schema });
    },
  },
];
