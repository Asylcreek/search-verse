import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { buildDisplayReference, getBookName } from '../book/book.metadata';
import { DRIZZLE_CLIENT } from '../database/database.providers';
import { books, translations, verses } from '../database/schema';
import { TSVECTOR_CONFIG } from '../ingestion/ingestion.constants';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponse } from './search.types';

@Injectable()
export class SearchService {
  constructor(
    @Inject(DRIZZLE_CLIENT)
    private readonly db: PostgresJsDatabase
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResponse> {
    const translationAbbreviations = query.abbreviations;
    const currentPage = query.page;
    const resultsPerPage = query.limit;
    const offset = (currentPage - 1) * resultsPerPage;
    const exactQuery = query.q.trim().replace(/^"|"$/g, '');

    if (translationAbbreviations.length === 0) {
      return {
        totalDocuments: 0,
        totalPages: 1,
        currentPage,
        numOfResults: 0,
        data: [],
      };
    }

    const searchQuery = sql`websearch_to_tsquery(${TSVECTOR_CONFIG}::regconfig, ${query.q})`;
    const searchCondition = and(
      inArray(translations.abbreviation, translationAbbreviations),
      sql`${verses.textSearch} @@ ${searchQuery}`,
      query.book ? eq(verses.bookId, query.book) : undefined,
      query.testament ? eq(books.testament, query.testament) : undefined
    );
    const bookJoinCondition = and(
      eq(books.translationId, verses.translationId),
      eq(books.bookId, verses.bookId)
    );
    const rank = sql<number>`ts_rank(${verses.textSearch}, ${searchQuery})`;
    const exactMatchRank = sql<number>`
      case
        when ${verses.text} ilike ${`%${exactQuery}%`} then 1
        else 0
      end
    `;

    const totalRows = await this.db
      .select({ totalDocuments: count() })
      .from(verses)
      .innerJoin(translations, eq(verses.translationId, translations.id))
      .innerJoin(books, bookJoinCondition)
      .where(searchCondition);

    const totalDocuments = totalRows[0]?.totalDocuments ?? 0;

    const rows = await this.db
      .select({
        reference: verses.reference,
        translation: translations.abbreviation,
        book: verses.bookId,
        chapter: verses.chapter,
        verse: verses.verse,
        text: verses.text,
        copyright: translations.copyright,
      })
      .from(verses)
      .innerJoin(translations, eq(verses.translationId, translations.id))
      .innerJoin(books, bookJoinCondition)
      .where(searchCondition)
      .orderBy(
        desc(exactMatchRank),
        desc(rank),
        verses.bookId,
        verses.chapter,
        verses.verse,
        translations.abbreviation
      )
      .offset(offset)
      .limit(resultsPerPage);

    return {
      totalDocuments,
      totalPages: Math.max(1, Math.ceil(totalDocuments / resultsPerPage)),
      currentPage,
      numOfResults: rows.length,
      data: rows.map((row) => ({
        ...row,
        displayReference: buildDisplayReference(
          row.book,
          row.chapter,
          row.verse,
          row.reference
        ),
        bookName: getBookName(row.book),
      })),
    };
  }
}
