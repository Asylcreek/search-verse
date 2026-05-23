import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { RateLimitModule } from './rate-limit.module';

@Controller('probe')
class ProbeController {
  @Get()
  get() {
    return { ok: true };
  }
}

describe('RateLimitModule', () => {
  const originalEnv = process.env;
  let app: INestApplication;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      THROTTLE_TTL: '60000',
      THROTTLE_LIMIT: '2',
    };

    const module = await Test.createTestingModule({
      imports: [RateLimitModule],
      controllers: [ProbeController],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    process.env = originalEnv;
  });

  it('rejects requests after the configured limit is exceeded', async () => {
    const server = app.getHttpServer();

    await request(server).get('/probe').expect(200);
    await request(server).get('/probe').expect(200);
    await request(server).get('/probe').expect(429);
  });
});
