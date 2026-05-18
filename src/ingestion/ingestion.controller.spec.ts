import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { INGESTION_QUEUE, INGEST_JOB } from './ingestion.constants';
import { IngestionController } from './ingestion.controller';

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-123' }),
};

describe('IngestionController', () => {
  let controller: IngestionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        { provide: getQueueToken(INGESTION_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    controller = module.get(IngestionController);
  });

  afterEach(() => jest.clearAllMocks());

  it('enqueues an ingestion job and returns jobId', async () => {
    const result = await controller.ingest({ bibleId: 'bible-1' });
    expect(mockQueue.add).toHaveBeenCalledWith(INGEST_JOB, {
      bibleId: 'bible-1',
    });
    expect(result).toEqual({ jobId: 'job-123' });
  });
});
