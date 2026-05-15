import { integer, pgEnum, pgTable, primaryKey, varchar } from 'drizzle-orm/pg-core';

import { translations } from './translations.schema';

export const testamentEnum = pgEnum('testament', ['OT', 'NT']);

export const books = pgTable(
  'books',
  {
    translationId: varchar('translation_id')
      .notNull()
      .references(() => translations.id, { onDelete: 'cascade' }),
    bookId: varchar('book_id').notNull(),
    name: varchar('name').notNull(),
    testament: testamentEnum('testament').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [primaryKey({ columns: [t.translationId, t.bookId] })],
);
