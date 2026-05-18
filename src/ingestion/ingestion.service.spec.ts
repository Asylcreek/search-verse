import { Test, TestingModule } from '@nestjs/testing';

import { ApiBibleError } from '../api-bible/api-bible.errors';
import { ApiBibleService } from '../api-bible/api-bible.service';
import { getVerseNumberFromId } from '../api-bible/api-bible.utils';
import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations } from '../database/schema';
import { IngestionService } from './ingestion.service';

jest.mock('p-limit', () => ({
  __esModule: true,
  default: jest.fn(() => (fn: () => Promise<void>) => fn()),
}));

const mockBible = {
  id: 'bible-1',
  abbreviation: 'KJV',
  name: 'King James Version',
  copyright: 'Public Domain',
  language: { id: 'eng' },
};

const mockBook = { id: 'GEN', name: 'Genesis' };
const mockChapter = { id: 'GEN.1', number: '1' };
const mockVerseSummary = {
  id: 'GEN.1.1',
  bibleId: 'bible-1',
  bookId: 'GEN',
  chapterId: 'GEN.1',
  reference: 'Genesis 1:1',
};
const mockVerseText = {
  verseId: 'GEN.1.1',
  text: 'In the beginning.',
  number: '1',
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const mockApiBible = {
  getBible: jest.fn().mockResolvedValue(mockBible),
  getBooks: jest.fn().mockResolvedValue([mockBook]),
  getChapters: jest.fn().mockResolvedValue([mockChapter]),
  getVerses: jest.fn().mockResolvedValue([mockVerseSummary]),
  getPassageVerses: jest.fn().mockResolvedValue([mockVerseText]),
  getVerseContentVerses: jest.fn().mockResolvedValue([mockVerseText]),
  getChapterContentVerses: jest.fn().mockResolvedValue([mockVerseText]),
  getChapterContentVerseMap: jest
    .fn()
    .mockResolvedValue(new Map([[mockVerseText.verseId, mockVerseText.text]])),
  getChapterVerses: jest.fn().mockResolvedValue([mockVerseText]),
};

const mockOnConflict = jest.fn().mockResolvedValue(undefined);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockValues = jest.fn((_: unknown) => ({
  onConflictDoUpdate: mockOnConflict,
}));
const mockWhere = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn().mockReturnValue({ where: mockWhere });

const mockDb = {
  insert: jest.fn(() => ({
    values: mockValues,
  })),
  update: jest.fn(() => ({
    set: mockSet,
  })),
  select: jest.fn(() => ({
    from: jest.fn(() => ({ where: jest.fn().mockResolvedValue([]) })),
  })),
};

describe('IngestionService', () => {
  let service: IngestionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: ApiBibleService, useValue: mockApiBible },
        { provide: DRIZZLE_CLIENT, useValue: mockDb },
      ],
    }).compile();

    service = module.get(IngestionService);
  });

  it('fetches bible metadata and upserts translation', async () => {
    await service.ingest('bible-1');
    expect(mockApiBible.getBible).toHaveBeenCalledWith('bible-1');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('throws if bible is not found', async () => {
    mockApiBible.getBible.mockRejectedValueOnce(new Error('Bible not found'));
    await expect(service.ingest('bible-1')).rejects.toThrow('Bible not found');
  });

  it('fetches books and chapters', async () => {
    await service.ingest('bible-1');
    expect(mockApiBible.getBooks).toHaveBeenCalledWith('bible-1');
    expect(mockApiBible.getChapters).toHaveBeenCalledWith('bible-1', 'GEN');
  });

  it('fetches chapter lists concurrently', async () => {
    const firstChapters = deferred<(typeof mockChapter)[]>();
    mockApiBible.getBooks.mockResolvedValueOnce([
      { id: 'GEN', name: 'Genesis' },
      { id: 'EXO', name: 'Exodus' },
    ]);
    mockApiBible.getChapters
      .mockImplementationOnce(() => firstChapters.promise)
      .mockResolvedValueOnce([{ id: 'EXO.1', number: '1' }]);

    const ingest = service.ingest('bible-1');
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockApiBible.getChapters).toHaveBeenCalledWith('bible-1', 'GEN');
    expect(mockApiBible.getChapters).toHaveBeenCalledWith('bible-1', 'EXO');

    firstChapters.resolve([{ id: 'GEN.1', number: '1' }]);
    await ingest;
  });

  it('fetches verse summaries and passage verses before upserting', async () => {
    await service.ingest('bible-1');
    expect(mockApiBible.getVerses).toHaveBeenCalledWith('bible-1', 'GEN.1');
    expect(mockApiBible.getPassageVerses).toHaveBeenCalledWith(
      'bible-1',
      'GEN.1.1-GEN.1.1',
      ['GEN.1.1']
    );
    expect(mockApiBible.getChapterVerses).not.toHaveBeenCalled();
  });

  it('skips intro chapters', async () => {
    mockApiBible.getChapters.mockResolvedValueOnce([
      { id: 'GEN.intro', number: 'intro' },
      { id: 'GEN.1', number: '1' },
    ]);
    await service.ingest('bible-1');
    expect(mockApiBible.getVerses).not.toHaveBeenCalledWith(
      'bible-1',
      'GEN.intro'
    );
    expect(mockApiBible.getVerses).toHaveBeenCalledWith('bible-1', 'GEN.1');
  });

  it('chunks passage requests below the API.Bible 200-verse truncation boundary', async () => {
    const verseSummaries = Array.from({ length: 200 }, (_, i) => ({
      ...mockVerseSummary,
      id: `GEN.1.${i + 1}`,
      reference: `Genesis 1:${i + 1}`,
    }));
    mockApiBible.getVerses.mockResolvedValueOnce(verseSummaries);
    mockApiBible.getPassageVerses.mockImplementation(
      (_bibleId: string, _passageId: string, verseIds: string[]) =>
        Promise.resolve(
          verseIds.map((verseId) => ({
            verseId,
            number: String(getVerseNumberFromId(verseId)),
            text: `Text ${verseId}`,
          }))
        )
    );

    await service.ingest('bible-1');

    expect(mockApiBible.getPassageVerses).toHaveBeenNthCalledWith(
      1,
      'bible-1',
      'GEN.1.1-GEN.1.199',
      verseSummaries.slice(0, 199).map((verse) => verse.id)
    );
    expect(mockApiBible.getPassageVerses).toHaveBeenNthCalledWith(
      2,
      'bible-1',
      'GEN.1.200-GEN.1.200',
      ['GEN.1.200']
    );
  });

  it('fetches range-style verse IDs individually instead of composing invalid passage IDs', async () => {
    mockApiBible.getVerses.mockResolvedValueOnce([
      { ...mockVerseSummary, id: 'COL.4.1' },
      { ...mockVerseSummary, id: 'COL.4.2-COL.4.4' },
      { ...mockVerseSummary, id: 'COL.4.5' },
    ]);
    mockApiBible.getPassageVerses.mockImplementation(
      (_bibleId: string, _passageId: string, verseIds: string[]) =>
        Promise.resolve(
          verseIds.map((verseId) => ({
            verseId,
            number: String(getVerseNumberFromId(verseId)),
            text: `Text ${verseId}`,
          }))
        )
    );
    mockApiBible.getVerseContentVerses.mockResolvedValueOnce([
      {
        verseId: 'COL.4.2-COL.4.4',
        number: '2',
        text: 'Composite text.',
      },
    ]);

    await service.ingest('bible-1');

    expect(mockApiBible.getPassageVerses).toHaveBeenCalledWith(
      'bible-1',
      'COL.4.1-COL.4.1',
      ['COL.4.1']
    );
    expect(mockApiBible.getVerseContentVerses).toHaveBeenCalledWith(
      'bible-1',
      'COL.4.2-COL.4.4'
    );
    expect(mockApiBible.getPassageVerses).toHaveBeenCalledWith(
      'bible-1',
      'COL.4.5-COL.4.5',
      ['COL.4.5']
    );
  });

  it('fetches comma-style verse IDs from chapter content', async () => {
    mockApiBible.getVerses.mockResolvedValueOnce([
      { ...mockVerseSummary, id: 'ACT.27.10' },
      { ...mockVerseSummary, id: 'ACT.27.12,11', chapterId: 'ACT.27' },
      { ...mockVerseSummary, id: 'ACT.27.13' },
    ]);
    mockApiBible.getPassageVerses.mockImplementation(
      (_bibleId: string, _passageId: string, verseIds: string[]) =>
        Promise.resolve(
          verseIds.map((verseId) => ({
            verseId,
            number: String(getVerseNumberFromId(verseId)),
            text: `Text ${verseId}`,
          }))
        )
    );
    mockApiBible.getChapterContentVerseMap.mockResolvedValueOnce(
      new Map([['ACT.27.12,11', 'Comma verse text.']])
    );

    await service.ingest('bible-1');

    expect(mockApiBible.getChapterContentVerseMap).toHaveBeenCalledWith(
      'bible-1',
      'ACT.27'
    );
    expect(mockApiBible.getVerseContentVerses).not.toHaveBeenCalledWith(
      'bible-1',
      'ACT.27.12,11'
    );
  });

  it('reuses chapter content for multiple fallback verses in the same chapter', async () => {
    mockApiBible.getVerses.mockResolvedValueOnce([
      { ...mockVerseSummary, id: 'ACT.27.12,11', chapterId: 'ACT.27' },
      { ...mockVerseSummary, id: 'ACT.27.14,13', chapterId: 'ACT.27' },
    ]);
    mockApiBible.getChapterContentVerseMap.mockResolvedValueOnce(
      new Map([
        ['ACT.27.12,11', 'First comma verse.'],
        ['ACT.27.14,13', 'Second comma verse.'],
      ])
    );

    await service.ingest('bible-1');

    expect(mockApiBible.getChapterContentVerseMap).toHaveBeenCalledTimes(1);
    expect(mockApiBible.getChapterContentVerseMap).toHaveBeenCalledWith(
      'bible-1',
      'ACT.27'
    );

    const verseRows = mockValues.mock.calls.slice(2).flatMap(
      (call) =>
        call[0] as Array<{
          reference: string;
          text: string;
        }>
    );
    expect(verseRows.map((row) => row.reference)).toEqual([
      'ACT.27.12,11',
      'ACT.27.14,13',
    ]);
    expect(verseRows.map((row) => row.text)).toEqual([
      'First comma verse.',
      'Second comma verse.',
    ]);
  });

  it('falls back to individual verse content when a passage chunk is rejected', async () => {
    mockApiBible.getVerses.mockResolvedValueOnce([
      { ...mockVerseSummary, id: 'REV.22.20' },
      { ...mockVerseSummary, id: 'REV.22.21' },
    ]);
    mockApiBible.getPassageVerses.mockRejectedValueOnce(
      new ApiBibleError(400, '/passage', 'Invalid request params input')
    );
    mockApiBible.getVerseContentVerses
      .mockResolvedValueOnce([
        { verseId: 'REV.22.20', number: '20', text: 'First fallback.' },
      ])
      .mockResolvedValueOnce([
        { verseId: 'REV.22.21', number: '21', text: 'Second fallback.' },
      ]);

    await service.ingest('bible-1');

    expect(mockApiBible.getPassageVerses).toHaveBeenCalledWith(
      'bible-1',
      'REV.22.20-REV.22.21',
      ['REV.22.20', 'REV.22.21']
    );
    expect(mockApiBible.getVerseContentVerses).toHaveBeenCalledWith(
      'bible-1',
      'REV.22.20'
    );
    expect(mockApiBible.getVerseContentVerses).toHaveBeenCalledWith(
      'bible-1',
      'REV.22.21'
    );

    const verseRows = mockValues.mock.calls[2][0] as Array<{
      reference: string;
      text: string;
    }>;
    expect(verseRows.map((row) => row.reference)).toEqual([
      'REV.22.20',
      'REV.22.21',
    ]);
    expect(verseRows.map((row) => row.text)).toEqual([
      'First fallback.',
      'Second fallback.',
    ]);
  });

  it('preserves verse summary order when passage text returns in another order', async () => {
    mockApiBible.getVerses.mockResolvedValueOnce([
      { ...mockVerseSummary, id: 'GEN.1.1' },
      { ...mockVerseSummary, id: 'GEN.1.2' },
    ]);
    mockApiBible.getPassageVerses.mockResolvedValueOnce([
      { verseId: 'GEN.1.2', number: '2', text: 'Second.' },
      { verseId: 'GEN.1.1', number: '1', text: 'First.' },
    ]);

    await service.ingest('bible-1');

    const verseRows = mockValues.mock.calls[2][0] as Array<{
      reference: string;
      text: string;
    }>;
    expect(
      verseRows.map((row: { reference: string }) => row.reference)
    ).toEqual(['GEN.1.1', 'GEN.1.2']);
    expect(verseRows.map((row: { text: string }) => row.text)).toEqual([
      'First.',
      'Second.',
    ]);
  });

  it('throws for unsupported book IDs', async () => {
    mockApiBible.getBooks.mockResolvedValueOnce([{ id: 'TOB', name: 'Tobit' }]);
    await expect(service.ingest('bible-1')).rejects.toThrow(
      'Unsupported Bible book ID: TOB'
    );
  });

  it('uses DB now() for lastSyncedAt', async () => {
    await service.ingest('bible-1');
    expect(mockDb.update).toHaveBeenCalledWith(translations);
    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.lastSyncedAt).toBeDefined();
    expect(setArg.lastSyncedAt).not.toBeInstanceOf(Date);
  });

  it('guards translation upserts with setWhere', async () => {
    await service.ingest('bible-1');
    const translationUpsert = mockOnConflict.mock.calls[0][0];
    expect(translationUpsert.setWhere).toBeDefined();
    expect(translationUpsert.set.abbreviation).toBeDefined();
    expect(translationUpsert.set.name).toBeDefined();
  });

  it('guards book upserts with setWhere', async () => {
    await service.ingest('bible-1');
    const bookUpsert = mockOnConflict.mock.calls[1][0];
    expect(bookUpsert.setWhere).toBeDefined();
    expect(bookUpsert.set.name).toBeDefined();
  });

  it('guards verse upserts with setWhere on text change', async () => {
    await service.ingest('bible-1');
    const verseUpsert = mockOnConflict.mock.calls[2][0];
    expect(verseUpsert.setWhere).toBeDefined();
    expect(verseUpsert.set.text).toBeDefined();
    expect(verseUpsert.set.textSearch).toBeDefined();
    expect(verseUpsert.set.updatedAt).toBeDefined();
  });
});
