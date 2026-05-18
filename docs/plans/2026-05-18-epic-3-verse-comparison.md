# Epic 3 Verse Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `GET /verses/:reference` so clients can compare one verse across a required list of translation abbreviations.

**Architecture:** Add a dedicated `VerseModule` with a thin controller, query DTO, service, and response types. The service first checks whether the reference exists anywhere, then applies the requested translation abbreviation filter so existing references can return `translations: []` for unknown or unavailable abbreviations.

**Tech Stack:** NestJS 11, Drizzle ORM, PostgreSQL, class-validator, class-transformer, Jest.

---

## File Structure

- Create `src/verse/verse.module.ts`: wires the verse controller and service.
- Create `src/verse/verse.controller.ts`: exposes `GET /verses/:reference`.
- Create `src/verse/verse.service.ts`: performs reference existence lookup, filtered translation lookup, and response mapping.
- Create `src/verse/verse.types.ts`: defines `VerseComparisonResponse` and `VerseTranslationResult`.
- Create `src/verse/dto/verse-translations-query.dto.ts`: validates and parses the required `translations` query.
- Create `src/verse/dto/verse-translations-query.dto.spec.ts`: verifies query parsing and validation.
- Create `src/verse/verse.service.spec.ts`: verifies lookup behavior and not-found errors.
- Create `src/verse/verse.controller.spec.ts`: verifies controller delegation.
- Modify `src/app.module.ts`: register `VerseModule`.
- Modify `docs/2026-05-11-user-stories.md`: update Epic 3 acceptance criteria to match the approved design.

Do not make git commits unless the user explicitly asks.

---

### Task 1: Add Verse Query DTO

**Files:**

- Create: `src/verse/dto/verse-translations-query.dto.ts`
- Test: `src/verse/dto/verse-translations-query.dto.spec.ts`

- [ ] **Step 1: Write failing DTO tests**

```ts
import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { VerseTranslationsQueryDto } from './verse-translations-query.dto';

describe('VerseTranslationsQueryDto', () => {
  it('parses comma-separated translation abbreviations', async () => {
    const dto = plainToInstance(VerseTranslationsQueryDto, {
      translations: 'KJV, NLT,AMP',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.translations).toEqual(['KJV', 'NLT', 'AMP']);
  });

  it('rejects a missing translations query', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    await expect(
      pipe.transform({}, { type: 'query', metatype: VerseTranslationsQueryDto })
    ).rejects.toMatchObject({
      response: {
        message: expect.arrayContaining(['translations is required']),
      },
    });
  });

  it('rejects an empty translations query', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    await expect(
      pipe.transform(
        { translations: ' , ' },
        { type: 'query', metatype: VerseTranslationsQueryDto }
      )
    ).rejects.toMatchObject({
      response: {
        message: ['translations cannot be empty'],
      },
    });
  });
});
```

- [ ] **Step 2: Run DTO tests to verify they fail**

Run:

```bash
pnpm test -- verse-translations-query.dto
```

Expected: FAIL because `VerseTranslationsQueryDto` does not exist.

- [ ] **Step 3: Implement the DTO**

```ts
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class VerseTranslationsQueryDto {
  @Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }

    return String(value)
      .split(',')
      .map((abbreviation) => abbreviation.trim())
      .filter(Boolean);
  })
  @IsNotEmpty({ message: 'translations is required' })
  @IsArray({ message: 'translations must be a comma-separated list' })
  @ArrayNotEmpty({ message: 'translations cannot be empty' })
  @IsString({ each: true, message: 'each translation must be a string' })
  translations: string[];
}
```

- [ ] **Step 4: Run DTO tests to verify they pass**

Run:

```bash
pnpm test -- verse-translations-query.dto
```

Expected: PASS.

---

### Task 2: Add Verse Response Types

**Files:**

- Create: `src/verse/verse.types.ts`

- [ ] **Step 1: Write response types**

```ts
export interface VerseTranslationResult {
  id: string;
  abbreviation: string;
  text: string;
  copyright: string;
}

export interface VerseComparisonResponse {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  translations: VerseTranslationResult[];
}
```

- [ ] **Step 2: Run TypeScript build**

Run:

```bash
pnpm run build
```

Expected: PASS because the types are isolated.

---

### Task 3: Add Verse Service Tests

**Files:**

- Create: `src/verse/verse.service.spec.ts`

- [ ] **Step 1: Write failing service tests**

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { AppError } from '../utils/app-error';
import { VerseService } from './verse.service';

describe('VerseService', () => {
  const referenceRow = {
    reference: 'JHN.3.16',
    book: 'JHN',
    chapter: 3,
    verse: 16,
  };

  const translationRows = [
    {
      id: 'de4e12af7f28f599-01',
      abbreviation: 'KJV',
      text: 'For God so loved the world',
      copyright: 'King James Version. Public Domain.',
    },
    {
      id: '65eec8e0b60e656b-01',
      abbreviation: 'NLT',
      text: 'For this is how God loved the world',
      copyright: 'New Living Translation copyright text',
    },
  ];

  const createDb = (
    referenceRows: (typeof referenceRow)[],
    rows: typeof translationRows
  ) => {
    const limit = jest.fn().mockResolvedValue(referenceRows);
    const whereForReference = jest.fn(() => ({ limit }));
    const fromForReference = jest.fn(() => ({ where: whereForReference }));

    const orderBy = jest.fn().mockResolvedValue(rows);
    const whereForTranslations = jest.fn(() => ({ orderBy }));
    const innerJoinForTranslations = jest.fn(() => ({
      where: whereForTranslations,
    }));
    const fromForTranslations = jest.fn(() => ({
      innerJoin: innerJoinForTranslations,
    }));

    const select = jest
      .fn()
      .mockReturnValueOnce({ from: fromForReference })
      .mockReturnValueOnce({ from: fromForTranslations });

    return {
      db: { select },
      fromForReference,
      fromForTranslations,
      innerJoinForTranslations,
      limit,
      orderBy,
      select,
      whereForReference,
      whereForTranslations,
    };
  };

  async function createService(db: unknown) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerseService, { provide: DRIZZLE_CLIENT, useValue: db }],
    }).compile();

    return module.get(VerseService);
  }

  it('returns verse metadata with matching translations', async () => {
    const mock = createDb([referenceRow], translationRows);
    const service = await createService(mock.db);

    await expect(
      service.findByReference('JHN.3.16', ['KJV', 'NLT', 'AMP'])
    ).resolves.toEqual({
      reference: 'JHN.3.16',
      book: 'JHN',
      chapter: 3,
      verse: 16,
      translations: translationRows,
    });
    expect(mock.select).toHaveBeenCalledTimes(2);
    expect(mock.limit).toHaveBeenCalledWith(1);
    expect(mock.innerJoinForTranslations).toHaveBeenCalledTimes(1);
  });

  it('returns an empty translations array when the reference exists but no abbreviations match', async () => {
    const mock = createDb([referenceRow], []);
    const service = await createService(mock.db);

    await expect(service.findByReference('JHN.3.16', ['ZZZ'])).resolves.toEqual(
      {
        reference: 'JHN.3.16',
        book: 'JHN',
        chapter: 3,
        verse: 16,
        translations: [],
      }
    );
  });

  it('throws AppError when the reference does not exist anywhere', async () => {
    const mock = createDb([], []);
    const service = await createService(mock.db);

    try {
      await service.findByReference('INVALID', ['KJV']);
      throw new Error('Expected findByReference to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({
        message:
          'We cannot seem to find that verse. Please check the reference and try again',
        statusCode: 404,
      });
    }
    expect(mock.select).toHaveBeenCalledTimes(1);
    expect(mock.fromForTranslations).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run service tests to verify they fail**

Run:

```bash
pnpm test -- verse.service
```

Expected: FAIL because `VerseService` does not exist.

---

### Task 4: Implement Verse Service

**Files:**

- Create: `src/verse/verse.service.ts`
- Test: `src/verse/verse.service.spec.ts`

- [ ] **Step 1: Write the service implementation**

```ts
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
```

- [ ] **Step 2: Run service tests**

Run:

```bash
pnpm test -- verse.service
```

Expected: PASS.

---

### Task 5: Add Verse Controller and Module

**Files:**

- Create: `src/verse/verse.controller.ts`
- Create: `src/verse/verse.controller.spec.ts`
- Create: `src/verse/verse.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Write failing controller test**

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { VerseTranslationsQueryDto } from './dto/verse-translations-query.dto';
import { VerseController } from './verse.controller';
import { VerseService } from './verse.service';

describe('VerseController', () => {
  const response = {
    reference: 'JHN.3.16',
    book: 'JHN',
    chapter: 3,
    verse: 16,
    translations: [],
  };
  const service = {
    findByReference: jest.fn().mockResolvedValue(response),
  };

  let controller: VerseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerseController],
      providers: [{ provide: VerseService, useValue: service }],
    }).compile();

    controller = module.get(VerseController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates raw reference and parsed translations to VerseService', async () => {
    const query: VerseTranslationsQueryDto = {
      translations: ['KJV', 'NLT'],
    };

    await expect(controller.findByReference('JHN.3.16', query)).resolves.toBe(
      response
    );
    expect(service.findByReference).toHaveBeenCalledWith('JHN.3.16', [
      'KJV',
      'NLT',
    ]);
  });
});
```

- [ ] **Step 2: Run controller test to verify it fails**

Run:

```bash
pnpm test -- verse.controller
```

Expected: FAIL because `VerseController` does not exist.

- [ ] **Step 3: Implement controller**

```ts
import { Controller, Get, Param, Query } from '@nestjs/common';

import { VerseTranslationsQueryDto } from './dto/verse-translations-query.dto';
import { VerseService } from './verse.service';
import { VerseComparisonResponse } from './verse.types';

@Controller('verses')
export class VerseController {
  constructor(private readonly verseService: VerseService) {}

  @Get(':reference')
  findByReference(
    @Param('reference') reference: string,
    @Query() query: VerseTranslationsQueryDto
  ): Promise<VerseComparisonResponse> {
    return this.verseService.findByReference(reference, query.translations);
  }
}
```

- [ ] **Step 4: Implement module**

```ts
import { Module } from '@nestjs/common';

import { VerseController } from './verse.controller';
import { VerseService } from './verse.service';

@Module({
  controllers: [VerseController],
  providers: [VerseService],
})
export class VerseModule {}
```

- [ ] **Step 5: Register module in AppModule**

Update `src/app.module.ts` imports:

```ts
import { VerseModule } from './verse/verse.module';
```

Add `VerseModule` after `SearchModule` in the `imports` array:

```ts
    TranslationModule,
    SearchModule,
    VerseModule,
```

- [ ] **Step 6: Run controller test**

Run:

```bash
pnpm test -- verse.controller
```

Expected: PASS.

---

### Task 6: Update Epic 3 User Stories

**Files:**

- Modify: `docs/2026-05-11-user-stories.md`

- [ ] **Step 1: Update US-3.1 acceptance criteria**

Replace the US-3.1 acceptance criteria with:

```md
- `GET /verses/JHN.3.16?translations=KJV,NLT,AMP` returns the verse from matching ingested translations
- `translations` is required and accepts comma-separated translation abbreviations
- Response includes `reference`, `book`, `chapter`, `verse`, and a `translations` array
- Each translation entry includes `id`, `abbreviation`, `text`, and `copyright`
- If a translation abbreviation is requested but that verse has not been ingested, it is omitted from the `translations` array
- Unknown translation abbreviations are ignored and are not errors
- If the reference exists in any ingested translation but none of the requested abbreviations match, returns `200` with `translations: []`
- Returns 404 with a meaningful error if the reference does not exist in any ingested translation
```

- [ ] **Step 2: Update US-3.2 acceptance criteria**

Replace the US-3.2 acceptance criteria with:

```md
- `translations` is required for `GET /verses/:reference`
- Missing or empty `translations` returns 400 with a clear validation message
- Reference values are passed to the database as provided; no verse-reference format parser is added
- `GET /verses/INVALID?translations=KJV` returns 404 when `INVALID` has no ingested rows
- Error responses use the existing global shape: `{ "status": "fail", "message": "..." }`
```

- [ ] **Step 3: Review the edited section**

Run:

```bash
sed -n '283,330p' docs/2026-05-11-user-stories.md
```

Expected: Epic 3 reflects the approved design and no longer requires `{ "error": "...", "statusCode": 400 }`.

---

### Task 7: Verify Epic 3

**Files:**

- Verify all files changed by Tasks 1-6.

- [ ] **Step 1: Run targeted verse tests**

Run:

```bash
pnpm test -- verse
```

Expected: PASS for DTO, service, and controller tests.

- [ ] **Step 2: Run full unit test suite**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm run build
```

Expected: PASS.

- [ ] **Step 4: Check worktree**

Run:

```bash
git status --short
```

Expected: Shows only the intended Epic 3 design, plan, source, test, and user story changes.
