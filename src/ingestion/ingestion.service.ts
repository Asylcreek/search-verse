import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import pLimit from 'p-limit';

import { ApiBibleError } from '../api-bible/api-bible.errors';
import { ApiBibleService } from '../api-bible/api-bible.service';
import type {
  ApiBibleVerseSummary,
  ApiBibleVerseText,
} from '../api-bible/api-bible.types';
import {
  getVerseNumberFromId,
  hasCommaVerseId,
  hasCompositeVerseId,
} from '../api-bible/api-bible.utils';
import { DRIZZLE_CLIENT } from '../database/database.providers';
import { books, translations, verses } from '../database/schema';
import { TSVECTOR_CONFIG } from './ingestion.constants';
import { getTestament } from './testament.helper';

const CONCURRENCY_LIMIT = 5;
const PASSAGE_VERSE_LIMIT = 199;
const TSVECTOR_REGCONFIG = sql.raw(`'${TSVECTOR_CONFIG}'::regconfig`);

interface VerseIngestionItem {
  verseId: string;
  bookId: string;
  chapterId: string;
  chapter: number;
  verse: number;
}

class ChapterTextCache {
  private readonly cache = new Map<string, Promise<Map<string, string>>>();

  constructor(private readonly apiBible: ApiBibleService) {}

  async getText(
    bibleId: string,
    chapterId: string,
    verseId: string
  ): Promise<string | undefined> {
    const cacheKey = `${bibleId}:${chapterId}`;
    if (!this.cache.has(cacheKey)) {
      this.cache.set(
        cacheKey,
        this.apiBible.getChapterContentVerseMap(bibleId, chapterId)
      );
    }

    return (await this.cache.get(cacheKey))?.get(verseId);
  }
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly apiBible: ApiBibleService,
    @Inject(DRIZZLE_CLIENT)
    private readonly db: PostgresJsDatabase
  ) {}

  async ingest(bibleId: string): Promise<void> {
    this.logger.log(`[${bibleId}] Starting ingestion`);

    const bible = await this.apiBible.getBible(bibleId);

    await this.db
      .insert(translations)
      .values({
        id: bible.id,
        abbreviation: bible.abbreviation,
        name: bible.name,
        language: bible.language.id,
        copyright: bible.copyright,
      })
      .onConflictDoUpdate({
        target: translations.id,
        set: {
          abbreviation: sql`excluded.abbreviation`,
          name: sql`excluded.name`,
        },
        setWhere: sql`${translations.abbreviation} <> excluded.abbreviation OR ${translations.name} <> excluded.name`,
      });

    const bookList = await this.apiBible.getBooks(bibleId);
    const chapterTextCache = new ChapterTextCache(this.apiBible);

    await this.db
      .insert(books)
      .values(
        bookList.map((book, i) => ({
          translationId: bibleId,
          bookId: book.id,
          name: book.name,
          testament: getTestament(book.id),
          position: i + 1,
        }))
      )
      .onConflictDoUpdate({
        target: [books.translationId, books.bookId],
        set: { name: sql`excluded.name` },
        setWhere: sql`${books.name} <> excluded.name`,
      });

    const verseList = await this.getVerseIngestionItems(bibleId, bookList);
    const passageFetchLimit = pLimit(CONCURRENCY_LIMIT);

    await Promise.all(
      this.chunkVerses(verseList).map((chunk) =>
        passageFetchLimit(() =>
          this.ingestPassage(bibleId, chunk, chapterTextCache)
        )
      )
    );

    await this.db
      .update(translations)
      .set({ lastSyncedAt: sql`now()` })
      .where(eq(translations.id, bibleId));

    this.logger.log(`[${bibleId}] Ingestion complete`);
  }

  private async getVerseIngestionItems(
    bibleId: string,
    bookList: { id: string }[]
  ): Promise<VerseIngestionItem[]> {
    const chapterFetchLimit = pLimit(CONCURRENCY_LIMIT);
    const verseFetchLimit = pLimit(CONCURRENCY_LIMIT);

    const chapterGroups = await Promise.all(
      bookList.map((book) =>
        chapterFetchLimit(async () => ({
          bookId: book.id,
          chapters: (await this.apiBible.getChapters(bibleId, book.id)).filter(
            (chapter) => chapter.number !== 'intro'
          ),
        }))
      )
    );

    const verseGroups = await Promise.all(
      chapterGroups.map((group) =>
        Promise.all(
          group.chapters.map((chapter) =>
            verseFetchLimit(async () => ({
              bookId: group.bookId,
              chapterNumber: chapter.number,
              verses: await this.apiBible.getVerses(bibleId, chapter.id),
            }))
          )
        )
      )
    );

    return verseGroups.flatMap((book) =>
      book.flatMap((chapter) =>
        chapter.verses.map((verse) =>
          this.toVerseIngestionItem(
            chapter.bookId,
            chapter.chapterNumber,
            verse
          )
        )
      )
    );
  }

  private toVerseIngestionItem(
    bookId: string,
    chapterNumber: string,
    verse: ApiBibleVerseSummary
  ): VerseIngestionItem {
    return {
      verseId: verse.id,
      bookId,
      chapterId: verse.chapterId,
      chapter: parseInt(chapterNumber, 10),
      verse: getVerseNumberFromId(verse.id),
    };
  }

  private chunkVerses(verseList: VerseIngestionItem[]): VerseIngestionItem[][] {
    const chunks: VerseIngestionItem[][] = [];
    let currentChunk: VerseIngestionItem[] = [];

    const flushChunk = () => {
      if (currentChunk.length) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    };

    for (const verse of verseList) {
      if (hasCompositeVerseId(verse.verseId)) {
        flushChunk();
        chunks.push([verse]);
        continue;
      }

      currentChunk.push(verse);
      if (currentChunk.length === PASSAGE_VERSE_LIMIT) {
        flushChunk();
      }
    }

    flushChunk();
    return chunks;
  }

  private async ingestPassage(
    bibleId: string,
    verseList: VerseIngestionItem[],
    chapterTextCache: ChapterTextCache
  ): Promise<void> {
    if (!verseList.length) return;

    const firstVerse = verseList[0];
    const lastVerse = verseList[verseList.length - 1];
    const passageId = `${firstVerse.verseId}-${lastVerse.verseId}`;
    this.logger.log(
      `[${bibleId}] Fetching ${
        verseList.length === 1 && hasCompositeVerseId(firstVerse.verseId)
          ? firstVerse.verseId
          : passageId
      }`
    );
    const textByVerseId = new Map(
      (
        await this.getVerseTextsForChunk(
          bibleId,
          passageId,
          verseList,
          chapterTextCache
        )
      ).map((verse) => [verse.verseId, verse.text])
    );

    const rows = verseList
      .map((verse) => ({
        ...verse,
        text: textByVerseId.get(verse.verseId),
      }))
      .filter((verse): verse is VerseIngestionItem & { text: string } =>
        Boolean(verse.text)
      );
    if (!rows.length) return;

    await this.db
      .insert(verses)
      .values(
        rows.map((v) => ({
          translationId: bibleId,
          bookId: v.bookId,
          chapter: v.chapter,
          verse: v.verse,
          reference: v.verseId,
          text: v.text,
          textSearch: sql`to_tsvector(${TSVECTOR_REGCONFIG}, ${v.text})`,
        }))
      )
      .onConflictDoUpdate({
        target: [verses.translationId, verses.reference],
        set: {
          text: sql`excluded.text`,
          textSearch: sql`to_tsvector(${TSVECTOR_REGCONFIG}, excluded.text)`,
          updatedAt: sql`now()`,
        },
        setWhere: sql`${verses.text} <> excluded.text`,
      });
  }

  private async getVerseTextsForChunk(
    bibleId: string,
    passageId: string,
    verseList: VerseIngestionItem[],
    chapterTextCache: ChapterTextCache
  ) {
    if (verseList.length === 1 && hasCompositeVerseId(verseList[0].verseId)) {
      return this.getSingleVerseText(bibleId, verseList[0], chapterTextCache);
    }

    try {
      return await this.apiBible.getPassageVerses(
        bibleId,
        passageId,
        verseList.map((verse) => verse.verseId)
      );
    } catch (err) {
      if (!(err instanceof ApiBibleError) || err.status !== 400) {
        throw err;
      }

      this.logger.warn(
        `[${bibleId}] Passage ${passageId} rejected by api.bible; retrying individual verse content`
      );
      return (
        await Promise.all(
          verseList.map((verse) =>
            this.getSingleVerseText(bibleId, verse, chapterTextCache)
          )
        )
      ).flat();
    }
  }

  private async getSingleVerseText(
    bibleId: string,
    verse: VerseIngestionItem,
    chapterTextCache: ChapterTextCache
  ): Promise<ApiBibleVerseText[]> {
    if (hasCommaVerseId(verse.verseId)) {
      return this.getChapterFallbackVerseText(bibleId, verse, chapterTextCache);
    }

    try {
      return await this.apiBible.getVerseContentVerses(bibleId, verse.verseId);
    } catch (err) {
      if (!(err instanceof ApiBibleError) || err.status !== 400) {
        throw err;
      }

      return this.getChapterFallbackVerseText(bibleId, verse, chapterTextCache);
    }
  }

  private async getChapterFallbackVerseText(
    bibleId: string,
    verse: VerseIngestionItem,
    chapterTextCache: ChapterTextCache
  ): Promise<ApiBibleVerseText[]> {
    const text = await chapterTextCache.getText(
      bibleId,
      verse.chapterId,
      verse.verseId
    );
    return text
      ? [
          {
            verseId: verse.verseId,
            number: String(verse.verse),
            text: text.trim(),
          },
        ]
      : [];
  }
}
