# US-1.2 List Available Translations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /translations` to return locally available translation metadata.

**Architecture:** Create a dedicated translation feature module with a controller, service, and DTO. The controller exposes the route, the service queries the `translations` table through `DRIZZLE_CLIENT`, and the query selects the public `last_synced_at` field name directly.

**Tech Stack:** NestJS, Drizzle ORM, Jest, TypeScript

---

## File Structure

- Create: `src/translation/dto/translation-response.dto.ts`
  - Defines the public response shape for one translation.
- Create: `src/translation/translation.service.ts`
  - Queries `translations` using the API response field names.
- Create: `src/translation/translation.service.spec.ts`
  - Unit tests for selected fields and empty results.
- Create: `src/translation/translation.controller.ts`
  - Exposes `GET /translations`.
- Create: `src/translation/translation.controller.spec.ts`
  - Unit test for controller delegation.
- Create: `src/translation/translation.module.ts`
  - Registers controller and service.
- Modify: `src/app.module.ts`
  - Imports `TranslationModule`.

## Task 1: Add Translation DTO

**Files:**

- Create: `src/translation/dto/translation-response.dto.ts`

- [ ] **Step 1: Create the response DTO**

```ts
export class TranslationResponseDto {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  last_synced_at: Date | null;
}
```

- [ ] **Step 2: Run targeted TypeScript build**

Run:

```bash
mise exec -- pnpm build
```

Expected: build can fail because the DTO is not wired yet, but this file has no syntax errors. If the only errors mention unused or missing translation module files, continue to Task 2.

## Task 2: Add Translation Service With Tests

**Files:**

- Create: `src/translation/translation.service.spec.ts`
- Create: `src/translation/translation.service.ts`

- [ ] **Step 1: Write the failing service tests**

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations } from '../database/schema';
import { TranslationService } from './translation.service';

const mockFrom = jest.fn();
const mockSelect = jest.fn(() => ({ from: mockFrom }));

const mockDb = {
  select: mockSelect,
};

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: DRIZZLE_CLIENT, useValue: mockDb },
      ],
    }).compile();

    service = module.get(TranslationService);
  });

  it('returns translation rows', async () => {
    const syncedAt = new Date('2026-05-18T14:30:00.000Z');
    mockFrom.mockResolvedValueOnce([
      {
        id: 'de4e12af7f28f599-02',
        abbreviation: 'KJV',
        name: 'King James Version',
        language: 'eng',
        last_synced_at: syncedAt,
      },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 'de4e12af7f28f599-02',
        abbreviation: 'KJV',
        name: 'King James Version',
        language: 'eng',
        last_synced_at: syncedAt,
      },
    ]);
    expect(mockSelect).toHaveBeenCalledWith({
      id: translations.id,
      abbreviation: translations.abbreviation,
      name: translations.name,
      language: translations.language,
      last_synced_at: translations.lastSyncedAt,
    });
    expect(mockFrom).toHaveBeenCalledWith(translations);
  });

  it('returns an empty array when no translations exist', async () => {
    mockFrom.mockResolvedValueOnce([]);

    await expect(service.findAll()).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run the failing service tests**

Run:

```bash
mise exec -- pnpm jest --watchman=false --runInBand translation.service.spec.ts
```

Expected: FAIL because `src/translation/translation.service.ts` does not exist.

- [ ] **Step 3: Implement the service**

```ts
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
    const rows = await this.db
      .select({
        id: translations.id,
        abbreviation: translations.abbreviation,
        name: translations.name,
        language: translations.language,
        last_synced_at: translations.lastSyncedAt,
      })
      .from(translations);

    return rows;
  }
}
```

- [ ] **Step 4: Run the service tests**

Run:

```bash
mise exec -- pnpm jest --watchman=false --runInBand translation.service.spec.ts
```

Expected: PASS.

## Task 3: Add Controller With Tests

**Files:**

- Create: `src/translation/translation.controller.spec.ts`
- Create: `src/translation/translation.controller.ts`

- [ ] **Step 1: Write the failing controller test**

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';

const mockTranslationService = {
  findAll: jest.fn(),
};

describe('TranslationController', () => {
  let controller: TranslationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslationController],
      providers: [
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compile();

    controller = module.get(TranslationController);
  });

  it('returns translations from the service', async () => {
    const translations = [
      {
        id: 'de4e12af7f28f599-02',
        abbreviation: 'KJV',
        name: 'King James Version',
        language: 'eng',
        last_synced_at: new Date('2026-05-18T14:30:00.000Z'),
      },
    ];
    mockTranslationService.findAll.mockResolvedValueOnce(translations);

    await expect(controller.findAll()).resolves.toBe(translations);
    expect(mockTranslationService.findAll).toHaveBeenCalledWith();
  });
});
```

- [ ] **Step 2: Run the failing controller test**

Run:

```bash
mise exec -- pnpm jest --watchman=false --runInBand translation.controller.spec.ts
```

Expected: FAIL because `src/translation/translation.controller.ts` does not exist.

- [ ] **Step 3: Implement the controller**

```ts
import { Controller, Get } from '@nestjs/common';

import { TranslationResponseDto } from './dto/translation-response.dto';
import { TranslationService } from './translation.service';

@Controller('translations')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  findAll(): Promise<TranslationResponseDto[]> {
    return this.translationService.findAll();
  }
}
```

- [ ] **Step 4: Run the controller test**

Run:

```bash
mise exec -- pnpm jest --watchman=false --runInBand translation.controller.spec.ts
```

Expected: PASS.

## Task 4: Register The Translation Module

**Files:**

- Create: `src/translation/translation.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create the module**

```ts
import { Module } from '@nestjs/common';

import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';

@Module({
  controllers: [TranslationController],
  providers: [TranslationService],
})
export class TranslationModule {}
```

- [ ] **Step 2: Import the module in `src/app.module.ts`**

Add:

```ts
import { TranslationModule } from './translation/translation.module';
```

Include it in the `imports` array:

```ts
TranslationModule,
```

The final imports array should include:

```ts
imports: [
  ConfigModule.forRoot({ isGlobal: true, validate }),
  BullConfigModule,
  ScheduleModule.forRoot(),
  DatabaseModule,
  ApiBibleModule,
  IngestionModule,
  TranslationModule,
],
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
mise exec -- pnpm jest --watchman=false --runInBand translation.service.spec.ts translation.controller.spec.ts
```

Expected: PASS.

## Task 5: Final Verification

**Files:**

- Verify: `src/translation/dto/translation-response.dto.ts`
- Verify: `src/translation/translation.service.ts`
- Verify: `src/translation/translation.controller.ts`
- Verify: `src/translation/translation.module.ts`
- Verify: `src/app.module.ts`

- [ ] **Step 1: Run the build**

Run:

```bash
mise exec -- pnpm build
```

Expected: PASS.

- [ ] **Step 2: Run the relevant test suite**

Run:

```bash
mise exec -- pnpm jest --watchman=false --runInBand translation.service.spec.ts translation.controller.spec.ts ingestion.controller.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Check git status**

Run:

```bash
git status --short
```

Expected: only the US-1.2 spec, plan, and translations implementation files are changed. Do not commit unless the user explicitly requests it.
