import {
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { translations } from './translations.schema';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const verses = pgTable(
  'verses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    translationId: varchar('translation_id')
      .notNull()
      .references(() => translations.id, { onDelete: 'cascade' }),
    bookId: varchar('book_id').notNull(),
    chapter: integer('chapter').notNull(),
    verse: integer('verse').notNull(),
    reference: varchar('reference').notNull(),
    text: text('text').notNull(),
    textSearch: tsvector('text_search'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    unique('verses_translation_reference_unique').on(
      t.translationId,
      t.reference
    ),
    index('verses_text_search_gin_idx').using('gin', t.textSearch),
  ]
);
