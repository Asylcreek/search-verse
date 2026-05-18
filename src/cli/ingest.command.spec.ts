import { Queue } from 'bullmq';

import { INGEST_JOB } from '../ingestion/ingestion.constants';
import { IngestQueueEventsService } from './ingest-queue-events.service';
import { IngestCommand } from './ingest.command';

const mockQueueEvents = {
  close: jest.fn().mockResolvedValue(undefined),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({
    id: 'job-123',
    waitUntilFinished: jest.fn().mockResolvedValue(undefined),
  }),
};

const mockQueueEventsService = {
  create: jest.fn(() => mockQueueEvents),
};

describe('IngestCommand', () => {
  let command: IngestCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    command = new IngestCommand(
      mockQueue as unknown as Queue,
      mockQueueEventsService as unknown as IngestQueueEventsService
    );
  });

  describe('parseBibleId', () => {
    it('trims whitespace from input', () => {
      const result = command.parseBibleId('  bible-id  ');
      expect(result).toBe('bible-id');
    });

    it('throws for empty string', () => {
      expect(() => command.parseBibleId('')).toThrow(
        '--bible-id value cannot be empty or whitespace-only'
      );
    });

    it('throws for whitespace-only string', () => {
      expect(() => command.parseBibleId('   ')).toThrow(
        '--bible-id value cannot be empty or whitespace-only'
      );
    });
  });

  describe('run', () => {
    it('throws when --bible-id is missing', async () => {
      await expect(command.run([], {})).rejects.toThrow(
        '--bible-id is required'
      );
    });

    it('enqueues job and waits for completion', async () => {
      await command.run([], { bibleId: 'bible-1' });
      expect(mockQueue.add).toHaveBeenCalledWith(INGEST_JOB, {
        bibleId: 'bible-1',
      });
      expect(mockQueueEventsService.create).toHaveBeenCalled();
      expect(mockQueueEvents.close).toHaveBeenCalled();
    });

    it('throws when job fails', async () => {
      mockQueue.add.mockResolvedValueOnce({
        id: 'job-123',
        waitUntilFinished: jest
          .fn()
          .mockRejectedValue(new Error('Worker crashed')),
      });

      await expect(command.run([], { bibleId: 'bible-1' })).rejects.toThrow(
        'Ingestion failed for bible-1: Worker crashed'
      );
    });
  });
});
