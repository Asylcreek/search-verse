import { Test, TestingModule } from '@nestjs/testing';
import { isNotNull } from 'drizzle-orm';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations } from '../database/schema';
import { AppError } from '../utils/app-error';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  const where = jest.fn();
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
    const createdAt = new Date('2026-05-18T00:00:00.000Z');
    const updatedAt = new Date('2026-05-18T00:10:00.000Z');
    const syncedAt = new Date('2026-05-18T00:20:00.000Z');
    const rows = [
      {
        id: 'de4e12af7f28f599-02',
        abbreviation: 'WEB',
        name: 'World English Bible',
        language: 'English',
        copyright: 'Public Domain',
        last_synced_at: syncedAt,
        created_at: createdAt,
        updated_at: updatedAt,
      },
    ];
    from.mockReturnValue({ where });
    where.mockResolvedValue(rows);

    const result = await service.findAll();

    expect(select).toHaveBeenCalledWith({
      id: translations.id,
      abbreviation: translations.abbreviation,
      name: translations.name,
      language: translations.language,
      copyright: translations.copyright,
      last_synced_at: translations.lastSyncedAt,
      created_at: translations.createdAt,
      updated_at: translations.updatedAt,
    });
    expect(from).toHaveBeenCalledWith(translations);
    expect(where).toHaveBeenCalledWith(isNotNull(translations.lastSyncedAt));
    expect(result).toBe(rows);
  });

  it('returns an empty array when no translations exist', async () => {
    from.mockReturnValue({ where });
    where.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('returns one translation with full metadata', async () => {
    const createdAt = new Date('2026-05-18T00:00:00.000Z');
    const updatedAt = new Date('2026-05-18T00:10:00.000Z');
    const syncedAt = new Date('2026-05-18T00:20:00.000Z');
    const rows = [
      {
        id: 'de4e12af7f28f599-02',
        abbreviation: 'WEB',
        name: 'World English Bible',
        language: 'English',
        copyright: 'Public Domain',
        last_synced_at: syncedAt,
        created_at: createdAt,
        updated_at: updatedAt,
      },
    ];
    from.mockReturnValue({ where });
    where.mockResolvedValue(rows);

    const result = await service.findOne('de4e12af7f28f599-02');

    expect(select).toHaveBeenCalledWith({
      id: translations.id,
      abbreviation: translations.abbreviation,
      name: translations.name,
      language: translations.language,
      copyright: translations.copyright,
      last_synced_at: translations.lastSyncedAt,
      created_at: translations.createdAt,
      updated_at: translations.updatedAt,
    });
    expect(from).toHaveBeenCalledWith(translations);
    expect(result).toBe(rows[0]);
  });

  it('throws AppError when a translation does not exist', async () => {
    from.mockReturnValue({ where });
    where.mockResolvedValue([]);

    await expect(service.findOne('missing')).rejects.toMatchObject({
      message:
        'We cannot seem to find that translation. Please check the id and try again',
      statusCode: 404,
    });
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(AppError);
  });
});
