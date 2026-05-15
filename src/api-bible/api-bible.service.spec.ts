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
  ApiBibleChapterSummary,
  ApiBibleVerse,
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

  afterEach(() => jest.clearAllMocks());

  describe('getBibles', () => {
    it('returns typed array from response envelope', async () => {
      const data: ApiBibleBible[] = [{ id: 'de4e12af7f28f599-02' } as ApiBibleBible];
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getBibles();
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockAxiosError(401)));
      await expect(service.getBibles()).rejects.toThrow(ApiBibleError);
    });

    it('logs warn on error', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockAxiosError(401)));
      await service.getBibles().catch(() => undefined);
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('getBooks', () => {
    it('returns typed array', async () => {
      const data: ApiBibleBook[] = [{ id: 'GEN' } as ApiBibleBook];
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getBooks('bibleId');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getBooks('bibleId')).rejects.toThrow(ApiBibleError);
    });
  });

  describe('getChapters', () => {
    it('returns typed array', async () => {
      const data: ApiBibleChapterSummary[] = [{ id: 'GEN.1' } as ApiBibleChapterSummary];
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getChapters('bibleId', 'GEN');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getChapters('bibleId', 'GEN')).rejects.toThrow(ApiBibleError);
    });
  });

  describe('getVerses', () => {
    it('returns typed array', async () => {
      const data: ApiBibleVerseSummary[] = [{ id: 'GEN.1.1' } as ApiBibleVerseSummary];
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getVerses('bibleId', 'GEN.1');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getVerses('bibleId', 'GEN.1')).rejects.toThrow(ApiBibleError);
    });
  });

  describe('getVerse', () => {
    it('returns typed verse with content', async () => {
      const data: ApiBibleVerse = { id: 'GEN.1.1', content: 'In the beginning...' } as ApiBibleVerse;
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getVerse('bibleId', 'GEN.1.1');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getVerse('bibleId', 'GEN.1.1')).rejects.toThrow(ApiBibleError);
    });
  });
});
