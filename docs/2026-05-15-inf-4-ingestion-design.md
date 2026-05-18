# INF-4: Data Ingestion — Design

**Date:** 2026-05-15
**Story:** INF-4 — Data ingestion CLI command, walks api.bible hierarchy for a given `bibleId` and seeds the database.
**Dependencies:** INF-2 (schema), INF-3 (api.bible client)

---

## Design Decisions

| Decision              | Choice                                                                         | Rationale                                                                              |
| --------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| CLI framework         | `nest-commander`                                                               | First-class NestJS citizen, DI available without manual wiring                         |
| Async job queue       | BullMQ + Redis                                                                 | Ingestion takes minutes — not suitable for blocking HTTP or cron threads               |
| API fetch granularity | Chapter-level (`GET /bibles/{bibleId}/chapters/{chapterId}?content-type=json`) | One request per chapter (~1,189 total) vs one per verse (~31,000)                      |
| Concurrency           | `p-limit@4` (limit: 5)                                                         | Controlled parallelism against third-party API rate limits                             |
| Error handling        | Fail fast, exit non-zero                                                       | Transient errors propagate; DB stays in consistent partial state; re-run is idempotent |
| `tsvector` population | Explicit in upsert via `sql\`to_tsvector('english', ...)\``                    | Keeps schema in Drizzle; no hidden trigger side effects                                |
| Testament detection   | Position-based: books 1–39 = OT, 40–66 = NT                                    | api.bible does not expose testament directly                                           |
| CLI behaviour         | Enqueues job, blocks via `QueueEvents.waitUntilFinished()`                     | Consistent path with API endpoint; operator sees completion/failure in terminal        |

---

## Architecture

```
POST /translations/ingest  ─┐
@Cron (daily, skip if <30d)─┼──► BullMQ Queue: "ingestion" (Redis)
pnpm cli ingest --bible-id ─┘              │
                                           ▼
                                  IngestionProcessor
                                  (WorkerHost, @Processor)
                                           │
                                           ▼
                                  IngestionService.ingest(bibleId)
                                           │
                          ┌────────────────┴────────────────┐
                          ▼                                  ▼
                   ApiBibleService                    Drizzle (PostgreSQL)
               (chapter-level fetching)            (upsert translations,
                                                    books, verses)
```

---

## Data Flow (inside `IngestionService.ingest`)

```
1. getBibles()                          → find & upsert translations row
2. getBooks(bibleId)                    → upsert all books rows (with testament + position)
3. for each book: getChapters(bibleId)  → collect all chapter IDs (skip "intro")
4. p-limit(5): getChapterVerses(bibleId, chapterId)
     → GET /bibles/{id}/chapters/{chapterId}?content-type=json
     → parseVerseNodes() — walk content tree, extract verse text
     → bulk upsert verses with to_tsvector('english', text)
5. UPDATE translations SET last_synced_at = now()
```

---

## New Files

| File                                    | Role                                                         |
| --------------------------------------- | ------------------------------------------------------------ |
| `src/ingestion/ingestion.module.ts`     | Module: imports ApiBibleModule, DatabaseModule, BullMQ queue |
| `src/ingestion/ingestion.service.ts`    | Core ingestion orchestration (no BullMQ knowledge)           |
| `src/ingestion/ingestion.processor.ts`  | BullMQ `@Processor('ingestion')` — thin job runner           |
| `src/ingestion/ingestion.controller.ts` | `POST /translations/ingest` → 202 + jobId                    |
| `src/ingestion/dto/ingest.dto.ts`       | Request DTO                                                  |
| `src/ingestion/refresh.scheduler.ts`    | `@Cron` daily — re-enqueues translations stale > 30 days     |
| `src/cli/cli.module.ts`                 | Standalone NestJS module for CLI context                     |
| `src/cli/ingest.command.ts`             | `@Command('ingest')` — enqueues + waits                      |
| `src/cli.ts`                            | `CommandFactory.run(CliModule)` entry point                  |

## Modified Files

| File                                      | Change                                                                |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `src/api-bible/api-bible.types.ts`        | Add chapter content types + `ApiBibleVerseText`                       |
| `src/api-bible/api-bible.service.ts`      | Add `getChapterVerses()` + private parse methods                      |
| `src/api-bible/api-bible.service.spec.ts` | Add `getChapterVerses` tests                                          |
| `src/env-validation/env.dto.ts`           | Add `REDIS_URL`                                                       |
| `src/app.module.ts`                       | Import `BullModule.forRootAsync`, `ScheduleModule`, `IngestionModule` |
| `package.json`                            | Add deps, update `start:dev` script, add `cli` script                 |

---

## New Dependencies

| Package            | Type | Purpose                                                                |
| ------------------ | ---- | ---------------------------------------------------------------------- |
| `@nestjs/bullmq`   | prod | BullMQ NestJS integration                                              |
| `bullmq`           | prod | Queue, Worker, QueueEvents                                             |
| `@nestjs/schedule` | prod | `@Cron` decorator for refresh scheduler                                |
| `nest-commander`   | prod | CLI command framework                                                  |
| `p-limit`          | prod | Concurrency limiter (ESM-only; consumed via `await import('p-limit')`) |
| `concurrently`     | dev  | Run redis-server + nest together in dev                                |
