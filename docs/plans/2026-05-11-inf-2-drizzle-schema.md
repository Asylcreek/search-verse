# INF-2: Drizzle Schema & Migrations Implementation Plan

> REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Set up Drizzle ORM with `translations`, `books`, and `verses` tables, a `tsvector` GIN index, a DB trigger for automatic `text_search` population, and a global `DatabaseModule` with a `DRIZZLE_CLIENT` injection token.

**Architecture:** A global `DatabaseModule` exports a `DRIZZLE_CLIENT` provider (using `postgres` driver + `drizzle-orm/postgres-js`). Schema files live in `src/database/schema/`. Drizzle-kit generates SQL migrations into `drizzle/migrations/`; a second hand-written migration adds the tsvector trigger.

**Tech Stack:** `drizzle-orm`, `postgres` (postgres.js), `drizzle-kit` (dev), NestJS 11, TypeScript 6, pnpm

---

## Prerequisites

- A running PostgreSQL instance. `DB_URI` must be set in `.env` (see `.env.example`).
- The NestJS project is already bootstrapped (INF-1 complete).

---

## Task 1: Install Drizzle dependencies

**Files:**
- Modify: `package.json` (scripts section only — via pnpm commands)

**Step 1: Install runtime dependencies**

```bash
pnpm add drizzle-orm postgres
```

**Step 2: Install dev dependency**

```bash
pnpm add -D drizzle-kit
```

**Step 3: Verify install**

```bash
pnpm drizzle-kit --version
# Expected: drizzle-kit vX.X.X
```

**Step 4: Add db scripts to `package.json`**

Add inside the `"scripts"` block:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

---

## Task 2: Create `translations` schema

**Files:**
- Create: `src/database/schema/translations.schema.ts`

**Step 1: Write the schema**

```ts
import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const translations = pgTable('translations', {
  id: varchar('id').primaryKey(),
  abbreviation: varchar('abbreviation').notNull(),
  name: varchar('name').notNull(),
  language: varchar('language').notNull(),
  copyright: text('copyright').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
# Expected: no errors
```

---

## Task 3: Create `books` schema

**Files:**
- Create: `src/database/schema/books.schema.ts`

**Step 1: Write the schema**

```ts
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
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
# Expected: no errors
```

---

## Task 4: Create `verses` schema

**Files:**
- Create: `src/database/schema/verses.schema.ts`

**Step 1: Write the schema**

```ts
import { customType, index, integer, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

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
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    unique('verses_translation_reference_unique').on(t.translationId, t.reference),
    index('verses_text_search_gin_idx').using('gin', t.textSearch),
  ],
);
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
# Expected: no errors
```

---

## Task 5: Create schema index

**Files:**
- Create: `src/database/schema/index.ts`

**Step 1: Write the index**

```ts
export * from './books.schema';
export * from './translations.schema';
export * from './verses.schema';
```

---

## Task 6: Create `drizzle.config.ts`

**Files:**
- Create: `drizzle.config.ts` (project root, alongside `package.json`)

**Step 1: Write config**

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URI!,
  },
});
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
# Expected: no errors
```

---

## Task 7: Generate initial migration

**Step 1: Run generator**

```bash
pnpm db:generate
```

Expected output: something like:
```
[✓] Your SQL migration file ➜ drizzle/migrations/0000_initial.sql
```

---

## Task 8: Add tsvector trigger migration

**Files:**
- Create: `drizzle/migrations/0001_verses_text_search_trigger.sql`

**Step 1: Write the SQL migration**

```sql
CREATE OR REPLACE FUNCTION verses_text_search_update()
RETURNS trigger AS $$
BEGIN
  NEW.text_search := to_tsvector('english', NEW.text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verses_text_search_trigger
BEFORE INSERT OR UPDATE ON verses
FOR EACH ROW EXECUTE FUNCTION verses_text_search_update();
```

> **Note:** drizzle-kit applies all SQL files in `drizzle/migrations/` in numeric order. This file runs after the table DDL in `0000_initial.sql`.

---

## Task 9: Create `DatabaseModule`

**Files:**
- Create: `src/database/database.providers.ts`
- Create: `src/database/database.module.ts`

**Step 1: Write `database.providers.ts`**

```ts
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT';

export const databaseProviders = [
  {
    provide: DRIZZLE_CLIENT,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      const client = postgres(config.getOrThrow<string>('DB_URI'));
      return drizzle(client, { schema });
    },
  },
];
```

**Step 2: Write `database.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';

import { DRIZZLE_CLIENT, databaseProviders } from './database.providers';

export { DRIZZLE_CLIENT } from './database.providers';

@Global()
@Module({
  providers: databaseProviders,
  exports: [DRIZZLE_CLIENT],
})
export class DatabaseModule {}
```

**Step 3: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
# Expected: no errors
```

---

## Task 10: Write `DatabaseModule` unit test

**Files:**
- Create: `src/database/database.module.spec.ts`

**Step 1: Write the failing test**

```ts
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { DRIZZLE_CLIENT, DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
  it('provides DRIZZLE_CLIENT token', async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule],
    })
      .overrideProvider(ConfigService)
      .useValue({ getOrThrow: () => 'postgresql://user:pass@localhost:5432/test' })
      .compile();

    const client = module.get(DRIZZLE_CLIENT);
    expect(client).toBeDefined();
  });
});
```

> **Note:** `postgres()` connects lazily — this test verifies DI wiring only, not a live connection.

**Step 2: Run the test to verify it fails**

```bash
pnpm test -- --testPathPattern=database.module.spec
# Expected: FAIL
```

**Step 3: Run the test to verify it passes after Task 9 is complete**

```bash
pnpm test -- --testPathPattern=database.module.spec
# Expected: PASS
```

---

## Task 11: Wire `DatabaseModule` into `AppModule`

**Files:**
- Modify: `src/app.module.ts`

**Step 1: Update the module**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { validate } from './env-validation/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    DatabaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**Step 2: Verify all tests pass**

```bash
pnpm test
# Expected: all pass
```

---

## Task 12: Apply migrations

> **PAUSE — notify the user:** "Ready to apply migrations. Please ensure your PostgreSQL instance is running and `DB_URI` is set in `.env`, then confirm to proceed."

**Step 1: Apply migrations**

```bash
pnpm db:migrate
```

Expected output:
```
[✓] Migrations applied successfully
```

> **PAUSE — notify the user:** "Migrations applied. Please verify manually: connect to the database and confirm the `translations`, `books`, and `verses` tables exist, `verses.text_search` is of type `tsvector` with a GIN index, and the `verses_text_search_trigger` trigger function is present. Confirm when done."
