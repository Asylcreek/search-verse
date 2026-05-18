import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { ApiBibleError } from './api-bible.errors';
import { ApiBibleService } from './api-bible.service';
import {
  ApiBibleBible,
  ApiBibleBook,
  ApiBibleChapterContent,
  ApiBibleChapterSummary,
  ApiBiblePassageContent,
  ApiBibleVerse,
  ApiBibleVerseContent,
  ApiBibleVerseSummary,
} from './api-bible.types';

const mockAxiosResponse = <T>(data: T): AxiosResponse<{ data: T }> =>
  ({ data: { data } }) as AxiosResponse<{ data: T }>;

const mockAxiosError = (status: number): AxiosError =>
  new AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    data: { message: 'error' },
    statusText: 'Error',
    headers: {},
    config: {} as any,
  });

describe('ApiBibleService', () => {
  let service: ApiBibleService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiBibleService,
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ApiBibleService);
    httpService = module.get(HttpService);

    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('getBibles', () => {
    it('returns typed array from response envelope', async () => {
      const data: ApiBibleBible[] = [
        { id: 'de4e12af7f28f599-02' } as ApiBibleBible,
      ];
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getBibles();
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(401)));
      await expect(service.getBibles()).rejects.toThrow(ApiBibleError);
    });

    it('logs warn on error', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(401)));
      await service.getBibles().catch(() => undefined);
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('retries transient upstream errors', async () => {
      jest.useFakeTimers();
      const data: ApiBibleBible[] = [
        { id: 'de4e12af7f28f599-02' } as ApiBibleBible,
      ];
      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(throwError(() => mockAxiosError(502)))
        .mockReturnValueOnce(of(mockAxiosResponse(data)));

      const result = service.getBibles();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(250);

      await expect(result).resolves.toEqual(data);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBible', () => {
    it('returns single bible by id', async () => {
      const data: ApiBibleBible = { id: 'bible-1' } as ApiBibleBible;
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getBible('bible-1');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getBible('bible-1')).rejects.toThrow(ApiBibleError);
    });
  });

  describe('getBooks', () => {
    it('returns typed array', async () => {
      const data: ApiBibleBook[] = [{ id: 'GEN' } as ApiBibleBook];
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getBooks('bibleId');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getBooks('bibleId')).rejects.toThrow(ApiBibleError);
    });
  });

  describe('getChapters', () => {
    it('returns typed array', async () => {
      const data: ApiBibleChapterSummary[] = [
        { id: 'GEN.1' } as ApiBibleChapterSummary,
      ];
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getChapters('bibleId', 'GEN');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getChapters('bibleId', 'GEN')).rejects.toThrow(
        ApiBibleError
      );
    });
  });

  describe('getVerses', () => {
    it('returns typed array', async () => {
      const data: ApiBibleVerseSummary[] = [
        { id: 'GEN.1.1' } as ApiBibleVerseSummary,
      ];
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getVerses('bibleId', 'GEN.1');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getVerses('bibleId', 'GEN.1')).rejects.toThrow(
        ApiBibleError
      );
    });
  });

  describe('getVerse', () => {
    it('returns typed verse with content', async () => {
      const data: ApiBibleVerse = {
        id: 'GEN.1.1',
        content: 'In the beginning...',
      } as ApiBibleVerse;
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getVerse('bibleId', 'GEN.1.1');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getVerse('bibleId', 'GEN.1.1')).rejects.toThrow(
        ApiBibleError
      );
    });
  });

  describe('getChapterVerses', () => {
    const chapterContent: ApiBibleChapterContent = {
      id: 'GEN.1',
      bibleId: 'bible-id',
      bookId: 'GEN',
      number: '1',
      reference: 'Genesis 1',
      verseCount: 2,
      content: [
        {
          name: 'para',
          items: [
            {
              name: 'verse',
              attrs: { number: '1' },
              items: [{ text: '1' }],
            },
            { text: 'In the beginning.' },
            {
              name: 'verse',
              attrs: { number: '2' },
              items: [{ text: '2' }],
            },
            { text: 'The earth was formless.' },
          ],
        },
      ],
    };

    it('returns parsed verse list from chapter JSON content', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(chapterContent)));

      const result = await service.getChapterVerses('bible-id', 'GEN.1');

      expect(result).toEqual([
        {
          verseId: 'GEN.1.1',
          text: 'In the beginning.',
          number: '1',
        },
        {
          verseId: 'GEN.1.2',
          text: 'The earth was formless.',
          number: '2',
        },
      ]);
    });

    it('handles deeply nested verse nodes', async () => {
      const nested: ApiBibleChapterContent = {
        ...chapterContent,
        content: [
          {
            name: 'section',
            items: [
              {
                name: 'para',
                items: [
                  {
                    name: 'verse',
                    attrs: { number: '1' },
                    items: [{ text: '1' }],
                  },
                  { name: 'char', items: [{ text: 'Nested ' }] },
                  { text: 'text.' },
                ],
              },
            ],
          },
        ],
      };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(nested)));

      const result = await service.getChapterVerses('bible-id', 'GEN.1');
      expect(result).toEqual([
        {
          verseId: 'GEN.1.1',
          text: 'Nested text.',
          number: '1',
        },
      ]);
    });

    it('keeps verse text nested inside the verse node when it is not a marker', async () => {
      const nestedText: ApiBibleChapterContent = {
        ...chapterContent,
        content: [
          {
            name: 'para',
            items: [
              {
                name: 'verse',
                attrs: { number: '1' },
                items: [{ text: 'In the beginning.' }],
              },
            ],
          },
        ],
      };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(nestedText)));

      const result = await service.getChapterVerses('bible-id', 'GEN.1');
      expect(result).toEqual([
        {
          verseId: 'GEN.1.1',
          text: 'In the beginning.',
          number: '1',
        },
      ]);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));

      await expect(
        service.getChapterVerses('bible-id', 'GEN.1')
      ).rejects.toThrow(ApiBibleError);
    });
  });

  describe('getPassageVerses', () => {
    const passageContent: ApiBiblePassageContent = {
      id: 'GEN.1.1-GEN.1.2',
      bibleId: 'bible-id',
      orgId: 'GEN.1.1-GEN.1.2',
      reference: 'Genesis 1:1-2',
      verseCount: 2,
      content: [
        {
          name: 'para',
          items: [
            {
              text: 'In the beginning ',
              attrs: { verseId: 'GEN.1.1' },
            },
            {
              name: 'char',
              items: [{ text: 'God', attrs: { verseId: 'GEN.1.1' } }],
            },
            {
              text: 'The earth was formless.',
              attrs: { verseId: 'GEN.1.2' },
            },
          ],
        },
      ],
    };

    it('requests json passage content without verse numbers', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(passageContent)));

      await service.getPassageVerses('bible-id', 'GEN.1.1-GEN.1.2', [
        'GEN.1.1',
        'GEN.1.2',
      ]);

      expect(httpService.get).toHaveBeenCalledWith(
        '/bibles/bible-id/passages/GEN.1.1-GEN.1.2',
        {
          params: {
            'content-type': 'json',
            'include-verse-numbers': 'false',
          },
        }
      );
    });

    it('groups passage text by attrs.verseId in requested order', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(passageContent)));

      const result = await service.getPassageVerses(
        'bible-id',
        'GEN.1.1-GEN.1.2',
        ['GEN.1.2', 'GEN.1.1']
      );

      expect(result).toEqual([
        {
          verseId: 'GEN.1.2',
          number: '2',
          text: 'The earth was formless.',
        },
        {
          verseId: 'GEN.1.1',
          number: '1',
          text: 'In the beginning God',
        },
      ]);
    });

    it('separates same-verse words split across content nodes', async () => {
      const splitContent: ApiBiblePassageContent = {
        ...passageContent,
        content: [
          {
            name: 'para',
            items: [
              {
                text: 'The Lord frustrates the plans of the nations',
                attrs: { verseId: 'PSA.33.10' },
              },
            ],
          },
          {
            name: 'para',
            items: [
              {
                text: 'and thwarts all their schemes.',
                attrs: { verseId: 'PSA.33.10' },
              },
            ],
          },
        ],
      };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(splitContent)));

      const result = await service.getPassageVerses(
        'bible-id',
        'PSA.33.10-PSA.33.10',
        ['PSA.33.10']
      );

      expect(result).toEqual([
        {
          verseId: 'PSA.33.10',
          number: '10',
          text: 'The Lord frustrates the plans of the nations and thwarts all their schemes.',
        },
      ]);
    });

    it('separates same-verse punctuation boundaries split across content nodes', async () => {
      const splitContent: ApiBiblePassageContent = {
        ...passageContent,
        content: [
          {
            name: 'para',
            items: [
              {
                text: 'The Lord foils the plans of the nations;',
                attrs: { verseId: 'PSA.33.10' },
              },
            ],
          },
          {
            name: 'para',
            items: [
              {
                text: 'he thwarts the purposes of the peoples.',
                attrs: { verseId: 'PSA.33.10' },
              },
            ],
          },
        ],
      };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(splitContent)));

      const result = await service.getPassageVerses(
        'bible-id',
        'PSA.33.10-PSA.33.10',
        ['PSA.33.10']
      );

      expect(result).toEqual([
        {
          verseId: 'PSA.33.10',
          number: '10',
          text: 'The Lord foils the plans of the nations; he thwarts the purposes of the peoples.',
        },
      ]);
    });

    it('keeps styled intra-word chunks together', async () => {
      const splitContent: ApiBiblePassageContent = {
        ...passageContent,
        content: [
          {
            name: 'para',
            items: [
              {
                text: 'The L',
                attrs: { verseId: 'PSA.33.10' },
              },
              {
                name: 'char',
                items: [
                  {
                    text: 'ord',
                    attrs: { verseId: 'PSA.33.10' },
                  },
                ],
              },
              {
                text: ' nullifies the counsel of the nations;',
                attrs: { verseId: 'PSA.33.10' },
              },
            ],
          },
        ],
      };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(splitContent)));

      const result = await service.getPassageVerses(
        'bible-id',
        'PSA.33.10-PSA.33.10',
        ['PSA.33.10']
      );

      expect(result).toEqual([
        {
          verseId: 'PSA.33.10',
          number: '10',
          text: 'The Lord nullifies the counsel of the nations;',
        },
      ]);
    });

    it('ignores null content items from API.Bible passage responses', async () => {
      const contentWithNull: ApiBiblePassageContent = {
        ...passageContent,
        content: [
          {
            name: 'para',
            items: [
              null,
              {
                text: 'After this I heard ',
                attrs: { verseId: 'REV.19.1' },
              },
              null,
              {
                text: 'what sounded like a vast crowd.',
                attrs: { verseId: 'REV.19.1' },
              },
            ],
          },
        ],
      };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(contentWithNull)));

      const result = await service.getPassageVerses(
        'bible-id',
        'REV.19.1-REV.19.1',
        ['REV.19.1']
      );

      expect(result).toEqual([
        {
          verseId: 'REV.19.1',
          number: '1',
          text: 'After this I heard what sounded like a vast crowd.',
        },
      ]);
    });
  });

  describe('getVerseContentVerses', () => {
    it('requests json verse content without verse numbers', async () => {
      const verseContent: ApiBibleVerseContent = {
        id: 'COL.4.2-COL.4.4',
        bibleId: 'bible-id',
        bookId: 'COL',
        chapterId: 'COL.4',
        reference: 'Colossians 4:2-4',
        content: [
          {
            name: 'para',
            items: [
              {
                text: 'Pray diligently. Stay alert.',
                attrs: { verseId: 'COL.4.2-COL.4.4' },
              },
            ],
          },
        ],
      };
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(verseContent)));

      const result = await service.getVerseContentVerses(
        'bible-id',
        'COL.4.2-COL.4.4'
      );

      expect(httpService.get).toHaveBeenCalledWith(
        '/bibles/bible-id/verses/COL.4.2-COL.4.4',
        {
          params: {
            'content-type': 'json',
            'include-verse-numbers': 'false',
          },
        }
      );
      expect(result).toEqual([
        {
          verseId: 'COL.4.2-COL.4.4',
          number: '2',
          text: 'Pray diligently. Stay alert.',
        },
      ]);
    });

    it('collapses expanded verse IDs back to the requested range ID', async () => {
      const verseContent: ApiBibleVerseContent = {
        id: 'REV.22.16',
        bibleId: 'bible-id',
        bookId: 'REV',
        chapterId: 'REV.22',
        reference: 'Revelation 22:16',
        content: [
          {
            name: 'para',
            items: [
              {
                text: 'I, Jesus, sent my Angel.',
                attrs: { verseId: 'REV.22.16' },
              },
            ],
          },
          {
            name: 'para',
            items: [
              {
                text: 'Come, says the Spirit.',
                attrs: { verseId: 'REV.22.17' },
              },
            ],
          },
        ],
      };
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(verseContent)));

      const result = await service.getVerseContentVerses(
        'bible-id',
        'REV.22.16-REV.22.17'
      );

      expect(result).toEqual([
        {
          verseId: 'REV.22.16-REV.22.17',
          number: '16',
          text: 'I, Jesus, sent my Angel. Come, says the Spirit.',
        },
      ]);
    });
  });

  describe('getChapterContentVerses', () => {
    it('requests json chapter content without verse numbers and returns requested verse IDs', async () => {
      const chapterContent: ApiBibleChapterContent = {
        id: 'ACT.27',
        bibleId: 'bible-id',
        bookId: 'ACT',
        number: '27',
        reference: 'Acts 27',
        verseCount: 1,
        content: [
          {
            name: 'para',
            items: [
              {
                text: 'The centurion set Paul’s warning aside.',
                attrs: { verseId: 'ACT.27.12,11' },
              },
            ],
          },
        ],
      };
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(chapterContent)));

      const result = await service.getChapterContentVerses(
        'bible-id',
        'ACT.27',
        ['ACT.27.12,11']
      );

      expect(httpService.get).toHaveBeenCalledWith(
        '/bibles/bible-id/chapters/ACT.27',
        {
          params: {
            'content-type': 'json',
            'include-verse-numbers': 'false',
          },
        }
      );
      expect(result).toEqual([
        {
          verseId: 'ACT.27.12,11',
          number: '12',
          text: 'The centurion set Paul’s warning aside.',
        },
      ]);
    });
  });
});
