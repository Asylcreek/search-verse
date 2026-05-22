import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { AppError } from '../utils/app-error';
import { VerseService } from './verse.service';

describe('VerseService', () => {
  const referenceRow = {
    reference: 'JHN.3.16',
    book: 'JHN',
    chapter: 3,
    verse: 16,
  };

  const translationRows = [
    {
      id: 'de4e12af7f28f599-01',
      abbreviation: 'KJV',
      text: 'For God so loved the world',
      copyright: 'King James Version. Public Domain.',
    },
    {
      id: '65eec8e0b60e656b-01',
      abbreviation: 'NLT',
      text: 'For this is how God loved the world',
      copyright: 'New Living Translation copyright text',
    },
  ];

  const createDb = (
    referenceRows: (typeof referenceRow)[],
    rows: typeof translationRows
  ) => {
    const limit = jest.fn().mockResolvedValue(referenceRows);
    const whereForReference = jest.fn(() => ({ limit }));
    const fromForReference = jest.fn(() => ({ where: whereForReference }));

    const orderBy = jest.fn().mockResolvedValue(rows);
    const whereForTranslations = jest.fn(() => ({ orderBy }));
    const innerJoinForTranslations = jest.fn(() => ({
      where: whereForTranslations,
    }));
    const fromForTranslations = jest.fn(() => ({
      innerJoin: innerJoinForTranslations,
    }));

    const select = jest
      .fn()
      .mockReturnValueOnce({ from: fromForReference })
      .mockReturnValueOnce({ from: fromForTranslations });

    return {
      db: { select },
      fromForTranslations,
      innerJoinForTranslations,
      limit,
      select,
    };
  };

  async function createService(db: unknown) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerseService, { provide: DRIZZLE_CLIENT, useValue: db }],
    }).compile();

    return module.get(VerseService);
  }

  it('returns verse metadata with matching translations', async () => {
    const mock = createDb([referenceRow], translationRows);
    const service = await createService(mock.db);

    await expect(
      service.findByReference('JHN.3.16', ['KJV', 'NLT', 'AMP'])
    ).resolves.toEqual({
      reference: 'JHN.3.16',
      displayReference: 'John 3:16',
      book: 'JHN',
      bookName: 'John',
      chapter: 3,
      verse: 16,
      translations: translationRows,
    });
    expect(mock.select).toHaveBeenCalledTimes(2);
    expect(mock.limit).toHaveBeenCalledWith(1);
    expect(mock.innerJoinForTranslations).toHaveBeenCalledTimes(1);
  });

  it('returns an empty translations array when the reference exists but no abbreviations match', async () => {
    const mock = createDb([referenceRow], []);
    const service = await createService(mock.db);

    await expect(service.findByReference('JHN.3.16', ['ZZZ'])).resolves.toEqual(
      {
        reference: 'JHN.3.16',
        displayReference: 'John 3:16',
        book: 'JHN',
        bookName: 'John',
        chapter: 3,
        verse: 16,
        translations: [],
      }
    );
  });

  it('throws AppError when the reference does not exist anywhere', async () => {
    const mock = createDb([], []);
    const service = await createService(mock.db);

    try {
      await service.findByReference('INVALID', ['KJV']);
      throw new Error('Expected findByReference to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({
        message:
          'We cannot seem to find that verse. Please check the reference and try again',
        statusCode: 404,
      });
    }
    expect(mock.select).toHaveBeenCalledTimes(1);
    expect(mock.fromForTranslations).not.toHaveBeenCalled();
  });

  it('falls back to machine fields when book metadata is missing', async () => {
    const unknownReferenceRow = {
      reference: 'UNKNOWN.1.1',
      book: 'UNKNOWN',
      chapter: 1,
      verse: 1,
    };
    const mock = createDb([unknownReferenceRow], []);
    const service = await createService(mock.db);

    await expect(
      service.findByReference('UNKNOWN.1.1', ['KJV'])
    ).resolves.toEqual({
      reference: 'UNKNOWN.1.1',
      displayReference: 'UNKNOWN.1.1',
      book: 'UNKNOWN',
      bookName: 'UNKNOWN',
      chapter: 1,
      verse: 1,
      translations: [],
    });
  });
});
