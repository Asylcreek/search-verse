import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations } from '../database/schema';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  const from = jest.fn();
  const select = jest.fn(() => ({ from }));
  const mockDb = { select };

  let service: TranslationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: DRIZZLE_CLIENT, useValue: mockDb },
      ],
    }).compile();

    service = module.get(TranslationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns translations with last_synced_at', async () => {
    const rows = [
      {
        id: 'de4e12af7f28f599-02',
        abbreviation: 'WEB',
        name: 'World English Bible',
        language: 'English',
        last_synced_at: new Date('2026-05-18T00:00:00.000Z'),
      },
    ];
    from.mockResolvedValue(rows);

    const result = await service.findAll();

    expect(select).toHaveBeenCalledWith({
      id: translations.id,
      abbreviation: translations.abbreviation,
      name: translations.name,
      language: translations.language,
      last_synced_at: translations.lastSyncedAt,
    });
    expect(from).toHaveBeenCalledWith(translations);
    expect(result).toBe(rows);
  });

  it('returns an empty array when no translations exist', async () => {
    from.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
  });
});
