# SearchVerse - Technical Decisions

**Date:** 2026-05-11
**Related:** [Design Specification](./2026-05-11-design.md) | [Data Source Alternatives](./2026-05-11-data-source-alternatives.md)

This document captures the reasoning behind key technical decisions. Future implementers should understand not just *what* was chosen, but *why*.

---

## Architecture

### Decision: API-first, Web UI as a consumer

**Chosen:** NestJS REST API built independently of the frontend; SvelteKit UI consumes the same API any third party would use  
**Rejected:** Server-rendered full-stack app (Next.js, SvelteKit with server routes as the primary product)

**Reasoning:**
- The primary value is the search capability, not the UI
- An API-first design means third parties (other churches, developers) can build their own UIs on top of it
- Avoids coupling frontend rendering concerns to the search and data ingestion logic
- Easier to test, version, and evolve independently

**Trade-off accepted:** Two separate codebases to maintain. Accepted because the API surface is the product.

---

### Decision: Self-hosted verse index over runtime API fan-out

**Chosen:** Ingest Bible text from api.bible into a local PostgreSQL database; run search against the local index  
**Rejected:** Fan out search requests to api.bible at query time for each selected translation

**Reasoning:**
- api.bible's search endpoint is per-translation — no cross-translation search in a single call
- A 7-translation search would require 7 sequential or parallel HTTP calls to api.bible at every query
- Local index enables consistent ranking, single-query cross-translation search, and zero external latency at search time
- api.bible Section 11 (Content Recency Requirements) implicitly permits offline storage for licensed users, requiring only a 30-day refresh cycle
- Removes api.bible rate limits from the critical path of user-facing queries

**Trade-off accepted:** Requires a data ingestion pipeline and a 30-day content refresh obligation. Accepted — this is manageable and required by the ToS regardless.

---

## Search

### Decision: PostgreSQL full-text search over a dedicated search engine

**Chosen:** PostgreSQL `tsvector` with GIN index  
**Rejected:** Elasticsearch, Meilisearch, Typesense, Algolia

**Reasoning:**
- PostgreSQL is already required for the data model — adding a separate search engine adds ops complexity for the scale we're targeting
- `tsvector` with GIN index is fast enough for ~7 translations × ~31,000 verses = ~217,000 rows
- Supports fuzzy matching and ranked results via `ts_rank`
- `pgvector` can be added to the same database later for semantic/AI search without a migration
- No separate service to deploy, monitor, or keep in sync

**Trade-off accepted:** PostgreSQL FTS is less feature-rich than dedicated search engines (no semantic search, simpler ranking). Accepted for MVP — semantic search is explicitly a future upgrade.

---

### Decision: Flat verses table, no joins at search time

**Chosen:** Single `verses` table with `translation_id` column; search filters by `translation_id = ANY($translations)`  
**Rejected:** Normalized per-translation tables, joining a core verses table with translation-specific text tables

**Reasoning:**
- Cross-translation search needs to scan multiple translations simultaneously — a flat table avoids joins on the hot path
- `tsvector` index is per-row, so ranking works naturally across translations in a single query
- Simpler query, simpler schema, simpler ingestion

**Trade-off accepted:** Some data duplication (book/chapter/verse metadata repeated per translation row). Accepted — the duplication is minor relative to the query simplicity gained.

---

## Data Ingestion

### Decision: NestJS CLI command over a standalone script

**Chosen:** `nest-commander` CLI command inside the NestJS app  
**Rejected:** Standalone Node.js script, separate Python ingestion service

**Reasoning:**
- Shares the same Drizzle schema, database connection, and configuration as the API — no duplication
- Can be run in CI, Docker, or Railway deploy hooks
- `@nestjs/schedule` handles the 30-day refresh cron in the same process as the API
- Keeps the codebase in one place

**Trade-off accepted:** The app binary is slightly larger than a purpose-built script. Irrelevant at this scale.

---

## ORM

### Decision: Drizzle over Prisma

**Chosen:** Drizzle ORM  
**Rejected:** Prisma, TypeORM, raw SQL

**Reasoning:**
- Drizzle is closer to SQL — queries are explicit and predictable, no magic query generation
- Lighter runtime footprint than Prisma (no query engine process)
- Better TypeScript inference for complex queries
- Prisma's abstraction layer becomes friction when writing specific PostgreSQL features like `tsvector`, GIN indexes, and `ts_rank`
- Raw SQL was considered but Drizzle gives type safety without sacrificing control

**Trade-off accepted:** Drizzle has a smaller ecosystem than Prisma. Accepted — for this use case, SQL proximity matters more than ecosystem breadth.

---

## Scheduling

### Decision: @nestjs/schedule over external cron

**Chosen:** `@nestjs/schedule` decorator-based cron inside the NestJS app  
**Rejected:** System cron (`crontab`), Railway cron jobs, a separate worker service

**Reasoning:**
- The 30-day refresh job needs access to the same database connection and ingestion logic already in the NestJS app
- `@nestjs/schedule` keeps scheduling in-process with zero additional infrastructure
- Railway's cron feature would require a separate deploy or service
- System cron would require the ingestion script to manage its own DB connection separately

**Trade-off accepted:** If the app process is down during the scheduled refresh window, the refresh is missed. Acceptable for the current scale — a church and household audience doesn't require high-availability scheduling.

---

## Infrastructure

### Decision: Railway over Render, Fly.io, or self-hosted VPS

**Chosen:** Railway  
**Rejected:** Render, Fly.io, bare VPS (DigitalOcean/Hetzner)

**Reasoning:**
- Railway offers a native PostgreSQL addon — database and app deploy together, no separate managed DB setup
- Zero-config deployment from a `Dockerfile` or detected Node.js project
- Suitable for the current scale (church + household) without over-engineering
- Render is comparable but Railway's DX is faster to get started
- Fly.io is powerful but adds complexity (Machines API, regions, volume management) not needed here
- VPS requires ops work that isn't the focus of this project

**Trade-off accepted:** Railway is a managed platform with less control than a VPS. Accepted — reducing ops overhead is the right call at this stage.

---

## Frontend

### Decision: SvelteKit built later, as a consumer of the API

**Chosen:** Build the API first; add SvelteKit frontend in a later phase  
**Rejected:** Building frontend and backend concurrently

**Reasoning:**
- The core product value is the search API — validating it before investing in a UI reduces risk
- API-first allows the API contract to stabilize before the frontend depends on it
- SvelteKit is the right choice when the frontend is built: lightweight, fast, pairs well with a REST API, and the team is comfortable with it

**Trade-off accepted:** No UI in the initial phase. Accepted — the API is usable directly and can be tested via tools like curl or Postman.
