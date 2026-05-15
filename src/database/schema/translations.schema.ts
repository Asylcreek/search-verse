import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const translations = pgTable('translations', {
  id: varchar('id').primaryKey(),
  abbreviation: varchar('abbreviation').notNull(),
  name: varchar('name').notNull(),
  language: varchar('language').notNull(),
  copyright: text('copyright').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
