import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations, verses } from '../database/schema';
import { AppError } from '../utils/app-error';
import { VerseComparisonResponse } from './verse.types';

@Injectable()
export class VerseService {
  constructor(
    @Inject(DRIZZLE_CLIENT)
    private readonly db: PostgresJsDatabase
  ) {}

  async findByReference(
    reference: string,
    abbreviations: string[]
  ): Promise<VerseComparisonResponse> {
    const referenceRows = await this.db
      .select({
        reference: verses.reference,
        book: verses.bookId,
        chapter: verses.chapter,
        verse: verses.verse,
      })
      .from(verses)
      .where(eq(verses.reference, reference))
      .limit(1);

    const verse = referenceRows[0];

    if (!verse) {
      throw new AppError(
        'We cannot seem to find that verse. Please check the reference and try again',
        HttpStatus.NOT_FOUND
      );
    }

    const translationRows = await this.db
      .select({
        id: translations.id,
        abbreviation: translations.abbreviation,
        text: verses.text,
        copyright: translations.copyright,
      })
      .from(verses)
      .innerJoin(translations, eq(verses.translationId, translations.id))
      .where(
        and(
          eq(verses.reference, reference),
          inArray(translations.abbreviation, abbreviations)
        )
      )
      .orderBy(translations.abbreviation);

    return {
      ...verse,
      translations: translationRows,
    };
  }
}
