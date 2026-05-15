import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT, DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
  let module: TestingModule;

  afterEach(async () => {
    await module.close();
  });

  it('provides DRIZZLE_CLIENT token', async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        getOrThrow: () => 'postgresql://user:pass@localhost:5432/test',
      })
      .compile();

    const client = module.get(DRIZZLE_CLIENT);
    expect(client).toBeDefined();
  });
});
