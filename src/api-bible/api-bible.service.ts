import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import { ApiBibleError } from './api-bible.errors';
import {
  ApiBibleBible,
  ApiBibleBook,
  ApiBibleChapterContent,
  ApiBibleChapterSummary,
  ApiBibleContentNode,
  ApiBibleContentTextItem,
  ApiBiblePassageContent,
  ApiBibleVerse,
  ApiBibleVerseContent,
  ApiBibleVerseSummary,
  ApiBibleVerseText,
} from './api-bible.types';
import { getVerseNumberFromId } from './api-bible.utils';

const API_BIBLE_MAX_RETRIES = 3;
const API_BIBLE_RETRY_DELAY_MS = 250;
const RETRYABLE_API_BIBLE_STATUSES = new Set([0, 429, 500, 502, 503, 504]);
const TOKEN_END_REGEX = /[\p{L}\p{N}]+$/u;
const TOKEN_START_REGEX = /^[\p{L}\p{N}]+/u;
const SEPARATED_PREVIOUS_CHAR_REGEX = /[\p{L}\p{N};:,.!?)]/u;
const WORD_CHAR_REGEX = /[\p{L}\p{N}]/u;
const JSON_CONTENT_PARAMS = {
  'content-type': 'json',
  'include-verse-numbers': 'false',
};
type ApiBibleContentItem = ApiBibleContentNode | ApiBibleContentTextItem | null;

@Injectable()
export class ApiBibleService {
  private readonly logger = new Logger(ApiBibleService.name);

  constructor(private readonly http: HttpService) {}

  async getBibles(): Promise<ApiBibleBible[]> {
    return this.get<ApiBibleBible[]>('/bibles');
  }

  async getBible(bibleId: string): Promise<ApiBibleBible> {
    return this.get<ApiBibleBible>(`/bibles/${bibleId}`);
  }

  async getBooks(bibleId: string): Promise<ApiBibleBook[]> {
    return this.get<ApiBibleBook[]>(`/bibles/${bibleId}/books`);
  }

  async getChapters(
    bibleId: string,
    bookId: string
  ): Promise<ApiBibleChapterSummary[]> {
    return this.get<ApiBibleChapterSummary[]>(
      `/bibles/${bibleId}/books/${bookId}/chapters`
    );
  }

  async getVerses(
    bibleId: string,
    chapterId: string
  ): Promise<ApiBibleVerseSummary[]> {
    return this.get<ApiBibleVerseSummary[]>(
      `/bibles/${bibleId}/chapters/${chapterId}/verses`
    );
  }

  async getVerse(bibleId: string, verseId: string): Promise<ApiBibleVerse> {
    return this.get<ApiBibleVerse>(`/bibles/${bibleId}/verses/${verseId}`, {
      'content-type': 'text',
    });
  }

  async getVerseContentVerses(
    bibleId: string,
    verseId: string
  ): Promise<ApiBibleVerseText[]> {
    const verse = await this.get<ApiBibleVerseContent>(
      `/bibles/${bibleId}/verses/${verseId}`,
      JSON_CONTENT_PARAMS
    );
    return this.getVerseContentText(verse.content, verseId);
  }

  async getChapterVerses(
    bibleId: string,
    chapterId: string
  ): Promise<ApiBibleVerseText[]> {
    const chapter = await this.get<ApiBibleChapterContent>(
      `/bibles/${bibleId}/chapters/${chapterId}`,
      { 'content-type': 'json' }
    );
    return this.parseVerseNodes(chapterId, chapter.content);
  }

  async getChapterContentVerses(
    bibleId: string,
    chapterId: string,
    verseIds: string[]
  ): Promise<ApiBibleVerseText[]> {
    return this.getOrderedVerseText(
      await this.getChapterContentVerseMap(bibleId, chapterId),
      verseIds
    );
  }

  async getChapterContentVerseMap(
    bibleId: string,
    chapterId: string
  ): Promise<Map<string, string>> {
    const chapter = await this.get<ApiBibleChapterContent>(
      `/bibles/${bibleId}/chapters/${chapterId}`,
      JSON_CONTENT_PARAMS
    );
    return this.parseVerseTextById(chapter.content);
  }

  async getPassageVerses(
    bibleId: string,
    passageId: string,
    verseIds: string[]
  ): Promise<ApiBibleVerseText[]> {
    const passage = await this.get<ApiBiblePassageContent>(
      `/bibles/${bibleId}/passages/${passageId}`,
      JSON_CONTENT_PARAMS
    );
    return this.getOrderedVerseText(
      this.parseVerseTextById(passage.content),
      verseIds
    );
  }

  private getOrderedVerseText(
    textByVerseId: Map<string, string>,
    verseIds: string[]
  ): ApiBibleVerseText[] {
    return verseIds
      .map((verseId) => ({
        verseId,
        number: String(getVerseNumberFromId(verseId)),
        text: (textByVerseId.get(verseId) ?? '').trim(),
      }))
      .filter((verse) => verse.text);
  }

  private getVerseContentText(
    nodes: ApiBibleContentNode[],
    verseId: string
  ): ApiBibleVerseText[] {
    const textByVerseId = this.parseVerseTextById(nodes);
    const exactText = textByVerseId.get(verseId);
    const text = exactText ?? this.joinVerseText(textByVerseId);

    return text.trim()
      ? [
          {
            verseId,
            number: String(getVerseNumberFromId(verseId)),
            text: text.trim(),
          },
        ]
      : [];
  }

  private joinVerseText(textByVerseId: Map<string, string>): string {
    return [...textByVerseId.values()]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' ');
  }

  private parseVerseTextById(
    nodes: ApiBibleContentNode[]
  ): Map<string, string> {
    const textByVerseId = new Map<string, string>();

    const appendText = (verseId: string, text: string) => {
      const existingText = textByVerseId.get(verseId) ?? '';
      textByVerseId.set(
        verseId,
        `${existingText}${this.getTextSeparator(existingText, text)}${text}`
      );
    };

    this.walkContentItems(nodes, (item) => {
      if ('text' in item) {
        const verseId = item.attrs?.['verseId'];
        if (typeof verseId === 'string') {
          appendText(verseId, item.text);
          appendText(verseId, item.tail ?? '');
        }
      }
    });
    return textByVerseId;
  }

  private getTextSeparator(existingText: string, text: string): string {
    if (!existingText || !text) return '';

    const previousToken = existingText.match(TOKEN_END_REGEX)?.[0] ?? '';
    const nextToken = text.match(TOKEN_START_REGEX)?.[0] ?? '';
    const previousChar = existingText.slice(-1);
    const nextChar = text[0];

    if (!SEPARATED_PREVIOUS_CHAR_REGEX.test(previousChar)) return '';
    if (!WORD_CHAR_REGEX.test(nextChar)) return '';
    if (previousToken.length === 1 || nextToken.length === 1) return '';

    return ' ';
  }

  private parseVerseNodes(
    chapterId: string,
    nodes: ApiBibleContentNode[]
  ): ApiBibleVerseText[] {
    const verses: ApiBibleVerseText[] = [];
    let currentVerse:
      | { verseId: string; number: string; textParts: string[] }
      | undefined;

    const flushVerse = () => {
      if (!currentVerse) return;

      const text = currentVerse.textParts.join('').trim();
      if (text) {
        verses.push({
          verseId: currentVerse.verseId,
          number: currentVerse.number,
          text,
        });
      }
    };

    const appendText = (text: string) => {
      currentVerse?.textParts.push(text);
    };

    const parseNode = (node: ApiBibleContentNode) => {
      const verseNumber = node.attrs?.['number'];
      if (node.name === 'verse' && verseNumber) {
        flushVerse();
        currentVerse = {
          verseId: `${chapterId}.${verseNumber}`,
          number: verseNumber,
          textParts: [],
        };

        const markerText = this.extractNodeText(node.items ?? []).trim();
        if (markerText && markerText !== verseNumber) {
          appendText(markerText);
        }
        return;
      }

      for (const item of node.items ?? []) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        if ('text' in item) {
          appendText(item.text);
          appendText(item.tail ?? '');
        } else {
          parseNode(item);
        }
      }
    };

    for (const node of nodes) {
      parseNode(node);
    }
    flushVerse();

    return verses;
  }

  private extractNodeText(items: ApiBibleContentItem[]): string {
    const textParts: string[] = [];
    this.walkContentItems(items, (item) => {
      if ('text' in item) {
        textParts.push(item.text, item.tail ?? '');
      }
    });
    return textParts.join('');
  }

  private walkContentItems(
    items: ApiBibleContentItem[],
    visit: (item: ApiBibleContentNode | ApiBibleContentTextItem) => void
  ): void {
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      visit(item);

      if (!('text' in item)) {
        this.walkContentItems(item.items ?? [], visit);
      }
    }
  }

  private async get<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    this.logger.debug(`GET ${endpoint}`);
    for (let attempt = 1; attempt <= API_BIBLE_MAX_RETRIES; attempt += 1) {
      try {
        const response = await firstValueFrom(
          this.http.get<{ data: T }>(endpoint, { params })
        );
        return response.data.data;
      } catch (err) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        const status = axiosErr.response?.status ?? 0;
        const message = axiosErr.response?.data?.message ?? axiosErr.message;
        const canRetry =
          attempt < API_BIBLE_MAX_RETRIES &&
          RETRYABLE_API_BIBLE_STATUSES.has(status);

        this.logger.warn(
          `GET ${endpoint} failed [${status}]: ${message}${
            canRetry
              ? `; retrying (${attempt + 1}/${API_BIBLE_MAX_RETRIES})`
              : ''
          }`
        );

        if (!canRetry) {
          throw new ApiBibleError(status, endpoint, message);
        }

        await this.waitForRetry();
      }
    }

    throw new ApiBibleError(0, endpoint, 'Request failed');
  }

  private async waitForRetry(): Promise<void> {
    await new Promise((resolve) =>
      setTimeout(resolve, API_BIBLE_RETRY_DELAY_MS)
    );
  }
}
