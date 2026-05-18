import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { SearchService } from './search.service';

describe('SearchService', () => {
  const row = {
    reference: '1CO.13.4',
    translation: 'engKJV',
    book: '1CO',
    chapter: 13,
    verse: 4,
    text: 'Charity suffereth long, and is kind',
    copyright: 'King James Version. Public Domain.',
  };

  const createDb = (totalDocuments: number, rows: (typeof row)[]) => {
    const whereForCount = jest.fn().mockResolvedValue([{ totalDocuments }]);
    const innerJoinForCount = jest.fn(() => ({ where: whereForCount }));
    const fromForCount = jest.fn(() => ({ innerJoin: innerJoinForCount }));

    const limit = jest.fn().mockResolvedValue(rows);
    const offset = jest.fn(() => ({ limit }));
    const orderBy = jest.fn(() => ({ offset }));
    const whereForRows = jest.fn(() => ({ orderBy }));
    const innerJoinForRows = jest.fn(() => ({ where: whereForRows }));
    const fromForRows = jest.fn(() => ({ innerJoin: innerJoinForRows }));

    const select = jest
      .fn()
      .mockReturnValueOnce({ from: fromForCount })
      .mockReturnValueOnce({ from: fromForRows });

    return {
      db: { select },
      limit,
      offset,
      orderBy,
      select,
    };
  };

  async function createService(db: unknown) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: DRIZZLE_CLIENT, useValue: db }],
    }).compile();

    return module.get(SearchService);
  }

  it('returns a Factory-style envelope for matching verses', async () => {
    const mock = createDb(1, [row]);
    const service = await createService(mock.db);

    await expect(
      service.search({
        q: 'love is patient',
        abbreviations: ['engKJV', 'NLT'],
        page: 1,
        limit: 10,
      })
    ).resolves.toEqual({
      totalDocuments: 1,
      totalPages: 1,
      currentPage: 1,
      numOfResults: 1,
      data: [row],
    });
    expect(mock.select).toHaveBeenCalledTimes(2);
    expect(mock.offset).toHaveBeenCalledWith(0);
    expect(mock.limit).toHaveBeenCalledWith(10);
    expect(mock.orderBy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it('returns an empty envelope when no verse matches', async () => {
    const mock = createDb(0, []);
    const service = await createService(mock.db);

    await expect(
      service.search({
        q: 'zzzzzz',
        abbreviations: ['engKJV'],
        page: 1,
        limit: 10,
      })
    ).resolves.toEqual({
      totalDocuments: 0,
      totalPages: 1,
      currentPage: 1,
      numOfResults: 0,
      data: [],
    });
  });

  it('returns an empty envelope when the transformed abbreviations array is empty', async () => {
    const mock = createDb(0, []);
    const service = await createService(mock.db);

    await expect(
      service.search({ q: 'patience', abbreviations: [], page: 1, limit: 10 })
    ).resolves.toMatchObject({
      totalDocuments: 0,
      data: [],
    });
    expect(mock.select).not.toHaveBeenCalled();
  });
});
