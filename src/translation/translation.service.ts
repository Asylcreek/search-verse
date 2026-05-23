import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { eq, isNotNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations } from '../database/schema';
import { AppError } from '../utils/app-error';
import { TranslationResponseDto } from './dto/translation-response.dto';

@Injectable()
export class TranslationService {
  constructor(
    @Inject(DRIZZLE_CLIENT)
    private readonly db: PostgresJsDatabase
  ) {}

  async findAll(): Promise<TranslationResponseDto[]> {
    return this.db
      .select({
        id: translations.id,
        abbreviation: translations.abbreviation,
        name: translations.name,
        language: translations.language,
        copyright: translations.copyright,
        last_synced_at: translations.lastSyncedAt,
        created_at: translations.createdAt,
        updated_at: translations.updatedAt,
      })
      .from(translations)
      .where(isNotNull(translations.lastSyncedAt));
  }

  async findOne(id: string): Promise<TranslationResponseDto> {
    const rows = await this.db
      .select({
        id: translations.id,
        abbreviation: translations.abbreviation,
        name: translations.name,
        language: translations.language,
        copyright: translations.copyright,
        last_synced_at: translations.lastSyncedAt,
        created_at: translations.createdAt,
        updated_at: translations.updatedAt,
      })
      .from(translations)
      .where(eq(translations.id, id));

    const translation = rows[0];

    if (!translation) {
      throw new AppError(
        'We cannot seem to find that translation. Please check the id and try again',
        HttpStatus.NOT_FOUND
      );
    }

    return translation;
  }
}
