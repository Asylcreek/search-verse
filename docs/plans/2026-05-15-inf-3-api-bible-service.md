# INF-3: api.bible HTTP Client Module Implementation Plan

> REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Build an authenticated, typed NestJS service module that wraps the 5 api.bible endpoints needed for ingestion (INF-4).

**Architecture:** `ApiBibleModule` registers `HttpModule` with the api-key default header sourced from `ConfigService`. `ApiBibleService` exposes 5 typed async methods, throws `ApiBibleError` on non-2xx, and logs via NestJS `Logger`.

**Tech Stack:** `@nestjs/axios`, `@nestjs/config`, `rxjs/firstValueFrom`, NestJS `Logger`, `jest` with `HttpService` mock

**Feature Branch:** `inf-3-api-bible-service`

---

## Task 1: Install `@nestjs/axios`

**Files:**

- Modify: `package.json` (via install command)

**Step 1: Install the package**

```bash
pnpm add @nestjs/axios axios
```

**Step 2: Verify install**

```bash
pnpm list @nestjs/axios axios
```

Expected: both packages listed under dependencies.

---

## Task 2: Add `API_BIBLE_KEY` to env validation

**Files:**

- Modify: `src/env-validation/env.dto.ts`

**Step 1: Write a failing test**

Add to a new temp test or verify startup fails without the key set — skip this step if you trust class-validator coverage. Instead, proceed directly to the implementation.

**Step 2: Add the field to `EnvDTO`**

```ts
// src/env-validation/env.dto.ts
@IsString()
@IsNotEmpty()
API_BIBLE_KEY: string;
```

Full file after change:

```ts
import { IsEnum, IsNotEmpty, IsNumberString, IsString } from 'class-validator';

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
}
```

**Step 3: Add `API_BIBLE_KEY` to `.env` (dev value)**

```bash
echo "API_BIBLE_KEY=your-dev-key-here" >> .env
```

**Step 4: Verify build still compiles**

```bash
pnpm build
```

Expected: no TypeScript errors.

---

## Task 3: Create error and type definitions

**Files:**

- Create: `src/api-bible/api-bible.errors.ts`
- Create: `src/api-bible/api-bible.types.ts`

**Step 1: Create the error class**

```ts
// src/api-bible/api-bible.errors.ts
export class ApiBibleError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiBibleError';
  }
}
```

**Step 2: Create the response types**

```ts
// src/api-bible/api-bible.types.ts
export interface ApiBibleBible {
  id: string;
  abbreviation: string;
  abbreviationLocal: string;
  name: string;
  nameLocal: string;
  copyright: string;
  language: {
    id: string;
    name: string;
    nameLocal: string;
    script: string;
    scriptCode: string;
  };
}

export interface ApiBibleBook {
  id: string;
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

export interface ApiBibleChapterSummary {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
}

export interface ApiBibleVerseSummary {
  id: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
}

export interface ApiBibleVerse {
  id: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
  content: string;
}
```

**Step 3: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: no errors.

---

## Task 4: Implement `ApiBibleService` (TDD)

**Files:**

- Create: `src/api-bible/api-bible.service.spec.ts`
- Create: `src/api-bible/api-bible.service.ts`

**Step 1: Write the spec file**

```ts
// src/api-bible/api-bible.service.spec.ts
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { ApiBibleError } from './api-bible.errors';
import { ApiBibleService } from './api-bible.service';
import {
  ApiBibleBible,
  ApiBibleBook,
  ApiBibleChapterSummary,
  ApiBibleVerse,
  ApiBibleVerseSummary,
} from './api-bible.types';

const mockAxiosResponse = <T>(data: T): AxiosResponse<{ data: T }> =>
  ({ data: { data } }) as AxiosResponse<{ data: T }>;

const mockAxiosError = (status: number): AxiosError =>
  new AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    data: { message: 'error' },
    statusText: 'Error',
    headers: {},
    config: {} as any,
  });

describe('ApiBibleService', () => {
  let service: ApiBibleService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiBibleService,
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ApiBibleService);
    httpService = module.get(HttpService);

    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getBibles', () => {
    it('returns typed array from response envelope', async () => {
      const data: ApiBibleBible[] = [
        { id: 'de4e12af7f28f599-02' } as ApiBibleBible,
      ];
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getBibles();
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(401)));
      await expect(service.getBibles()).rejects.toThrow(ApiBibleError);
    });

    it('logs warn on error', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(401)));
      await service.getBibles().catch(() => undefined);
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('getBooks', () => {
    it('returns typed array', async () => {
      const data: ApiBibleBook[] = [{ id: 'GEN' } as ApiBibleBook];
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getBooks('bibleId');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getBooks('bibleId')).rejects.toThrow(ApiBibleError);
    });
  });

  describe('getChapters', () => {
    it('returns typed array', async () => {
      const data: ApiBibleChapterSummary[] = [
        { id: 'GEN.1' } as ApiBibleChapterSummary,
      ];
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getChapters('bibleId', 'GEN');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getChapters('bibleId', 'GEN')).rejects.toThrow(
        ApiBibleError
      );
    });
  });

  describe('getVerses', () => {
    it('returns typed array', async () => {
      const data: ApiBibleVerseSummary[] = [
        { id: 'GEN.1.1' } as ApiBibleVerseSummary,
      ];
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getVerses('bibleId', 'GEN.1');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getVerses('bibleId', 'GEN.1')).rejects.toThrow(
        ApiBibleError
      );
    });
  });

  describe('getVerse', () => {
    it('returns typed verse with content', async () => {
      const data: ApiBibleVerse = {
        id: 'GEN.1.1',
        content: 'In the beginning...',
      } as ApiBibleVerse;
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockAxiosResponse(data)));
      const result = await service.getVerse('bibleId', 'GEN.1.1');
      expect(result).toEqual(data);
    });

    it('throws ApiBibleError on non-2xx', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockAxiosError(404)));
      await expect(service.getVerse('bibleId', 'GEN.1.1')).rejects.toThrow(
        ApiBibleError
      );
    });
  });
});
```

**Step 2: Run tests — verify they all fail**

```bash
pnpm test api-bible.service
```

Expected: FAIL — `ApiBibleService` does not exist yet.

**Step 3: Implement `ApiBibleService`**

```ts
// src/api-bible/api-bible.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import { ApiBibleError } from './api-bible.errors';
import {
  ApiBibleBible,
  ApiBibleBook,
  ApiBibleChapterSummary,
  ApiBibleVerse,
  ApiBibleVerseSummary,
} from './api-bible.types';

@Injectable()
export class ApiBibleService {
  private readonly logger = new Logger(ApiBibleService.name);
  private readonly baseUrl = 'https://rest.api.bible/v1';

  constructor(private readonly http: HttpService) {}

  async getBibles(): Promise<ApiBibleBible[]> {
    return this.get<ApiBibleBible[]>('/bibles');
  }

  async getBooks(bibleId: string): Promise<ApiBibleBook[]> {
    return this.get<ApiBibleBook[]>(`/bibles/${bibleId}/books`);
  }

  async getChapters(
    bibleId: string,
    bookId: string
  ): Promise<ApiBibleChapterSummary[]> {
    return this.get<ApiBibleChapterSummary[]>(
      `/bibles/${bibleId}/books/${bookId}/chapters`
    );
  }

  async getVerses(
    bibleId: string,
    chapterId: string
  ): Promise<ApiBibleVerseSummary[]> {
    return this.get<ApiBibleVerseSummary[]>(
      `/bibles/${bibleId}/chapters/${chapterId}/verses`
    );
  }

  async getVerse(bibleId: string, verseId: string): Promise<ApiBibleVerse> {
    return this.get<ApiBibleVerse>(`/bibles/${bibleId}/verses/${verseId}`, {
      'content-type': 'text',
    });
  }

  private async get<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    this.logger.debug(`GET ${endpoint}`);
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: T }>(url, { params })
      );
      return response.data.data;
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const status = axiosErr.response?.status ?? 0;
      const message = axiosErr.response?.data?.message ?? axiosErr.message;
      this.logger.warn(`GET ${endpoint} failed [${status}]: ${message}`);
      throw new ApiBibleError(status, endpoint, message);
    }
  }
}
```

**Step 4: Run tests — verify they all pass**

```bash
pnpm test api-bible.service
```

Expected: all tests PASS.

---

## Task 5: Create `ApiBibleModule`

**Files:**

- Create: `src/api-bible/api-bible.module.ts`

**Step 1: Create the module**

```ts
// src/api-bible/api-bible.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ApiBibleService } from './api-bible.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        headers: {
          'api-key': config.get<string>('API_BIBLE_KEY'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ApiBibleService],
  exports: [ApiBibleService],
})
export class ApiBibleModule {}
```

**Step 2: Verify build**

```bash
pnpm build
```

Expected: no TypeScript errors.

---

## Task 6: Register `ApiBibleModule` in `AppModule`

**Files:**

- Modify: `src/app.module.ts`

**Step 1: Add the import**

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApiBibleModule } from './api-bible/api-bible.module';
import { DatabaseModule } from './database/database.module';
import { validate } from './env-validation/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    DatabaseModule,
    ApiBibleModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**Step 2: Run full test suite**

```bash
pnpm test
```

Expected: all existing tests pass, new service tests pass.

**Step 3: Final build check**

```bash
pnpm build
```

Expected: clean build, no errors.
