import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import { ApiBibleError } from './api-bible.errors';
import {
  ApiBibleBible,
  ApiBibleBook,
  ApiBibleChapterSummary,
  ApiBibleVerse,
  ApiBibleVerseSummary,
} from './api-bible.types';

@Injectable()
export class ApiBibleService {
  private readonly logger = new Logger(ApiBibleService.name);

  constructor(private readonly http: HttpService) {}

  async getBibles(): Promise<ApiBibleBible[]> {
    return this.get<ApiBibleBible[]>('/bibles');
  }

  async getBooks(bibleId: string): Promise<ApiBibleBook[]> {
    return this.get<ApiBibleBook[]>(`/bibles/${bibleId}/books`);
  }

  async getChapters(bibleId: string, bookId: string): Promise<ApiBibleChapterSummary[]> {
    return this.get<ApiBibleChapterSummary[]>(`/bibles/${bibleId}/books/${bookId}/chapters`);
  }

  async getVerses(bibleId: string, chapterId: string): Promise<ApiBibleVerseSummary[]> {
    return this.get<ApiBibleVerseSummary[]>(`/bibles/${bibleId}/chapters/${chapterId}/verses`);
  }

  async getVerse(bibleId: string, verseId: string): Promise<ApiBibleVerse> {
    return this.get<ApiBibleVerse>(`/bibles/${bibleId}/verses/${verseId}`, {
      'content-type': 'text',
    });
  }

  private async get<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    this.logger.debug(`GET ${endpoint}`);
    try {
      const response = await firstValueFrom(this.http.get<{ data: T }>(endpoint, { params }));
      return response.data.data;
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const status = axiosErr.response?.status ?? 0;
      const message = axiosErr.response?.data?.message ?? axiosErr.message;
      this.logger.warn(`GET ${endpoint} failed [${status}]: ${message}`);
      throw new ApiBibleError(status, endpoint, message);
    }
  }
}
