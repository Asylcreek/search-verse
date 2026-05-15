import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE_CLIENT, databaseProviders } from './database.providers';
import * as schema from './schema';

export { DRIZZLE_CLIENT } from './database.providers';

@Global()
@Module({
  providers: databaseProviders,
  exports: [DRIZZLE_CLIENT],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(
    @Inject(DRIZZLE_CLIENT)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async onModuleDestroy() {
    await this.db.$client.end();
  }
}
