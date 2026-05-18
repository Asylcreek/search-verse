# SearchVerse - User Stories

**Date:** 2026-05-11
**Version:** 1.0
**Source:** [Design Specification](./2026-05-11-design.md) | [Technical Decisions](./2026-05-11-technical-decisions.md)

---

## Purpose

Bite-sized, PR-ready user stories for implementing SearchVerse. Each story is sized to be implementable and reviewable in a single pull request.

## Sizing Rules

| Size   | Duration  | Acceptance Criteria    | Decomposition        |
| ------ | --------- | ---------------------- | -------------------- |
| **XS** | ~0.25 day | 1–2 focused checks     | Single slice         |
| **S**  | ~0.5 day  | up to 4 focused checks | Single slice or a+b  |
| **M**  | ~1.0 day  | up to 6 focused checks | MUST be a/b/c slices |

**Key Principle:** One story = One PR = Maximum 1 day

---

## Infrastructure Stories

These must be in place before any feature work begins.

| Story | Priority | Dependencies | Description                                                                                            |
| ----- | -------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| INF-1 | P0       | None         | NestJS project with Docker Compose, env config, and Railway deploy config                              |
| INF-2 | P0       | INF-1        | Drizzle schema with migrations: `translations`, `books`, `verses` tables, `tsvector` column, GIN index |
| INF-3 | P0       | INF-1        | api.bible HTTP client module — authenticated, typed, with error handling                               |
| INF-4 | P0       | INF-2, INF-3 | Data ingestion CLI command — walks api.bible hierarchy for a given `bibleId` and seeds the database    |

---

## Epic 1: Translation Management

### US-1.1: Retrieve a translation's verse catalogue from api.bible

**As a** system operator  
**I want to** run a command that fetches all verses for a given translation from api.bible and stores them locally  
**So that** the translation is available for search without any runtime dependency on api.bible

**Size:** M

**Parent Acceptance Criteria:**

- Given a valid `bibleId`, all 66 books, their chapters, and all verse texts are fetched and upserted into PostgreSQL
- `translations.last_synced_at` is updated on completion
- Command is idempotent — re-running it for the same translation updates existing rows, does not duplicate
- If api.bible returns an error mid-ingestion, the command exits with a non-zero code and logs the failure point
- Verse text is stored with `tsvector` populated for full-text search

**Dependencies:** INF-4

---

#### US-1.1a: Walk and store books and chapters

**As a** system operator  
**I want to** have all books and chapters for a translation stored in the database  
**So that** the structural skeleton exists before verse text is written

**Acceptance Criteria:**

- `GET /bibles/{bibleId}/books` response is upserted into `books` table
- All chapters for each book are iterated in canonical order
- No verse text fetched in this step
- Books table correctly records testament (`OT` / `NT`) and canonical position

**Dependencies:** INF-4

---

#### US-1.1b: Fetch and store verse text per chapter

**As a** system operator  
**I want to** have all verse text for each chapter stored in the database  
**So that** the translation is ready for full-text search

**Acceptance Criteria:**

- `GET /bibles/{bibleId}/chapters/{chapterId}/verses` fetched for every chapter
- Each verse upserted into `verses` table with correct `translation_id`, `book_id`, `chapter`, `verse`, and `text`
- `text_search` (`tsvector`) column populated via trigger or explicit update after insert
- Ingestion log shows progress (book/chapter level)

**Dependencies:** US-1.1a

---

#### US-1.1c: Idempotency and completion tracking

**As a** system operator  
**I want to** re-run the ingestion command safely  
**So that** partial runs or content updates do not corrupt the database

**Acceptance Criteria:**

- Running ingestion twice for the same `bibleId` produces no duplicate rows
- Updated verse text from api.bible overwrites the old text on re-run
- `translations.last_synced_at` updated only on full successful completion
- Partial failures leave the database in a consistent partial state — not corrupted

**Dependencies:** US-1.1b

---

### US-1.2: List available translations

**As a** developer consuming the API  
**I want to** retrieve the list of translations available in the system  
**So that** I can present users with translation options

**Size:** XS

**Acceptance Criteria:**

- `GET /translations` returns all rows from the `translations` table
- Response includes `id`, `abbreviation`, `name`, `language`, `last_synced_at`
- Returns empty array (not 404) if no translations have been ingested yet

**Dependencies:** INF-2

---

### US-1.3: Get a single translation's metadata

**As a** developer consuming the API  
**I want to** fetch metadata for a specific translation  
**So that** I can display its details or validate it before querying

**Size:** XS

**Acceptance Criteria:**

- `GET /translations/:id` returns a single translation by its `id`
- Returns 404 with a meaningful error message if the `id` does not exist
- Response includes `copyright` field

**Dependencies:** US-1.2

---

### US-1.4: Scheduled 30-day content refresh

**As a** system operator  
**I want to** have all ingested translations automatically refreshed every 30 days  
**So that** the database stays current with api.bible content as required by their ToS

**Size:** S

**Acceptance Criteria:**

- A `@nestjs/schedule` cron job runs every 30 days
- The job re-runs ingestion for every translation where `last_synced_at` is older than 30 days
- If api.bible has removed or modified a verse, the local record is updated within the next refresh cycle
- Refresh failures are logged but do not crash the application process

**Dependencies:** US-1.1, INF-1

---

## Epic 2: Verse Search

### US-2.1: Search verses by keyword across selected translations

**As a** user  
**I want to** search for a verse using a word or phrase  
**So that** I can find the verse I half-remember across all my active translations

**Size:** M

**Parent Acceptance Criteria:**

- `GET /search?q=love+is+patient&abbreviations=engKJV,NLT` returns matching verses from both translations
- `abbreviations` accepts translation abbreviations as returned by `GET /translations` (for example `engKJV`, `NLT`, `AMP`), not API.Bible translation IDs
- Results are ordered by relevance rank (PostgreSQL `ts_rank`)
- Exact text matches are boosted ahead of non-exact matches before applying `ts_rank`
- Response uses the global success wrapper, with the standard list envelope inside `data`: `totalDocuments`, `totalPages`, `currentPage`, `numOfResults`, and `data`
- Each item in the envelope's `data` array contains `reference`, `translation`, `book`, `chapter`, `verse`, `text`, and `copyright`
- Results are one entry per verse-per-translation match (not grouped)
- Each result's `translation` field contains the translation abbreviation
- `abbreviations` is required; omitting it returns a 400 with a clear validation error
- Returns an empty envelope `data` array (not 404) when no matches are found

**Dependencies:** US-1.1

---

#### US-2.1a: Single-translation keyword search

**As a** user  
**I want to** search for a keyword and see matching verses from one translation  
**So that** I can verify the core search mechanism works correctly

**Acceptance Criteria:**

- `GET /search?q=patience&abbreviations=engKJV` returns verses from KJV where the word appears
- Results include `text`, `reference`, and `copyright`
- `ts_rank` used for ordering — most relevant verses first
- Query is case-insensitive

**Dependencies:** US-1.1

---

#### US-2.1b: Multi-translation keyword search

**As a** user  
**I want to** search across multiple translations simultaneously  
**So that** I can see how different translations render the same concept

**Acceptance Criteria:**

- `GET /search?q=patience&abbreviations=engKJV,NLT,AMP` returns results from all three
- Results interleaved — not grouped by translation
- Each result identifies its translation via the `translation` field
- Invalid translation abbreviations in the list are ignored (not a 400 error)
- If all requested translation abbreviations are invalid, the endpoint returns a wrapped standard empty list envelope with HTTP 200

**Dependencies:** US-2.1a

---

#### US-2.1c: Search with no results

**As a** user  
**I want to** receive a clear empty response when nothing matches  
**So that** I know the search ran but found nothing

**Acceptance Criteria:**

- Query with no matches returns `{ "status": "success", "data": { "totalDocuments": 0, "totalPages": 1, "currentPage": 1, "numOfResults": 0, "data": [] } }`
- HTTP status is 200, not 404
- Response uses the global success wrapper and standard list envelope, consistent with non-empty responses

**Dependencies:** US-2.1b

---

### US-2.2: Paginate search results

**As a** developer consuming the API  
**I want to** paginate through large search result sets  
**So that** I can load results incrementally rather than all at once

**Size:** S

**Acceptance Criteria:**

- `GET /search?q=love&limit=10&offset=0` returns the first 10 results
- `GET /search?q=love&limit=10&offset=10` returns the next 10 results
- Response includes `total` count of all matches (regardless of page)
- `limit` defaults to 20; maximum allowed value is 100
- `offset` beyond `total` returns an empty `results` array

**Dependencies:** US-2.1

---

### US-2.3: Search within a specific book or testament

**As a** user  
**I want to** narrow my search to the New Testament or a specific book  
**So that** I can find a verse I know is in a particular section

**Size:** S

**Acceptance Criteria:**

- `GET /search?q=love&range=NT` limits results to New Testament books
- `GET /search?q=love&range=JHN` limits results to the book of John
- `range` parameter accepts testament (`OT`, `NT`) or book ID (`GEN`, `JHN`, etc.)
- Invalid range values return a 400 with a clear error message

**Dependencies:** US-2.1

---

## Epic 3: Verse Comparison

### US-3.1: Fetch a specific verse across multiple translations

**As a** user  
**I want to** look up a known verse reference and see it in every translation I care about  
**So that** I can compare how different translations render the same passage

**Size:** S

**Acceptance Criteria:**

- `GET /verses/JHN.3.16?translations=KJV,NLT,AMP` returns the verse from matching ingested translations
- `translations` is required and accepts comma-separated translation abbreviations
- Response includes `reference`, `book`, `chapter`, `verse`, and a `translations` array
- Each translation entry includes `id`, `abbreviation`, `text`, and `copyright`
- If a translation abbreviation is requested but that verse has not been ingested, it is omitted from the `translations` array
- Unknown translation abbreviations are ignored and are not errors
- If the reference exists in any ingested translation but none of the requested abbreviations match, returns `200` with `translations: []`
- Returns 404 with a meaningful error if the reference does not exist in any ingested translation

**Dependencies:** US-1.1

---

### US-3.2: Handle verse lookup request errors

**As a** developer consuming the API  
**I want to** receive clear errors for invalid verse lookup requests  
**So that** I can surface a useful message to the user

**Size:** XS

**Acceptance Criteria:**

- `translations` is required for `GET /verses/:reference`
- Missing or empty `translations` returns 400 with a clear validation message
- Reference values are passed to the database as provided; no verse-reference format parser is added
- `GET /verses/INVALID?translations=KJV` returns 404 when `INVALID` has no ingested rows
- Error responses use the existing global shape: `{ "status": "fail", "message": "..." }`

**Dependencies:** US-3.1

---

## Epic 4: Content Compliance

### US-4.1: Copyright attribution on every verse response

**As a** legal obligation and product requirement  
**I want to** have copyright text included on every verse result in every endpoint  
**So that** the API never serves Bible content without proper attribution

**Size:** XS

**Acceptance Criteria:**

- Every entry in `/search` results includes a `copyright` field with the full attribution string
- Every entry in `/verses/:reference` translations array includes a `copyright` field
- KJV returns `"King James Version. Public Domain."`
- Copyrighted translations return their full publisher attribution string as stored in `translations.copyright`
- There is no way to retrieve verse text from the API without also receiving the copyright

**Dependencies:** US-2.1, US-3.1

---

### US-4.2: Remove a translation from the system

**As a** system operator  
**I want to** fully remove a translation and all its verse content from the database  
**So that** I can comply with api.bible's requirement to remove content within 72 hours of subscription termination or publisher request

**Size:** S

**Acceptance Criteria:**

- Running `remove-translation --id <bibleId>` deletes all rows in `verses` where `translation_id = bibleId`
- The `translations` row itself is also deleted
- The command confirms before deleting and reports how many verse rows were removed
- After removal, `GET /translations` no longer lists the translation
- After removal, searches with that translation ID return no results for it (gracefully excluded)

**Dependencies:** US-1.1, US-2.1
