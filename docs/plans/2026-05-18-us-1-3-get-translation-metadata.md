# US-1.3 Get Single Translation Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /translations/:id` to return full metadata for one locally ingested translation.

**Architecture:** Extend the existing translation controller and service. Add a local `AppError` class, update the global exception filter to normalize all error bodies with `status: "fail"`, return full translation schema fields from both translation metadata endpoints, and use `AppError` for missing translation ids.

**Tech Stack:** NestJS, Drizzle ORM, Jest, TypeScript

**Feature Branch:** `us-1-3-get-translation-metadata`

---

## File Structure

- Create: `src/utils/app-error.ts`
  - Defines the app-level operational error class.
- Create: `src/utils/global-exception.filter.spec.ts`
  - Covers normalized error response behavior.
- Modify: `src/utils/global-exception.filter.ts`
  - Handles `AppError` and normalizes all error response bodies.
- Modify: `src/translation/dto/translation-response.dto.ts`
  - Adds all schema fields returned by translation metadata endpoints.
- Modify: `src/translation/translation.service.ts`
  - Expands `findAll()` and adds `findOne(id)`.
- Modify: `src/translation/translation.service.spec.ts`
  - Adds full-row and not-found tests.
- Modify: `src/translation/translation.controller.ts`
  - Adds `GET /translations/:id`.
- Modify: `src/translation/translation.controller.spec.ts`
  - Adds controller delegation test for `findOne(id)`.

## Task 1: Add AppError

**Files:**

- Create: `src/utils/app-error.ts`

- [ ] **Step 1: Create the app error class**

```ts
export class AppError extends Error {
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errors?: unknown
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}
```

- [ ] **Step 2: Run targeted build**

Run:

```bash
pnpm build
```

Expected: PASS.

## Task 2: Normalize Global Error Responses

**Files:**

- Create: `src/utils/global-exception.filter.spec.ts`
- Modify: `src/utils/global-exception.filter.ts`

- [ ] **Step 1: Write failing filter tests**

Cover these cases:

- `AppError` returns its HTTP status and body `{ status: 'fail', message }`.
- `AppError` includes `errors` when present.
- validation-style `BadRequestException` returns HTTP `400` and the first validation message.
- non-validation `HttpException` returns its status and normalized message.
- `ApiBibleError` returns HTTP `502` and body `{ status: 'fail', message: 'Upstream service error' }`.
- unknown errors return HTTP `500` and body `{ status: 'fail', message: 'Something went very wrong!' }` outside development.

- [ ] **Step 2: Run the failing filter tests**

Run:

```bash
pnpm jest --watchman=false --runInBand global-exception.filter.spec.ts
```

Expected: FAIL because `AppError` is not handled and existing error bodies are not normalized.

- [ ] **Step 3: Update the filter**

Implement handling in this order:

```ts
if (err instanceof AppError) {
  const body: { status: string; message: string; errors?: unknown } = {
    status: 'fail',
    message: err.message,
  };

  if (err.errors !== undefined) {
    body.errors = err.errors;
  }

  return res.status(err.statusCode).json(body);
}
```

Keep `HttpException`, `ApiBibleError`, and unknown-error handling, but normalize every response body to `status: 'fail'`.

- [ ] **Step 4: Run the filter tests**

Run:

```bash
pnpm jest --watchman=false --runInBand global-exception.filter.spec.ts
```

Expected: PASS.

## Task 3: Expand Translation DTO

**Files:**

- Modify: `src/translation/dto/translation-response.dto.ts`

- [ ] **Step 1: Add full schema fields**

```ts
export class TranslationResponseDto {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  copyright: string;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

- [ ] **Step 2: Run translation tests**

Run:

```bash
pnpm jest --watchman=false --runInBand translation.service.spec.ts translation.controller.spec.ts
```

Expected: existing tests may fail until service and controller are updated.

## Task 4: Expand TranslationService Queries

**Files:**

- Modify: `src/translation/translation.service.spec.ts`
- Modify: `src/translation/translation.service.ts`

- [ ] **Step 1: Write failing service tests**

Add tests for:

- `findAll()` selecting all schema fields with snake-case timestamp aliases.
- `findOne(id)` selecting all schema fields with snake-case timestamp aliases.
- `findOne(id)` returning the first matched row.
- `findOne(id)` throwing `AppError` with `statusCode` `404` when no row exists.
- `findOne(id)` using exactly this message:

```txt
We cannot seem to find that translation. Please check the id and try again
```

- [ ] **Step 2: Run the failing service tests**

Run:

```bash
pnpm jest --watchman=false --runInBand translation.service.spec.ts
```

Expected: FAIL because `findOne` does not exist.

- [ ] **Step 3: Implement findOne**

Use `eq` from `drizzle-orm` and select these fields:

```ts
{
  id: translations.id,
  abbreviation: translations.abbreviation,
  name: translations.name,
  language: translations.language,
  copyright: translations.copyright,
  last_synced_at: translations.lastSyncedAt,
  created_at: translations.createdAt,
  updated_at: translations.updatedAt,
}
```

If no row exists, throw:

```ts
new AppError(
  'We cannot seem to find that translation. Please check the id and try again',
  HttpStatus.NOT_FOUND
);
```

- [ ] **Step 4: Run the service tests**

Run:

```bash
pnpm jest --watchman=false --runInBand translation.service.spec.ts
```

Expected: PASS.

## Task 5: Add TranslationController.findOne

**Files:**

- Modify: `src/translation/translation.controller.spec.ts`
- Modify: `src/translation/translation.controller.ts`

- [ ] **Step 1: Write failing controller test**

Add a test that:

- calls `controller.findOne('de4e12af7f28f599-02')`
- expects the service result to be returned unchanged
- expects `TranslationService.findOne` to be called with the id

- [ ] **Step 2: Run the failing controller test**

Run:

```bash
pnpm jest --watchman=false --runInBand translation.controller.spec.ts
```

Expected: FAIL because `findOne` does not exist.

- [ ] **Step 3: Implement the controller route**

Add:

```ts
@Get(':id')
findOne(@Param('id') id: string): Promise<TranslationResponseDto> {
  return this.translationService.findOne(id);
}
```

- [ ] **Step 4: Run the controller tests**

Run:

```bash
pnpm jest --watchman=false --runInBand translation.controller.spec.ts
```

Expected: PASS.

## Task 6: Verify Full Change

**Files:**

- All files changed above.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
pnpm jest --watchman=false --runInBand translation.service.spec.ts translation.controller.spec.ts global-exception.filter.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
pnpm test -- --watchman=false --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Review changed files**

Run:

```bash
git diff -- docs/specs/2026-05-18-us-1-3-get-translation-metadata-design.md docs/plans/2026-05-18-us-1-3-get-translation-metadata.md src/utils/app-error.ts src/utils/global-exception.filter.ts src/utils/global-exception.filter.spec.ts src/translation/dto/translation-response.dto.ts src/translation/translation.service.ts src/translation/translation.service.spec.ts src/translation/translation.controller.ts src/translation/translation.controller.spec.ts
```

Expected: only US-1.3 docs and implementation files are changed. Do not commit unless explicitly requested.
