# US-2.1 Search Verses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `GET /search` so users can search verse text across required selected translations using PostgreSQL full-text search.

**Architecture:** Add a focused `SearchModule` with a controller, query DTO, service, and response DTOs. The controller stays thin, the service uses translation abbreviations from query parameters, delegates full-text matching and ranking to Postgres, and returns the same list envelope style used by Gate `Factory.getAll`; the existing global response interceptor wraps that envelope under `{ status, data }` for HTTP responses.

**Tech Stack:** NestJS 11, Drizzle ORM, PostgreSQL `websearch_to_tsquery`, `ts_rank`, Jest.

---

## File Structure

- Create `src/search/search.module.ts`: wires the search controller and service.
- Create `src/search/search.controller.ts`: exposes `GET /search`.
- Create `src/search/search.service.ts`: uses abbreviations from the DTO, builds Drizzle queries, returns list envelope for the global response wrapper.
- Create `src/search/dto/search-query.dto.ts`: validates required `q` and `abbreviations`, transforms abbreviations into an array, and transforms `page`/`limit` into positive integers.
- Create `src/types/paginated-response.ts`: defines the reusable list envelope.
- Create `src/search/search.types.ts`: defines the search row shape and search response alias.
- Create `src/search/search.controller.spec.ts`: verifies controller delegation.
- Create `src/search/search.service.spec.ts`: verifies parsing, empty results, count/page metadata, and row mapping.
- Modify `src/app.module.ts`: import `SearchModule` and enable global DTO transformation.
- Modify `docs/2026-05-11-user-stories.md`: ensure US-2.1 reflects required `abbreviations` and wrapped Factory-style response.

Do not make git commits unless the user explicitly asks.

---

### Task 1: Add Search Query DTO

**Files:**

- Create: `src/search/dto/search-query.dto.ts`

- [ ] **Step 1: Write the DTO**

```ts
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

export class SearchQueryDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString({ message: 'q must be a string' })
  @IsNotEmpty({ message: 'q is required' })
  q: string;

  @Transform(({ value }) =>
    String(value ?? '')
      .split(',')
      .map((abbreviation) => abbreviation.trim())
      .filter(Boolean)
  )
  @IsArray({ message: 'abbreviations must be a comma-separated list' })
  @ArrayNotEmpty({ message: 'abbreviations cannot be empty' })
  @IsString({ each: true, message: 'each abbreviation must be a string' })
  abbreviations: string[];

  @Transform(({ value }) => (value === undefined ? 1 : Number(value)))
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page: number = 1;

  @Transform(({ value }) => (value === undefined ? 10 : Number(value)))
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  limit: number = 10;
}
```

`IsNumberString` was checked in the installed `class-validator` package. It accepts validator.js `IsNumericOptions`: `no_symbols` and `locale`. Do not combine it with transformed numeric `page`/`limit` fields here because `Min` validates only actual numbers after class-transformer runs.

- [ ] **Step 2: Run targeted tests**

Run:

```bash
mise exec -- pnpm test -- search
```

Expected: fails because no search tests exist yet or no matching tests are found.

---

### Task 2: Add Search Response Types

**Files:**

- Create: `src/types/paginated-response.ts`
- Create: `src/search/search.types.ts`

- [ ] **Step 1: Write reusable paginated response type**

```ts
export interface PaginatedResponse<T> {
  totalDocuments: number;
  totalPages: number;
  currentPage: number;
  numOfResults: number;
  data: T[];
}
```

- [ ] **Step 2: Write search response types**

```ts
import { PaginatedResponse } from '../types/paginated-response';

export interface SearchResult {
  reference: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  copyright: string;
}

export type SearchResponse = PaginatedResponse<SearchResult>;
```

- [ ] **Step 3: Run TypeScript build**

Run:

```bash
mise exec -- pnpm run build
```

Expected: build still passes because the types file is isolated.

---

### Task 3: Add Search Service Tests

**Files:**

- Create: `src/search/search.service.spec.ts`

- [ ] **Step 1: Write failing service tests**

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { SearchService } from './search.service';

describe('SearchService', () => {
  const row = {
    reference: '1CO.13.4',
    translation: 'engKJV',
    book: '1CO',
    chapter: 13,
    verse: 4,
    text: 'Charity suffereth long, and is kind',
    copyright: 'King James Version. Public Domain.',
  };

  const createDb = (totalDocuments: number, rows: (typeof row)[]) => {
    const whereForCount = jest.fn().mockResolvedValue([{ totalDocuments }]);
    const innerJoinForCount = jest.fn(() => ({ where: whereForCount }));
    const fromForCount = jest.fn(() => ({ innerJoin: innerJoinForCount }));

    const limit = jest.fn().mockResolvedValue(rows);
    const offset = jest.fn(() => ({ limit }));
    const orderBy = jest.fn(() => ({ offset }));
    const whereForRows = jest.fn(() => ({ orderBy }));
    const innerJoinForRows = jest.fn(() => ({ where: whereForRows }));
    const fromForRows = jest.fn(() => ({ innerJoin: innerJoinForRows }));

    const select = jest
      .fn()
      .mockReturnValueOnce({ from: fromForCount })
      .mockReturnValueOnce({ from: fromForRows });

    return {
      db: { select },
      select,
      fromForCount,
      innerJoinForCount,
      whereForCount,
      fromForRows,
      innerJoinForRows,
      whereForRows,
      orderBy,
      offset,
      limit,
    };
  };

  async function createService(db: unknown) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: DRIZZLE_CLIENT, useValue: db }],
    }).compile();

    return module.get(SearchService);
  }

  it('returns a Factory-style envelope for matching verses', async () => {
    const mock = createDb(1, [row]);
    const service = await createService(mock.db);

    await expect(
      service.search({
        q: 'love is patient',
        abbreviations: ['engKJV', 'NLT'],
        page: 1,
        limit: 10,
      })
    ).resolves.toEqual({
      totalDocuments: 1,
      totalPages: 1,
      currentPage: 1,
      numOfResults: 1,
      data: [row],
    });
    expect(mock.select).toHaveBeenCalledTimes(2);
    expect(mock.offset).toHaveBeenCalledWith(0);
    expect(mock.limit).toHaveBeenCalledWith(10);
  });

  it('returns an empty envelope when no verse matches', async () => {
    const mock = createDb(0, []);
    const service = await createService(mock.db);

    await expect(
      service.search({
        q: 'zzzzzz',
        abbreviations: ['engKJV'],
        page: 1,
        limit: 10,
      })
    ).resolves.toEqual({
      totalDocuments: 0,
      totalPages: 1,
      currentPage: 1,
      numOfResults: 0,
      data: [],
    });
  });

  it('returns an empty envelope when the transformed abbreviations array is empty', async () => {
    const mock = createDb(0, []);
    const service = await createService(mock.db);

    await expect(
      service.search({ q: 'patience', abbreviations: [], page: 1, limit: 10 })
    ).resolves.toMatchObject({
      totalDocuments: 0,
      data: [],
    });
    expect(mock.select).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the failing service tests**

Run:

```bash
mise exec -- pnpm test -- search.service
```

Expected: FAIL because `src/search/search.service.ts` does not exist.

---

### Task 4: Implement Search Service

**Files:**

- Create: `src/search/search.service.ts`

- [ ] **Step 1: Write the service**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations, verses } from '../database/schema';
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
      sql`${verses.textSearch} @@ ${searchQuery}`
    );
    const rank = sql<number>`ts_rank(${verses.textSearch}, ${searchQuery})`;

    const totalRows = await this.db
      .select({ totalDocuments: count() })
      .from(verses)
      .innerJoin(translations, eq(verses.translationId, translations.id))
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
      .where(searchCondition)
      .orderBy(desc(rank))
      .offset(offset)
      .limit(resultsPerPage);

    return {
      totalDocuments,
      totalPages: Math.max(1, Math.ceil(totalDocuments / resultsPerPage)),
      currentPage,
      numOfResults: rows.length,
      data: rows,
    };
  }
}
```

- [ ] **Step 2: Run service tests**

Run:

```bash
mise exec -- pnpm test -- search.service
```

Expected: PASS.

---

### Task 5: Add Search Controller Tests

**Files:**

- Create: `src/search/search.controller.spec.ts`

- [ ] **Step 1: Write failing controller test**

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  const response = {
    totalDocuments: 0,
    totalPages: 1,
    currentPage: 1,
    numOfResults: 0,
    data: [],
  };
  const service = {
    search: jest.fn().mockResolvedValue(response),
  };

  let controller: SearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: service }],
    }).compile();

    controller = module.get(SearchController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates search queries to SearchService', async () => {
    const query = {
      q: 'patience',
      abbreviations: ['engKJV'],
      page: 1,
      limit: 10,
    };

    await expect(controller.search(query)).resolves.toBe(response);
    expect(service.search).toHaveBeenCalledWith(query);
  });
});
```

- [ ] **Step 2: Run the failing controller test**

Run:

```bash
mise exec -- pnpm test -- search.controller
```

Expected: FAIL because `src/search/search.controller.ts` does not exist.

---

### Task 6: Implement Search Controller and Module

**Files:**

- Create: `src/search/search.controller.ts`
- Create: `src/search/search.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Write controller**

```ts
import { Controller, Get, Query } from '@nestjs/common';

import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';
import { SearchResponse } from './search.types';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.searchService.search(query);
  }
}
```

- [ ] **Step 2: Write module**

```ts
import { Module } from '@nestjs/common';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
```

- [ ] **Step 3: Register module and enable DTO transforms in `src/app.module.ts`**

Update imports:

```ts
import { SearchModule } from './search/search.module';
```

Update the module imports array:

```ts
    SearchModule,
```

Update the existing global validation pipe:

```ts
      useValue: new ValidationPipe({
        whitelist: true,
        stopAtFirstError: true,
        transform: true,
      }),
```

Use the global pipe rather than creating a new route-level `ValidationPipe`; the app already has a global validation boundary and only needs transformation enabled there.

- [ ] **Step 4: Run controller test**

Run:

```bash
mise exec -- pnpm test -- search.controller
```

Expected: PASS.

- [ ] **Step 5: Run service test**

Run:

```bash
mise exec -- pnpm test -- search.service
```

Expected: PASS.

---

### Task 7: Align User Story Documentation

**Files:**

- Modify: `docs/2026-05-11-user-stories.md`

- [ ] **Step 1: Confirm US-2.1 acceptance criteria include these exact behaviors**

The US-2.1 section should state:

```md
- `abbreviations` is required; omitting it returns a 400 with a clear validation error
- `abbreviations` accepts translation abbreviations as returned by `GET /translations`, not API.Bible translation IDs
- HTTP responses use the global success wrapper, with the standard list envelope inside `data`
- Each item in the envelope's `data` array contains `reference`, `translation`, `book`, `chapter`, `verse`, `text`, and `copyright`
- Each result's `translation` field contains the translation abbreviation
- Results are one entry per verse-per-translation match (not grouped)
- Returns an empty `data` array (not 404) when no matches are found
```

The US-2.1c section should state:

```md
- Query with no matches returns `{ "status": "success", "data": { "totalDocuments": 0, "totalPages": 1, "currentPage": 1, "numOfResults": 0, "data": [] } }`
- HTTP status is 200, not 404
- Response uses the global success wrapper and standard list envelope, consistent with non-empty responses
```

- [ ] **Step 2: Add all-invalid translation behavior**

Add this bullet under US-2.1b:

```md
- If all requested translation abbreviations are invalid, the endpoint returns a wrapped standard empty list envelope with HTTP 200
```

---

### Task 8: Final Verification

**Files:**

- Verify all changed files.

- [ ] **Step 1: Run search tests**

Run:

```bash
mise exec -- pnpm test -- search
```

Expected: PASS for `search.service.spec.ts` and `search.controller.spec.ts`.

- [ ] **Step 2: Run full unit suite**

Run:

```bash
mise exec -- pnpm test
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
mise exec -- pnpm run build
```

Expected: PASS.

- [ ] **Step 4: Inspect git diff**

Run:

```bash
git diff -- src/search src/app.module.ts docs/2026-05-11-user-stories.md
```

Expected: diff contains only the search feature, app module registration, and US-2.1 documentation updates.

---

## Self-Review

- Spec coverage: required `q`, required `abbreviations`, web-style full-text search, exact text match boosting before `ts_rank` ordering, per-translation verse rows, copyright field, invalid translation abbreviations ignored by the SQL `IN` filter, wrapped empty response envelope, and Factory-style list response are covered.
- Placeholder scan: no placeholder tasks remain.
- Type consistency: `SearchQueryDto`, `SearchResponse`, `SearchService.search`, and `SearchController.search` signatures match across tasks.
