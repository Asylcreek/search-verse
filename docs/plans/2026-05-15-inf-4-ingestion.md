# INF-4: Data Ingestion Implementation Plan

> REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Build an async data ingestion pipeline — CLI command, HTTP endpoint, and cron scheduler — that walks the api.bible hierarchy for a given `bibleId` and seeds PostgreSQL via BullMQ workers.

**Architecture:** All three triggers (CLI, `POST /translations/ingest`, cron) enqueue jobs to a BullMQ `ingestion` queue. `IngestionProcessor` picks up jobs and delegates to `IngestionService`, which fetches at chapter granularity (~1,189 requests vs ~31,000 verse-level), parses JSON content nodes, and upserts verses with `to_tsvector` population. The CLI blocks via `QueueEvents.waitUntilFinished()` for synchronous operator feedback.

**Tech Stack:** `@nestjs/bullmq`, `bullmq`, `nest-commander`, `p-limit`, `@nestjs/schedule`, `drizzle-orm`, `concurrently`

**Feature Branch:** `inf-4-data-ingestion`

**Design Doc:** `docs/2026-05-15-inf-4-ingestion-design.md`

---

## Task 1: Install dependencies and update scripts

**Files:**

- Modify: `package.json`

**Step 1: Install production dependencies**

```bash
pnpm add @nestjs/bullmq bullmq @nestjs/schedule nest-commander p-limit
```

**Step 2: Install dev dependencies**

```bash
pnpm add -D concurrently
```

**Step 3: Update scripts in `package.json`**

Change `start:dev` and add `cli`:

```json
"start:dev": "concurrently \"redis-server\" \"nest start --watch\" --kill-others-on-fail",
"cli": "ts-node -r tsconfig-paths/register src/cli.ts",
```

**Step 4: Verify install**

```bash
pnpm list @nestjs/bullmq bullmq nest-commander p-limit concurrently @nestjs/schedule
```

Expected: all packages listed under dependencies/devDependencies.

---

## Task 2: Add Redis env vars to env validation

**Files:**

- Modify: `src/env-validation/env.dto.ts`

**Step 1: Add the fields**

Full file after change:

```ts
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvDTO {
  @IsEnum(Environment)
  @IsNotEmpty()
  NODE_ENV: Environment;

  @IsString()
  @IsNotEmpty()
  DB_URI: string;

  @IsNumberString()
  @IsNotEmpty()
  PORT: string;

  @IsString()
  @IsNotEmpty()
  API_BIBLE_KEY: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsNumberString()
  @IsNotEmpty()
  REDIS_PORT: string;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsOptional()
  REDIS_USE_TLS?: string;
}
```

**Step 2: Add Redis vars to `.env`**

```bash
echo "REDIS_HOST=localhost" >> .env
echo "REDIS_PORT=6379" >> .env
```

**Step 3: Verify build**

```bash
pnpm build
```

Expected: no TypeScript errors.

---

## Task 3: Add chapter content types and `getChapterVerses()` (TDD)

**Files:**

- Modify: `src/api-bible/api-bible.types.ts`
- Modify: `src/api-bible/api-bible.service.ts`
- Modify: `src/api-bible/api-bible.service.spec.ts`

**Step 1: Add types to `api-bible.types.ts`**

Append to the existing file:

```ts
export interface ApiBibleContentTextItem {
  text: string;
  tail?: string;
}

export interface ApiBibleContentNode {
  name: string;
  items?: (ApiBibleContentNode | ApiBibleContentTextItem)[];
  attrs?: Record<string, string>;
}

export interface ApiBibleChapterContent {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
  content: ApiBibleContentNode[];
  verseCount: number;
}

export interface ApiBibleVerseText {
  verseId: string;
  reference: string;
  text: string;
}
```

**Step 2: Write the failing tests in `api-bible.service.spec.ts`**

Add a new `describe('getChapterVerses', ...)` block to the existing spec file:

```ts
import {
  ApiBibleChapterContent,
  // ... existing imports
} from './api-bible.types';

// Inside the describe('ApiBibleService') block:

describe('getChapterVerses', () => {
  const chapterContent: ApiBibleChapterContent = {
    id: 'GEN.1',
    bibleId: 'bible-id',
    bookId: 'GEN',
    number: '1',
    reference: 'Genesis 1',
    verseCount: 2,
    content: [
      {
        name: 'para',
        items: [
          {
            name: 'verse',
            attrs: { number: '1' },
            items: [{ text: 'In the beginning.' }],
          },
          {
            name: 'verse',
            attrs: { number: '2' },
            items: [{ text: 'The earth was formless.' }],
          },
        ],
      },
    ],
  };

  it('returns parsed verse list from chapter JSON content', async () => {
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(of(mockAxiosResponse(chapterContent)));

    const result = await service.getChapterVerses('bible-id', 'GEN.1');

    expect(result).toEqual([
      { verseId: 'GEN.1.1', reference: 'GEN.1.1', text: 'In the beginning.' },
      {
        verseId: 'GEN.1.2',
        reference: 'GEN.1.2',
        text: 'The earth was formless.',
      },
    ]);
  });

  it('handles deeply nested verse nodes', async () => {
    const nested: ApiBibleChapterContent = {
      ...chapterContent,
      content: [
        {
          name: 'section',
          items: [
            {
              name: 'para',
              items: [
                {
                  name: 'verse',
                  attrs: { number: '1' },
                  items: [
                    { name: 'char', items: [{ text: 'Nested ' }] },
                    { text: 'text.' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(of(mockAxiosResponse(nested)));

    const result = await service.getChapterVerses('bible-id', 'GEN.1');
    expect(result).toEqual([
      { verseId: 'GEN.1.1', reference: 'GEN.1.1', text: 'Nested text.' },
    ]);
  });

  it('throws ApiBibleError on non-2xx', async () => {
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(throwError(() => mockAxiosError(404)));

    await expect(service.getChapterVerses('bible-id', 'GEN.1')).rejects.toThrow(
      ApiBibleError
    );
  });
});
```

**Step 3: Run tests — verify new tests fail**

```bash
pnpm test api-bible.service
```

Expected: FAIL — `getChapterVerses is not a function`.

**Step 4: Implement `getChapterVerses` and helpers in `api-bible.service.ts`**

Add to the `ApiBibleService` class:

```ts
import {
  ApiBibleBible,
  ApiBibleBook,
  ApiBibleChapterContent,
  ApiBibleChapterSummary,
  ApiBibleContentNode,
  ApiBibleContentTextItem,
  ApiBibleVerse,
  ApiBibleVerseSummary,
  ApiBibleVerseText,
} from './api-bible.types';

// New method:
async getChapterVerses(bibleId: string, chapterId: string): Promise<ApiBibleVerseText[]> {
  const chapter = await this.get<ApiBibleChapterContent>(
    `/bibles/${bibleId}/chapters/${chapterId}`,
    { 'content-type': 'json' },
  );
  return this.parseVerseNodes(chapterId, chapter.content);
}

private parseVerseNodes(
  chapterId: string,
  nodes: ApiBibleContentNode[],
): ApiBibleVerseText[] {
  const verses: ApiBibleVerseText[] = [];
  for (const node of nodes) {
    if (node.name === 'verse' && node.attrs?.['number']) {
      const verseId = `${chapterId}.${node.attrs['number']}`;
      verses.push({
        verseId,
        reference: verseId,
        text: this.extractNodeText(node.items ?? []).trim(),
      });
    } else if (node.items) {
      const childNodes = node.items.filter(
        (item): item is ApiBibleContentNode => 'name' in item,
      );
      verses.push(...this.parseVerseNodes(chapterId, childNodes));
    }
  }
  return verses;
}

private extractNodeText(
  items: (ApiBibleContentNode | ApiBibleContentTextItem)[],
): string {
  return items
    .map((item) =>
      'text' in item
        ? item.text + (item.tail ?? '')
        : this.extractNodeText(item.items ?? []),
    )
    .join('');
}
```

**Step 5: Run tests — verify all pass**

```bash
pnpm test api-bible.service
```

Expected: all tests PASS.

---

## Task 4: Create `IngestionService` (TDD)

**Files:**

- Create: `src/ingestion/ingestion.service.spec.ts`
- Create: `src/ingestion/ingestion.service.ts`

**Step 1: Write the spec**

```ts
// src/ingestion/ingestion.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';

import { ApiBibleService } from '../api-bible/api-bible.service';
import { DRIZZLE_CLIENT } from '../database/database.providers';
import { IngestionService } from './ingestion.service';

const mockBible = {
  id: 'bible-1',
  abbreviation: 'KJV',
  name: 'King James Version',
  copyright: 'Public Domain',
  language: { id: 'eng' },
};

const mockBook = { id: 'GEN', name: 'Genesis' };
const mockChapter = { id: 'GEN.1', number: '1' };
const mockVerseText = {
  verseId: 'GEN.1.1',
  reference: 'GEN.1.1',
  text: 'In the beginning.',
};

const mockApiBible = {
  getBibles: jest.fn().mockResolvedValue([mockBible]),
  getBooks: jest.fn().mockResolvedValue([mockBook]),
  getChapters: jest.fn().mockResolvedValue([mockChapter]),
  getChapterVerses: jest.fn().mockResolvedValue([mockVerseText]),
};

const mockInsert = jest.fn().mockReturnThis();
const mockOnConflict = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockReturnThis();
const mockSet = jest.fn().mockReturnThis();
const mockWhere = jest.fn().mockResolvedValue(undefined);

const mockDb = {
  insert: jest.fn(() => ({
    values: jest.fn(() => ({ onConflictDoUpdate: mockOnConflict })),
  })),
  update: jest.fn(() => ({ set: jest.fn(() => ({ where: mockWhere })) })),
};

describe('IngestionService', () => {
  let service: IngestionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: ApiBibleService, useValue: mockApiBible },
        { provide: DRIZZLE_CLIENT, useValue: mockDb },
      ],
    }).compile();

    service = module.get(IngestionService);
  });

  it('fetches bible metadata and upserts translation', async () => {
    await service.ingest('bible-1');
    expect(mockApiBible.getBibles).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('throws if bibleId is not in accessible bibles list', async () => {
    mockApiBible.getBibles.mockResolvedValueOnce([]);
    await expect(service.ingest('bible-1')).rejects.toThrow(
      'not found or not accessible'
    );
  });

  it('fetches books and chapters', async () => {
    await service.ingest('bible-1');
    expect(mockApiBible.getBooks).toHaveBeenCalledWith('bible-1');
    expect(mockApiBible.getChapters).toHaveBeenCalledWith('bible-1', 'GEN');
  });

  it('fetches chapter verses and upserts', async () => {
    await service.ingest('bible-1');
    expect(mockApiBible.getChapterVerses).toHaveBeenCalledWith(
      'bible-1',
      'GEN.1'
    );
  });

  it('skips intro chapters', async () => {
    mockApiBible.getChapters.mockResolvedValueOnce([
      { id: 'GEN.intro', number: 'intro' },
      { id: 'GEN.1', number: '1' },
    ]);
    await service.ingest('bible-1');
    expect(mockApiBible.getChapterVerses).not.toHaveBeenCalledWith(
      'bible-1',
      'GEN.intro'
    );
    expect(mockApiBible.getChapterVerses).toHaveBeenCalledWith(
      'bible-1',
      'GEN.1'
    );
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
pnpm test ingestion.service
```

Expected: FAIL — `IngestionService` does not exist.

**Step 3: Implement `IngestionService`**

```ts
// src/ingestion/ingestion.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { ApiBibleService } from '../api-bible/api-bible.service';
import { DRIZZLE_CLIENT } from '../database/database.providers';
import { books, translations, verses } from '../database/schema';

const OT_BOOK_COUNT = 39;

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly apiBible: ApiBibleService,
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase
  ) {}

  async ingest(bibleId: string): Promise<void> {
    this.logger.log(`[${bibleId}] Starting ingestion`);

    const bibleList = await this.apiBible.getBibles();
    const bible = bibleList.find((b) => b.id === bibleId);
    if (!bible) throw new Error(`Bible ${bibleId} not found or not accessible`);

    await this.db
      .insert(translations)
      .values({
        id: bible.id,
        abbreviation: bible.abbreviation,
        name: bible.name,
        language: bible.language.id,
        copyright: bible.copyright,
      })
      .onConflictDoUpdate({
        target: translations.id,
        set: {
          abbreviation: sql`excluded.abbreviation`,
          name: sql`excluded.name`,
        },
      });

    const bookList = await this.apiBible.getBooks(bibleId);
    await this.db
      .insert(books)
      .values(
        bookList.map((book, i) => ({
          translationId: bibleId,
          bookId: book.id,
          name: book.name,
          testament: (i < OT_BOOK_COUNT ? 'OT' : 'NT') as 'OT' | 'NT',
          position: i + 1,
        }))
      )
      .onConflictDoUpdate({
        target: [books.translationId, books.bookId],
        set: { name: sql`excluded.name` },
      });

    const chapterTasks: Array<() => Promise<void>> = [];

    for (const book of bookList) {
      const chapters = await this.apiBible.getChapters(bibleId, book.id);
      for (const chapter of chapters) {
        if (chapter.number === 'intro') continue;
        chapterTasks.push(() =>
          this.ingestChapter(bibleId, book.id, chapter.id, chapter.number)
        );
      }
    }

    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(5);
    await Promise.all(chapterTasks.map((task) => limit(task)));

    await this.db
      .update(translations)
      .set({ lastSyncedAt: new Date() })
      .where(eq(translations.id, bibleId));

    this.logger.log(`[${bibleId}] Ingestion complete`);
  }

  private async ingestChapter(
    bibleId: string,
    bookId: string,
    chapterId: string,
    chapterNumber: string
  ): Promise<void> {
    this.logger.log(`[${bibleId}] Fetching ${chapterId}`);
    const verseList = await this.apiBible.getChapterVerses(bibleId, chapterId);
    if (!verseList.length) return;

    const chapterNum = parseInt(chapterNumber, 10);

    await this.db
      .insert(verses)
      .values(
        verseList.map((v) => ({
          translationId: bibleId,
          bookId,
          chapter: chapterNum,
          verse: parseInt(v.verseId.split('.').at(-1) ?? '0', 10),
          reference: v.reference,
          text: v.text,
          textSearch: sql`to_tsvector('english', ${v.text})`,
        }))
      )
      .onConflictDoUpdate({
        target: [verses.translationId, verses.reference],
        set: {
          text: sql`excluded.text`,
          textSearch: sql`to_tsvector('english', excluded.text)`,
          updatedAt: sql`now()`,
        },
      });
  }
}
```

**Step 4: Run tests — verify they pass**

```bash
pnpm test ingestion.service
```

Expected: all tests PASS.

---

## Task 5: Create `IngestionProcessor`

**Files:**

- Create: `src/ingestion/ingestion.processor.ts`

**Step 1: Implement the processor**

```ts
// src/ingestion/ingestion.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { IngestionService } from './ingestion.service';

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private readonly ingestion: IngestionService) {
    super();
  }

  async process(job: Job<{ bibleId: string }>): Promise<void> {
    this.logger.log(`Job ${job.id}: ingesting ${job.data.bibleId}`);
    await this.ingestion.ingest(job.data.bibleId);
    this.logger.log(`Job ${job.id}: complete`);
  }
}
```

**Step 2: Verify build**

```bash
pnpm build
```

Expected: no TypeScript errors.

---

## Task 6: Create `IngestionController` (TDD)

**Files:**

- Create: `src/ingestion/dto/ingest.dto.ts`
- Create: `src/ingestion/ingestion.controller.ts`
- Create: `src/ingestion/ingestion.controller.spec.ts`

**Step 1: Create the DTO**

```ts
// src/ingestion/dto/ingest.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class IngestDto {
  @IsString()
  @IsNotEmpty()
  bibleId: string;
}
```

**Step 2: Write the failing tests**

```ts
// src/ingestion/ingestion.controller.spec.ts
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { IngestionController } from './ingestion.controller';

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-123' }),
};

describe('IngestionController', () => {
  let controller: IngestionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [{ provide: getQueueToken('ingestion'), useValue: mockQueue }],
    }).compile();

    controller = module.get(IngestionController);
  });

  afterEach(() => jest.clearAllMocks());

  it('enqueues an ingestion job and returns jobId', async () => {
    const result = await controller.ingest({ bibleId: 'bible-1' });
    expect(mockQueue.add).toHaveBeenCalledWith('ingest', {
      bibleId: 'bible-1',
    });
    expect(result).toEqual({ jobId: 'job-123' });
  });
});
```

**Step 3: Run tests — verify they fail**

```bash
pnpm test ingestion.controller
```

Expected: FAIL — `IngestionController` does not exist.

**Step 4: Implement the controller**

```ts
// src/ingestion/ingestion.controller.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Queue } from 'bullmq';

import { IngestDto } from './dto/ingest.dto';

@Controller('translations')
export class IngestionController {
  constructor(@InjectQueue('ingestion') private readonly queue: Queue) {}

  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  async ingest(@Body() dto: IngestDto): Promise<{ jobId: string | undefined }> {
    const job = await this.queue.add('ingest', { bibleId: dto.bibleId });
    return { jobId: job.id };
  }
}
```

**Step 5: Run tests — verify they pass**

```bash
pnpm test ingestion.controller
```

Expected: all tests PASS.

---

## Task 7: Create `RefreshScheduler`

**Files:**

- Create: `src/ingestion/refresh.scheduler.ts`

**Step 1: Implement the scheduler**

```ts
// src/ingestion/refresh.scheduler.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_CLIENT } from '../database/database.providers';
import { translations } from '../database/schema';

@Injectable()
export class RefreshScheduler {
  private readonly logger = new Logger(RefreshScheduler.name);

  constructor(
    @InjectQueue('ingestion') private readonly queue: Queue,
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshStaleTranslations(): Promise<void> {
    const stale = await this.db
      .select({ id: translations.id })
      .from(translations)
      .where(
        sql`${translations.lastSyncedAt} < now() - interval '30 days'
          OR ${translations.lastSyncedAt} IS NULL`
      );

    if (!stale.length) return;

    this.logger.log(
      `Scheduling refresh for ${stale.length} stale translations`
    );

    for (const { id } of stale) {
      await this.queue.add('ingest', { bibleId: id });
    }
  }
}
```

**Step 2: Verify build**

```bash
pnpm build
```

Expected: no TypeScript errors.

---

## Task 8: Create `IngestionModule`

**Files:**

- Create: `src/ingestion/ingestion.module.ts`

**Step 1: Implement the module**

```ts
// src/ingestion/ingestion.module.ts
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ApiBibleModule } from '../api-bible/api-bible.module';
import { DatabaseModule } from '../database/database.module';
import { IngestionController } from './ingestion.controller';
import { IngestionProcessor } from './ingestion.processor';
import { IngestionService } from './ingestion.service';
import { RefreshScheduler } from './refresh.scheduler';

@Module({
  imports: [
    ApiBibleModule,
    DatabaseModule,
    BullModule.registerQueue({ name: 'ingestion' }),
  ],
  controllers: [IngestionController],
  providers: [IngestionService, IngestionProcessor, RefreshScheduler],
})
export class IngestionModule {}
```

**Step 2: Verify build**

```bash
pnpm build
```

Expected: no TypeScript errors.

---

## Task 9: Wire `BullModule`, `ScheduleModule`, and `IngestionModule` into `AppModule`

**Files:**

- Modify: `src/app.module.ts`

**Step 1: Update `AppModule`**

Full file after change:

```ts
// src/app.module.ts
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { ApiBibleModule } from './api-bible/api-bible.module';
import { DatabaseModule } from './database/database.module';
import { validate } from './env-validation/env.validation';
import { IngestionModule } from './ingestion/ingestion.module';
import { GlobalExceptionFilter } from './utils/global-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const host = config.getOrThrow<string>('REDIS_HOST');
        const port = parseInt(config.getOrThrow<string>('REDIS_PORT'), 10);
        const password = config.get<string>('REDIS_PASSWORD');
        const useTls = config.get<string>('REDIS_USE_TLS') === 'true';
        return {
          connection: {
            host,
            port,
            password,
            tls: useTls ? { host, port } : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    ApiBibleModule,
    IngestionModule,
  ],
  controllers: [],
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule {}
```

**Step 2: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass.

**Step 3: Final build check**

```bash
pnpm build
```

Expected: clean build, no errors.

---

## Task 10: Create CLI entry point

**Files:**

- Create: `src/cli/cli.module.ts`
- Create: `src/cli/ingest.command.ts`
- Create: `src/cli.ts`

**Step 1: Create `CliModule`**

```ts
// src/cli/cli.module.ts
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { validate } from '../env-validation/env.validation';
import { IngestCommand } from './ingest.command';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const host = config.getOrThrow<string>('REDIS_HOST');
        const port = parseInt(config.getOrThrow<string>('REDIS_PORT'), 10);
        const password = config.get<string>('REDIS_PASSWORD');
        const useTls = config.get<string>('REDIS_USE_TLS') === 'true';
        return {
          connection: {
            host,
            port,
            password,
            tls: useTls ? { host, port } : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'ingestion' }),
  ],
  providers: [IngestCommand],
})
export class CliModule {}
```

**Step 2: Create `IngestCommand`**

```ts
// src/cli/ingest.command.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { Command, CommandRunner, Option } from 'nest-commander';

@Command({
  name: 'ingest',
  description: 'Ingest a Bible translation into the database',
})
export class IngestCommand extends CommandRunner {
  private readonly logger = new Logger(IngestCommand.name);

  constructor(
    @InjectQueue('ingestion') private readonly queue: Queue,
    private readonly config: ConfigService
  ) {
    super();
  }

  @Option({
    flags: '--bible-id <bibleId>',
    description: 'api.bible Bible ID to ingest',
  })
  parseBibleId(val: string): string {
    return val;
  }

  async run(_params: string[], options: { bibleId?: string }): Promise<void> {
    if (!options.bibleId) {
      console.error('Error: --bible-id is required');
      process.exit(1);
    }

    const job = await this.queue.add('ingest', { bibleId: options.bibleId });
    console.log(
      `Job ${job.id} enqueued for ${options.bibleId}. Waiting for completion...`
    );

    const host = this.config.getOrThrow<string>('REDIS_HOST');
    const port = parseInt(this.config.getOrThrow<string>('REDIS_PORT'), 10);
    const password = this.config.get<string>('REDIS_PASSWORD');
    const useTls = this.config.get<string>('REDIS_USE_TLS') === 'true';

    const queueEvents = new QueueEvents('ingestion', {
      connection: {
        host,
        port,
        password,
        tls: useTls ? { host, port } : undefined,
      },
    });

    try {
      await job.waitUntilFinished(queueEvents);
      console.log(`Ingestion complete for ${options.bibleId}`);
    } catch (err) {
      console.error(`Ingestion failed: ${(err as Error).message}`);
      process.exit(1);
    } finally {
      await queueEvents.close();
    }
  }
}
```

**Step 3: Create `cli.ts` entry point**

```ts
// src/cli.ts
import { CommandFactory } from 'nest-commander';

import { CliModule } from './cli/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliModule);
}

bootstrap();
```

**Step 4: Verify build**

```bash
pnpm build
```

Expected: no TypeScript errors.

**Step 5: Smoke test CLI (requires Redis running)**

```bash
pnpm start:dev &
pnpm cli ingest --bible-id <your-test-bible-id>
```

Expected: job enqueued log, then completion log after ingestion finishes.
