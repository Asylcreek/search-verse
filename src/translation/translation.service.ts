import { Inject, Injectable } from '@nestjs/common';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations } from '../database/schema';
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
        last_synced_at: translations.lastSyncedAt,
      })
      .from(translations);
  }
}
