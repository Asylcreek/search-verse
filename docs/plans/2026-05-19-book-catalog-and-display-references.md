# Books Catalog and Display References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /books` for translation-agnostic book/chapter/verse metadata and enrich search and compare responses with readable passage labels.

**Architecture:** Add a focused `BooksModule` with static canonical metadata. Search and verse comparison reuse the same metadata helpers to add `bookName` and `displayReference` without changing their existing canonical reference contracts.

**Tech Stack:** NestJS 11, TypeScript, Jest, existing response interceptor.

**Repo rule:** Do not commit during this plan unless the user explicitly asks.

---

## File Structure

- Create `src/book/book.types.ts`: response and metadata types.
- Create `src/book/book.metadata.ts`: canonical Protestant 66-book metadata and display helpers.
- Create `src/book/book.service.ts`: returns canonical metadata.
- Create `src/book/book.controller.ts`: exposes `GET /books`.
- Create `src/book/book.module.ts`: registers controller and service.
- Create `src/book/book.metadata.spec.ts`: verifies helper behavior.
- Create `src/book/book.service.spec.ts`: verifies canonical catalog shape.
- Create `src/book/book.controller.spec.ts`: verifies controller delegation.
- Modify `src/app.module.ts`: import and register `BooksModule`.
- Modify `src/search/search.types.ts`: add `bookName` and `displayReference`.
- Modify `src/search/search.service.ts`: enrich search rows through book metadata helpers.
- Modify `src/search/search.service.spec.ts`: verify enriched search rows and fallback behavior.
- Modify `src/verse/verse.types.ts`: add `bookName` and `displayReference`.
- Modify `src/verse/verse.service.ts`: enrich comparison metadata through book metadata helpers.
- Modify `src/verse/verse.service.spec.ts`: verify enriched comparison metadata and fallback behavior.

## Task 1: Add Book Metadata Types and Helper Tests

**Files:**

- Create: `src/book/book.types.ts`
- Create: `src/book/book.metadata.spec.ts`

- [ ] **Step 1: Create book types**

Create `src/book/book.types.ts`:

```ts
import type { Testament } from '../database/schema/books.schema';

export interface BookChapterMetadata {
  number: number;
  verses: number;
}

export interface BookMetadata {
  id: string;
  name: string;
  testament: Testament;
  position: number;
  chapters: BookChapterMetadata[];
}
```

- [ ] **Step 2: Write failing helper tests**

Create `src/book/book.metadata.spec.ts`:

```ts
import {
  BIBLE_BOOKS,
  buildDisplayReference,
  getBookMetadata,
} from './book.metadata';

describe('books metadata', () => {
  it('keeps the Protestant canon in canonical order', () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(BIBLE_BOOKS[0]).toMatchObject({
      id: 'GEN',
      name: 'Genesis',
      testament: 'OT',
      position: 1,
    });
    expect(BIBLE_BOOKS[65]).toMatchObject({
      id: 'REV',
      name: 'Revelation',
      testament: 'NT',
      position: 66,
    });
  });

  it('includes exact verse counts for representative chapters', () => {
    expect(getBookMetadata('GEN')?.chapters[0]).toEqual({
      number: 1,
      verses: 31,
    });
    expect(getBookMetadata('PSA')?.chapters[118]).toEqual({
      number: 119,
      verses: 176,
    });
    expect(getBookMetadata('JHN')?.chapters[2]).toEqual({
      number: 3,
      verses: 36,
    });
  });

  it('builds readable references from canonical verse fields', () => {
    expect(buildDisplayReference('GEN', 1, 1, 'GEN.1.1')).toBe('Genesis 1:1');
    expect(buildDisplayReference('1KI', 2, 3, '1KI.2.3')).toBe('1 Kings 2:3');
  });

  it('falls back to the canonical reference when metadata is missing', () => {
    expect(buildDisplayReference('UNKNOWN', 1, 1, 'UNKNOWN.1.1')).toBe(
      'UNKNOWN.1.1'
    );
  });
});
```

- [ ] **Step 3: Run the focused failing test**

Run:

```bash
mise exec -- pnpm test -- book.metadata
```

Expected: FAIL because `src/book/book.metadata.ts` does not exist.

## Task 2: Add Canonical Book Metadata Helpers

**Files:**

- Create: `src/book/book.metadata.ts`

- [ ] **Step 1: Implement metadata helpers**

Create `src/book/book.metadata.ts`. Use the book IDs already accepted by `src/ingestion/testament.helper.ts`.

```ts
import { BookMetadata } from './book.types';

export const BIBLE_BOOKS: BookMetadata[] = [
  {
    id: 'GEN',
    position: 1,
    name: 'Genesis',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 31 },
      { number: 2, verses: 25 },
      { number: 3, verses: 24 },
      { number: 4, verses: 26 },
      { number: 5, verses: 32 },
      { number: 6, verses: 22 },
      { number: 7, verses: 24 },
      { number: 8, verses: 22 },
      { number: 9, verses: 29 },
      { number: 10, verses: 32 },
      { number: 11, verses: 32 },
      { number: 12, verses: 20 },
      { number: 13, verses: 18 },
      { number: 14, verses: 24 },
      { number: 15, verses: 21 },
      { number: 16, verses: 16 },
      { number: 17, verses: 27 },
      { number: 18, verses: 33 },
      { number: 19, verses: 38 },
      { number: 20, verses: 18 },
      { number: 21, verses: 34 },
      { number: 22, verses: 24 },
      { number: 23, verses: 20 },
      { number: 24, verses: 67 },
      { number: 25, verses: 34 },
      { number: 26, verses: 35 },
      { number: 27, verses: 46 },
      { number: 28, verses: 22 },
      { number: 29, verses: 35 },
      { number: 30, verses: 43 },
      { number: 31, verses: 55 },
      { number: 32, verses: 32 },
      { number: 33, verses: 20 },
      { number: 34, verses: 31 },
      { number: 35, verses: 29 },
      { number: 36, verses: 43 },
      { number: 37, verses: 36 },
      { number: 38, verses: 30 },
      { number: 39, verses: 23 },
      { number: 40, verses: 23 },
      { number: 41, verses: 57 },
      { number: 42, verses: 38 },
      { number: 43, verses: 34 },
      { number: 44, verses: 34 },
      { number: 45, verses: 28 },
      { number: 46, verses: 34 },
      { number: 47, verses: 31 },
      { number: 48, verses: 22 },
      { number: 49, verses: 33 },
      { number: 50, verses: 26 },
    ],
  },
  {
    id: 'EXO',
    position: 2,
    name: 'Exodus',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 22 },
      { number: 2, verses: 25 },
      { number: 3, verses: 22 },
      { number: 4, verses: 31 },
      { number: 5, verses: 23 },
      { number: 6, verses: 30 },
      { number: 7, verses: 25 },
      { number: 8, verses: 32 },
      { number: 9, verses: 35 },
      { number: 10, verses: 29 },
      { number: 11, verses: 10 },
      { number: 12, verses: 51 },
      { number: 13, verses: 22 },
      { number: 14, verses: 31 },
      { number: 15, verses: 27 },
      { number: 16, verses: 36 },
      { number: 17, verses: 16 },
      { number: 18, verses: 27 },
      { number: 19, verses: 25 },
      { number: 20, verses: 26 },
      { number: 21, verses: 36 },
      { number: 22, verses: 31 },
      { number: 23, verses: 33 },
      { number: 24, verses: 18 },
      { number: 25, verses: 40 },
      { number: 26, verses: 37 },
      { number: 27, verses: 21 },
      { number: 28, verses: 43 },
      { number: 29, verses: 46 },
      { number: 30, verses: 38 },
      { number: 31, verses: 18 },
      { number: 32, verses: 35 },
      { number: 33, verses: 23 },
      { number: 34, verses: 35 },
      { number: 35, verses: 35 },
      { number: 36, verses: 38 },
      { number: 37, verses: 29 },
      { number: 38, verses: 31 },
      { number: 39, verses: 43 },
      { number: 40, verses: 38 },
    ],
  },
  {
    id: 'LEV',
    position: 3,
    name: 'Leviticus',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 17 },
      { number: 2, verses: 16 },
      { number: 3, verses: 17 },
      { number: 4, verses: 35 },
      { number: 5, verses: 19 },
      { number: 6, verses: 30 },
      { number: 7, verses: 38 },
      { number: 8, verses: 36 },
      { number: 9, verses: 24 },
      { number: 10, verses: 20 },
      { number: 11, verses: 47 },
      { number: 12, verses: 8 },
      { number: 13, verses: 59 },
      { number: 14, verses: 57 },
      { number: 15, verses: 33 },
      { number: 16, verses: 34 },
      { number: 17, verses: 16 },
      { number: 18, verses: 30 },
      { number: 19, verses: 37 },
      { number: 20, verses: 27 },
      { number: 21, verses: 24 },
      { number: 22, verses: 33 },
      { number: 23, verses: 44 },
      { number: 24, verses: 23 },
      { number: 25, verses: 55 },
      { number: 26, verses: 46 },
      { number: 27, verses: 34 },
    ],
  },
  {
    id: 'NUM',
    position: 4,
    name: 'Numbers',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 54 },
      { number: 2, verses: 34 },
      { number: 3, verses: 51 },
      { number: 4, verses: 49 },
      { number: 5, verses: 31 },
      { number: 6, verses: 27 },
      { number: 7, verses: 89 },
      { number: 8, verses: 26 },
      { number: 9, verses: 23 },
      { number: 10, verses: 36 },
      { number: 11, verses: 35 },
      { number: 12, verses: 16 },
      { number: 13, verses: 33 },
      { number: 14, verses: 45 },
      { number: 15, verses: 41 },
      { number: 16, verses: 50 },
      { number: 17, verses: 13 },
      { number: 18, verses: 32 },
      { number: 19, verses: 22 },
      { number: 20, verses: 29 },
      { number: 21, verses: 35 },
      { number: 22, verses: 41 },
      { number: 23, verses: 30 },
      { number: 24, verses: 25 },
      { number: 25, verses: 18 },
      { number: 26, verses: 65 },
      { number: 27, verses: 23 },
      { number: 28, verses: 31 },
      { number: 29, verses: 40 },
      { number: 30, verses: 16 },
      { number: 31, verses: 54 },
      { number: 32, verses: 42 },
      { number: 33, verses: 56 },
      { number: 34, verses: 29 },
      { number: 35, verses: 34 },
      { number: 36, verses: 13 },
    ],
  },
  {
    id: 'DEU',
    position: 5,
    name: 'Deuteronomy',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 46 },
      { number: 2, verses: 37 },
      { number: 3, verses: 29 },
      { number: 4, verses: 49 },
      { number: 5, verses: 33 },
      { number: 6, verses: 25 },
      { number: 7, verses: 26 },
      { number: 8, verses: 20 },
      { number: 9, verses: 29 },
      { number: 10, verses: 22 },
      { number: 11, verses: 32 },
      { number: 12, verses: 32 },
      { number: 13, verses: 18 },
      { number: 14, verses: 29 },
      { number: 15, verses: 23 },
      { number: 16, verses: 22 },
      { number: 17, verses: 20 },
      { number: 18, verses: 22 },
      { number: 19, verses: 21 },
      { number: 20, verses: 20 },
      { number: 21, verses: 23 },
      { number: 22, verses: 30 },
      { number: 23, verses: 25 },
      { number: 24, verses: 22 },
      { number: 25, verses: 19 },
      { number: 26, verses: 19 },
      { number: 27, verses: 26 },
      { number: 28, verses: 68 },
      { number: 29, verses: 29 },
      { number: 30, verses: 20 },
      { number: 31, verses: 30 },
      { number: 32, verses: 52 },
      { number: 33, verses: 29 },
      { number: 34, verses: 12 },
    ],
  },
  {
    id: 'JOS',
    position: 6,
    name: 'Joshua',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 18 },
      { number: 2, verses: 24 },
      { number: 3, verses: 17 },
      { number: 4, verses: 24 },
      { number: 5, verses: 15 },
      { number: 6, verses: 27 },
      { number: 7, verses: 26 },
      { number: 8, verses: 35 },
      { number: 9, verses: 27 },
      { number: 10, verses: 43 },
      { number: 11, verses: 23 },
      { number: 12, verses: 24 },
      { number: 13, verses: 33 },
      { number: 14, verses: 15 },
      { number: 15, verses: 63 },
      { number: 16, verses: 10 },
      { number: 17, verses: 18 },
      { number: 18, verses: 28 },
      { number: 19, verses: 51 },
      { number: 20, verses: 9 },
      { number: 21, verses: 45 },
      { number: 22, verses: 34 },
      { number: 23, verses: 16 },
      { number: 24, verses: 33 },
    ],
  },
  {
    id: 'JDG',
    position: 7,
    name: 'Judges',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 36 },
      { number: 2, verses: 23 },
      { number: 3, verses: 31 },
      { number: 4, verses: 24 },
      { number: 5, verses: 31 },
      { number: 6, verses: 40 },
      { number: 7, verses: 25 },
      { number: 8, verses: 35 },
      { number: 9, verses: 57 },
      { number: 10, verses: 18 },
      { number: 11, verses: 40 },
      { number: 12, verses: 15 },
      { number: 13, verses: 25 },
      { number: 14, verses: 20 },
      { number: 15, verses: 20 },
      { number: 16, verses: 31 },
      { number: 17, verses: 13 },
      { number: 18, verses: 31 },
      { number: 19, verses: 30 },
      { number: 20, verses: 48 },
      { number: 21, verses: 25 },
    ],
  },
  {
    id: 'RUT',
    position: 8,
    name: 'Ruth',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 22 },
      { number: 2, verses: 23 },
      { number: 3, verses: 18 },
      { number: 4, verses: 22 },
    ],
  },
  {
    id: '1SA',
    position: 9,
    name: '1 Samuel',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 28 },
      { number: 2, verses: 36 },
      { number: 3, verses: 21 },
      { number: 4, verses: 22 },
      { number: 5, verses: 12 },
      { number: 6, verses: 21 },
      { number: 7, verses: 17 },
      { number: 8, verses: 22 },
      { number: 9, verses: 27 },
      { number: 10, verses: 27 },
      { number: 11, verses: 15 },
      { number: 12, verses: 25 },
      { number: 13, verses: 23 },
      { number: 14, verses: 52 },
      { number: 15, verses: 35 },
      { number: 16, verses: 23 },
      { number: 17, verses: 58 },
      { number: 18, verses: 30 },
      { number: 19, verses: 24 },
      { number: 20, verses: 42 },
      { number: 21, verses: 15 },
      { number: 22, verses: 23 },
      { number: 23, verses: 29 },
      { number: 24, verses: 22 },
      { number: 25, verses: 44 },
      { number: 26, verses: 25 },
      { number: 27, verses: 12 },
      { number: 28, verses: 25 },
      { number: 29, verses: 11 },
      { number: 30, verses: 31 },
      { number: 31, verses: 13 },
    ],
  },
  {
    id: '2SA',
    position: 10,
    name: '2 Samuel',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 27 },
      { number: 2, verses: 32 },
      { number: 3, verses: 39 },
      { number: 4, verses: 12 },
      { number: 5, verses: 25 },
      { number: 6, verses: 23 },
      { number: 7, verses: 29 },
      { number: 8, verses: 18 },
      { number: 9, verses: 13 },
      { number: 10, verses: 19 },
      { number: 11, verses: 27 },
      { number: 12, verses: 31 },
      { number: 13, verses: 39 },
      { number: 14, verses: 33 },
      { number: 15, verses: 37 },
      { number: 16, verses: 23 },
      { number: 17, verses: 29 },
      { number: 18, verses: 33 },
      { number: 19, verses: 43 },
      { number: 20, verses: 26 },
      { number: 21, verses: 22 },
      { number: 22, verses: 51 },
      { number: 23, verses: 39 },
      { number: 24, verses: 25 },
    ],
  },
  {
    id: '1KI',
    position: 11,
    name: '1 Kings',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 53 },
      { number: 2, verses: 46 },
      { number: 3, verses: 28 },
      { number: 4, verses: 34 },
      { number: 5, verses: 18 },
      { number: 6, verses: 38 },
      { number: 7, verses: 51 },
      { number: 8, verses: 66 },
      { number: 9, verses: 28 },
      { number: 10, verses: 29 },
      { number: 11, verses: 43 },
      { number: 12, verses: 33 },
      { number: 13, verses: 34 },
      { number: 14, verses: 31 },
      { number: 15, verses: 34 },
      { number: 16, verses: 34 },
      { number: 17, verses: 24 },
      { number: 18, verses: 46 },
      { number: 19, verses: 21 },
      { number: 20, verses: 43 },
      { number: 21, verses: 29 },
      { number: 22, verses: 53 },
    ],
  },
  {
    id: '2KI',
    position: 12,
    name: '2 Kings',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 18 },
      { number: 2, verses: 25 },
      { number: 3, verses: 27 },
      { number: 4, verses: 44 },
      { number: 5, verses: 27 },
      { number: 6, verses: 33 },
      { number: 7, verses: 20 },
      { number: 8, verses: 29 },
      { number: 9, verses: 37 },
      { number: 10, verses: 36 },
      { number: 11, verses: 21 },
      { number: 12, verses: 21 },
      { number: 13, verses: 25 },
      { number: 14, verses: 29 },
      { number: 15, verses: 38 },
      { number: 16, verses: 20 },
      { number: 17, verses: 41 },
      { number: 18, verses: 37 },
      { number: 19, verses: 37 },
      { number: 20, verses: 21 },
      { number: 21, verses: 26 },
      { number: 22, verses: 20 },
      { number: 23, verses: 37 },
      { number: 24, verses: 20 },
      { number: 25, verses: 30 },
    ],
  },
  {
    id: '1CH',
    position: 13,
    name: '1 Chronicles',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 54 },
      { number: 2, verses: 55 },
      { number: 3, verses: 24 },
      { number: 4, verses: 43 },
      { number: 5, verses: 26 },
      { number: 6, verses: 81 },
      { number: 7, verses: 40 },
      { number: 8, verses: 40 },
      { number: 9, verses: 44 },
      { number: 10, verses: 14 },
      { number: 11, verses: 47 },
      { number: 12, verses: 40 },
      { number: 13, verses: 14 },
      { number: 14, verses: 17 },
      { number: 15, verses: 29 },
      { number: 16, verses: 43 },
      { number: 17, verses: 27 },
      { number: 18, verses: 17 },
      { number: 19, verses: 19 },
      { number: 20, verses: 8 },
      { number: 21, verses: 30 },
      { number: 22, verses: 19 },
      { number: 23, verses: 32 },
      { number: 24, verses: 31 },
      { number: 25, verses: 31 },
      { number: 26, verses: 32 },
      { number: 27, verses: 34 },
      { number: 28, verses: 21 },
      { number: 29, verses: 30 },
    ],
  },
  {
    id: '2CH',
    position: 14,
    name: '2 Chronicles',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 17 },
      { number: 2, verses: 18 },
      { number: 3, verses: 17 },
      { number: 4, verses: 22 },
      { number: 5, verses: 14 },
      { number: 6, verses: 42 },
      { number: 7, verses: 22 },
      { number: 8, verses: 18 },
      { number: 9, verses: 31 },
      { number: 10, verses: 19 },
      { number: 11, verses: 23 },
      { number: 12, verses: 16 },
      { number: 13, verses: 22 },
      { number: 14, verses: 15 },
      { number: 15, verses: 19 },
      { number: 16, verses: 14 },
      { number: 17, verses: 19 },
      { number: 18, verses: 34 },
      { number: 19, verses: 11 },
      { number: 20, verses: 37 },
      { number: 21, verses: 20 },
      { number: 22, verses: 12 },
      { number: 23, verses: 21 },
      { number: 24, verses: 27 },
      { number: 25, verses: 28 },
      { number: 26, verses: 23 },
      { number: 27, verses: 9 },
      { number: 28, verses: 27 },
      { number: 29, verses: 36 },
      { number: 30, verses: 27 },
      { number: 31, verses: 21 },
      { number: 32, verses: 33 },
      { number: 33, verses: 25 },
      { number: 34, verses: 33 },
      { number: 35, verses: 27 },
      { number: 36, verses: 23 },
    ],
  },
  {
    id: 'EZR',
    position: 15,
    name: 'Ezra',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 11 },
      { number: 2, verses: 70 },
      { number: 3, verses: 13 },
      { number: 4, verses: 24 },
      { number: 5, verses: 17 },
      { number: 6, verses: 22 },
      { number: 7, verses: 28 },
      { number: 8, verses: 36 },
      { number: 9, verses: 15 },
      { number: 10, verses: 44 },
    ],
  },
  {
    id: 'NEH',
    position: 16,
    name: 'Nehemiah',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 11 },
      { number: 2, verses: 20 },
      { number: 3, verses: 32 },
      { number: 4, verses: 23 },
      { number: 5, verses: 19 },
      { number: 6, verses: 19 },
      { number: 7, verses: 73 },
      { number: 8, verses: 18 },
      { number: 9, verses: 38 },
      { number: 10, verses: 39 },
      { number: 11, verses: 36 },
      { number: 12, verses: 47 },
      { number: 13, verses: 31 },
    ],
  },
  {
    id: 'EST',
    position: 17,
    name: 'Esther',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 22 },
      { number: 2, verses: 23 },
      { number: 3, verses: 15 },
      { number: 4, verses: 17 },
      { number: 5, verses: 14 },
      { number: 6, verses: 14 },
      { number: 7, verses: 10 },
      { number: 8, verses: 17 },
      { number: 9, verses: 32 },
      { number: 10, verses: 3 },
    ],
  },
  {
    id: 'JOB',
    position: 18,
    name: 'Job',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 22 },
      { number: 2, verses: 13 },
      { number: 3, verses: 26 },
      { number: 4, verses: 21 },
      { number: 5, verses: 27 },
      { number: 6, verses: 30 },
      { number: 7, verses: 21 },
      { number: 8, verses: 22 },
      { number: 9, verses: 35 },
      { number: 10, verses: 22 },
      { number: 11, verses: 20 },
      { number: 12, verses: 25 },
      { number: 13, verses: 28 },
      { number: 14, verses: 22 },
      { number: 15, verses: 35 },
      { number: 16, verses: 22 },
      { number: 17, verses: 16 },
      { number: 18, verses: 21 },
      { number: 19, verses: 29 },
      { number: 20, verses: 29 },
      { number: 21, verses: 34 },
      { number: 22, verses: 30 },
      { number: 23, verses: 17 },
      { number: 24, verses: 25 },
      { number: 25, verses: 6 },
      { number: 26, verses: 14 },
      { number: 27, verses: 23 },
      { number: 28, verses: 28 },
      { number: 29, verses: 25 },
      { number: 30, verses: 31 },
      { number: 31, verses: 40 },
      { number: 32, verses: 22 },
      { number: 33, verses: 33 },
      { number: 34, verses: 37 },
      { number: 35, verses: 16 },
      { number: 36, verses: 33 },
      { number: 37, verses: 24 },
      { number: 38, verses: 41 },
      { number: 39, verses: 30 },
      { number: 40, verses: 24 },
      { number: 41, verses: 34 },
      { number: 42, verses: 17 },
    ],
  },
  {
    id: 'PSA',
    position: 19,
    name: 'Psalms',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 6 },
      { number: 2, verses: 12 },
      { number: 3, verses: 8 },
      { number: 4, verses: 8 },
      { number: 5, verses: 12 },
      { number: 6, verses: 10 },
      { number: 7, verses: 17 },
      { number: 8, verses: 9 },
      { number: 9, verses: 20 },
      { number: 10, verses: 18 },
      { number: 11, verses: 7 },
      { number: 12, verses: 8 },
      { number: 13, verses: 6 },
      { number: 14, verses: 7 },
      { number: 15, verses: 5 },
      { number: 16, verses: 11 },
      { number: 17, verses: 15 },
      { number: 18, verses: 50 },
      { number: 19, verses: 14 },
      { number: 20, verses: 9 },
      { number: 21, verses: 13 },
      { number: 22, verses: 31 },
      { number: 23, verses: 6 },
      { number: 24, verses: 10 },
      { number: 25, verses: 22 },
      { number: 26, verses: 12 },
      { number: 27, verses: 14 },
      { number: 28, verses: 9 },
      { number: 29, verses: 11 },
      { number: 30, verses: 12 },
      { number: 31, verses: 24 },
      { number: 32, verses: 11 },
      { number: 33, verses: 22 },
      { number: 34, verses: 22 },
      { number: 35, verses: 28 },
      { number: 36, verses: 12 },
      { number: 37, verses: 40 },
      { number: 38, verses: 22 },
      { number: 39, verses: 13 },
      { number: 40, verses: 17 },
      { number: 41, verses: 13 },
      { number: 42, verses: 11 },
      { number: 43, verses: 5 },
      { number: 44, verses: 26 },
      { number: 45, verses: 17 },
      { number: 46, verses: 11 },
      { number: 47, verses: 9 },
      { number: 48, verses: 14 },
      { number: 49, verses: 20 },
      { number: 50, verses: 23 },
      { number: 51, verses: 19 },
      { number: 52, verses: 9 },
      { number: 53, verses: 6 },
      { number: 54, verses: 7 },
      { number: 55, verses: 23 },
      { number: 56, verses: 13 },
      { number: 57, verses: 11 },
      { number: 58, verses: 11 },
      { number: 59, verses: 17 },
      { number: 60, verses: 12 },
      { number: 61, verses: 8 },
      { number: 62, verses: 12 },
      { number: 63, verses: 11 },
      { number: 64, verses: 10 },
      { number: 65, verses: 13 },
      { number: 66, verses: 20 },
      { number: 67, verses: 7 },
      { number: 68, verses: 35 },
      { number: 69, verses: 36 },
      { number: 70, verses: 5 },
      { number: 71, verses: 24 },
      { number: 72, verses: 20 },
      { number: 73, verses: 28 },
      { number: 74, verses: 23 },
      { number: 75, verses: 10 },
      { number: 76, verses: 12 },
      { number: 77, verses: 20 },
      { number: 78, verses: 72 },
      { number: 79, verses: 13 },
      { number: 80, verses: 19 },
      { number: 81, verses: 16 },
      { number: 82, verses: 8 },
      { number: 83, verses: 18 },
      { number: 84, verses: 12 },
      { number: 85, verses: 13 },
      { number: 86, verses: 17 },
      { number: 87, verses: 7 },
      { number: 88, verses: 18 },
      { number: 89, verses: 52 },
      { number: 90, verses: 17 },
      { number: 91, verses: 16 },
      { number: 92, verses: 15 },
      { number: 93, verses: 5 },
      { number: 94, verses: 23 },
      { number: 95, verses: 11 },
      { number: 96, verses: 13 },
      { number: 97, verses: 12 },
      { number: 98, verses: 9 },
      { number: 99, verses: 9 },
      { number: 100, verses: 5 },
      { number: 101, verses: 8 },
      { number: 102, verses: 28 },
      { number: 103, verses: 22 },
      { number: 104, verses: 35 },
      { number: 105, verses: 45 },
      { number: 106, verses: 48 },
      { number: 107, verses: 43 },
      { number: 108, verses: 13 },
      { number: 109, verses: 31 },
      { number: 110, verses: 7 },
      { number: 111, verses: 10 },
      { number: 112, verses: 10 },
      { number: 113, verses: 9 },
      { number: 114, verses: 8 },
      { number: 115, verses: 18 },
      { number: 116, verses: 19 },
      { number: 117, verses: 2 },
      { number: 118, verses: 29 },
      { number: 119, verses: 176 },
      { number: 120, verses: 7 },
      { number: 121, verses: 8 },
      { number: 122, verses: 9 },
      { number: 123, verses: 4 },
      { number: 124, verses: 8 },
      { number: 125, verses: 5 },
      { number: 126, verses: 6 },
      { number: 127, verses: 5 },
      { number: 128, verses: 6 },
      { number: 129, verses: 8 },
      { number: 130, verses: 8 },
      { number: 131, verses: 3 },
      { number: 132, verses: 18 },
      { number: 133, verses: 3 },
      { number: 134, verses: 3 },
      { number: 135, verses: 21 },
      { number: 136, verses: 26 },
      { number: 137, verses: 9 },
      { number: 138, verses: 8 },
      { number: 139, verses: 24 },
      { number: 140, verses: 13 },
      { number: 141, verses: 10 },
      { number: 142, verses: 7 },
      { number: 143, verses: 12 },
      { number: 144, verses: 15 },
      { number: 145, verses: 21 },
      { number: 146, verses: 10 },
      { number: 147, verses: 20 },
      { number: 148, verses: 14 },
      { number: 149, verses: 9 },
      { number: 150, verses: 6 },
    ],
  },
  {
    id: 'PRO',
    position: 20,
    name: 'Proverbs',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 33 },
      { number: 2, verses: 22 },
      { number: 3, verses: 35 },
      { number: 4, verses: 27 },
      { number: 5, verses: 23 },
      { number: 6, verses: 35 },
      { number: 7, verses: 27 },
      { number: 8, verses: 36 },
      { number: 9, verses: 18 },
      { number: 10, verses: 32 },
      { number: 11, verses: 31 },
      { number: 12, verses: 28 },
      { number: 13, verses: 25 },
      { number: 14, verses: 35 },
      { number: 15, verses: 33 },
      { number: 16, verses: 33 },
      { number: 17, verses: 28 },
      { number: 18, verses: 24 },
      { number: 19, verses: 29 },
      { number: 20, verses: 30 },
      { number: 21, verses: 31 },
      { number: 22, verses: 29 },
      { number: 23, verses: 35 },
      { number: 24, verses: 34 },
      { number: 25, verses: 28 },
      { number: 26, verses: 28 },
      { number: 27, verses: 27 },
      { number: 28, verses: 28 },
      { number: 29, verses: 27 },
      { number: 30, verses: 33 },
      { number: 31, verses: 31 },
    ],
  },
  {
    id: 'ECC',
    position: 21,
    name: 'Ecclesiastes',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 18 },
      { number: 2, verses: 26 },
      { number: 3, verses: 22 },
      { number: 4, verses: 16 },
      { number: 5, verses: 20 },
      { number: 6, verses: 12 },
      { number: 7, verses: 29 },
      { number: 8, verses: 17 },
      { number: 9, verses: 18 },
      { number: 10, verses: 20 },
      { number: 11, verses: 10 },
      { number: 12, verses: 14 },
    ],
  },
  {
    id: 'SNG',
    position: 22,
    name: 'Song of Songs',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 17 },
      { number: 2, verses: 17 },
      { number: 3, verses: 11 },
      { number: 4, verses: 16 },
      { number: 5, verses: 16 },
      { number: 6, verses: 13 },
      { number: 7, verses: 13 },
      { number: 8, verses: 14 },
    ],
  },
  {
    id: 'ISA',
    position: 23,
    name: 'Isaiah',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 31 },
      { number: 2, verses: 22 },
      { number: 3, verses: 26 },
      { number: 4, verses: 6 },
      { number: 5, verses: 30 },
      { number: 6, verses: 13 },
      { number: 7, verses: 25 },
      { number: 8, verses: 22 },
      { number: 9, verses: 21 },
      { number: 10, verses: 34 },
      { number: 11, verses: 16 },
      { number: 12, verses: 6 },
      { number: 13, verses: 22 },
      { number: 14, verses: 32 },
      { number: 15, verses: 9 },
      { number: 16, verses: 14 },
      { number: 17, verses: 14 },
      { number: 18, verses: 7 },
      { number: 19, verses: 25 },
      { number: 20, verses: 6 },
      { number: 21, verses: 17 },
      { number: 22, verses: 25 },
      { number: 23, verses: 18 },
      { number: 24, verses: 23 },
      { number: 25, verses: 12 },
      { number: 26, verses: 21 },
      { number: 27, verses: 13 },
      { number: 28, verses: 29 },
      { number: 29, verses: 24 },
      { number: 30, verses: 33 },
      { number: 31, verses: 9 },
      { number: 32, verses: 20 },
      { number: 33, verses: 24 },
      { number: 34, verses: 17 },
      { number: 35, verses: 10 },
      { number: 36, verses: 22 },
      { number: 37, verses: 38 },
      { number: 38, verses: 22 },
      { number: 39, verses: 8 },
      { number: 40, verses: 31 },
      { number: 41, verses: 29 },
      { number: 42, verses: 25 },
      { number: 43, verses: 28 },
      { number: 44, verses: 28 },
      { number: 45, verses: 25 },
      { number: 46, verses: 13 },
      { number: 47, verses: 15 },
      { number: 48, verses: 22 },
      { number: 49, verses: 26 },
      { number: 50, verses: 11 },
      { number: 51, verses: 23 },
      { number: 52, verses: 15 },
      { number: 53, verses: 12 },
      { number: 54, verses: 17 },
      { number: 55, verses: 13 },
      { number: 56, verses: 12 },
      { number: 57, verses: 21 },
      { number: 58, verses: 14 },
      { number: 59, verses: 21 },
      { number: 60, verses: 22 },
      { number: 61, verses: 11 },
      { number: 62, verses: 12 },
      { number: 63, verses: 19 },
      { number: 64, verses: 12 },
      { number: 65, verses: 25 },
      { number: 66, verses: 24 },
    ],
  },
  {
    id: 'JER',
    position: 24,
    name: 'Jeremiah',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 19 },
      { number: 2, verses: 37 },
      { number: 3, verses: 25 },
      { number: 4, verses: 31 },
      { number: 5, verses: 31 },
      { number: 6, verses: 30 },
      { number: 7, verses: 34 },
      { number: 8, verses: 22 },
      { number: 9, verses: 26 },
      { number: 10, verses: 25 },
      { number: 11, verses: 23 },
      { number: 12, verses: 17 },
      { number: 13, verses: 27 },
      { number: 14, verses: 22 },
      { number: 15, verses: 21 },
      { number: 16, verses: 21 },
      { number: 17, verses: 27 },
      { number: 18, verses: 23 },
      { number: 19, verses: 15 },
      { number: 20, verses: 18 },
      { number: 21, verses: 14 },
      { number: 22, verses: 30 },
      { number: 23, verses: 40 },
      { number: 24, verses: 10 },
      { number: 25, verses: 38 },
      { number: 26, verses: 24 },
      { number: 27, verses: 22 },
      { number: 28, verses: 17 },
      { number: 29, verses: 32 },
      { number: 30, verses: 24 },
      { number: 31, verses: 40 },
      { number: 32, verses: 44 },
      { number: 33, verses: 26 },
      { number: 34, verses: 22 },
      { number: 35, verses: 19 },
      { number: 36, verses: 32 },
      { number: 37, verses: 21 },
      { number: 38, verses: 28 },
      { number: 39, verses: 18 },
      { number: 40, verses: 16 },
      { number: 41, verses: 18 },
      { number: 42, verses: 22 },
      { number: 43, verses: 13 },
      { number: 44, verses: 30 },
      { number: 45, verses: 5 },
      { number: 46, verses: 28 },
      { number: 47, verses: 7 },
      { number: 48, verses: 47 },
      { number: 49, verses: 39 },
      { number: 50, verses: 46 },
      { number: 51, verses: 64 },
      { number: 52, verses: 34 },
    ],
  },
  {
    id: 'LAM',
    position: 25,
    name: 'Lamentations',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 22 },
      { number: 2, verses: 22 },
      { number: 3, verses: 66 },
      { number: 4, verses: 22 },
      { number: 5, verses: 22 },
    ],
  },
  {
    id: 'EZK',
    position: 26,
    name: 'Ezekiel',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 28 },
      { number: 2, verses: 10 },
      { number: 3, verses: 27 },
      { number: 4, verses: 17 },
      { number: 5, verses: 17 },
      { number: 6, verses: 14 },
      { number: 7, verses: 27 },
      { number: 8, verses: 18 },
      { number: 9, verses: 11 },
      { number: 10, verses: 22 },
      { number: 11, verses: 25 },
      { number: 12, verses: 28 },
      { number: 13, verses: 23 },
      { number: 14, verses: 23 },
      { number: 15, verses: 8 },
      { number: 16, verses: 63 },
      { number: 17, verses: 24 },
      { number: 18, verses: 32 },
      { number: 19, verses: 14 },
      { number: 20, verses: 49 },
      { number: 21, verses: 32 },
      { number: 22, verses: 31 },
      { number: 23, verses: 49 },
      { number: 24, verses: 27 },
      { number: 25, verses: 17 },
      { number: 26, verses: 21 },
      { number: 27, verses: 36 },
      { number: 28, verses: 26 },
      { number: 29, verses: 21 },
      { number: 30, verses: 26 },
      { number: 31, verses: 18 },
      { number: 32, verses: 32 },
      { number: 33, verses: 33 },
      { number: 34, verses: 31 },
      { number: 35, verses: 15 },
      { number: 36, verses: 38 },
      { number: 37, verses: 28 },
      { number: 38, verses: 23 },
      { number: 39, verses: 29 },
      { number: 40, verses: 49 },
      { number: 41, verses: 26 },
      { number: 42, verses: 20 },
      { number: 43, verses: 27 },
      { number: 44, verses: 31 },
      { number: 45, verses: 25 },
      { number: 46, verses: 24 },
      { number: 47, verses: 23 },
      { number: 48, verses: 35 },
    ],
  },
  {
    id: 'DAN',
    position: 27,
    name: 'Daniel',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 21 },
      { number: 2, verses: 49 },
      { number: 3, verses: 30 },
      { number: 4, verses: 37 },
      { number: 5, verses: 31 },
      { number: 6, verses: 28 },
      { number: 7, verses: 28 },
      { number: 8, verses: 27 },
      { number: 9, verses: 27 },
      { number: 10, verses: 21 },
      { number: 11, verses: 45 },
      { number: 12, verses: 13 },
    ],
  },
  {
    id: 'HOS',
    position: 28,
    name: 'Hosea',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 11 },
      { number: 2, verses: 23 },
      { number: 3, verses: 5 },
      { number: 4, verses: 19 },
      { number: 5, verses: 15 },
      { number: 6, verses: 11 },
      { number: 7, verses: 16 },
      { number: 8, verses: 14 },
      { number: 9, verses: 17 },
      { number: 10, verses: 15 },
      { number: 11, verses: 12 },
      { number: 12, verses: 14 },
      { number: 13, verses: 16 },
      { number: 14, verses: 9 },
    ],
  },
  {
    id: 'JOL',
    position: 29,
    name: 'Joel',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 20 },
      { number: 2, verses: 32 },
      { number: 3, verses: 21 },
    ],
  },
  {
    id: 'AMO',
    position: 30,
    name: 'Amos',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 15 },
      { number: 2, verses: 16 },
      { number: 3, verses: 15 },
      { number: 4, verses: 13 },
      { number: 5, verses: 27 },
      { number: 6, verses: 14 },
      { number: 7, verses: 17 },
      { number: 8, verses: 14 },
      { number: 9, verses: 15 },
    ],
  },
  {
    id: 'OBA',
    position: 31,
    name: 'Obadiah',
    testament: 'OT',
    chapters: [{ number: 1, verses: 21 }],
  },
  {
    id: 'JON',
    position: 32,
    name: 'Jonah',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 17 },
      { number: 2, verses: 10 },
      { number: 3, verses: 10 },
      { number: 4, verses: 11 },
    ],
  },
  {
    id: 'MIC',
    position: 33,
    name: 'Micah',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 16 },
      { number: 2, verses: 13 },
      { number: 3, verses: 12 },
      { number: 4, verses: 13 },
      { number: 5, verses: 15 },
      { number: 6, verses: 16 },
      { number: 7, verses: 20 },
    ],
  },
  {
    id: 'NAM',
    position: 34,
    name: 'Nahum',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 15 },
      { number: 2, verses: 13 },
      { number: 3, verses: 19 },
    ],
  },
  {
    id: 'HAB',
    position: 35,
    name: 'Habakkuk',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 17 },
      { number: 2, verses: 20 },
      { number: 3, verses: 19 },
    ],
  },
  {
    id: 'ZEP',
    position: 36,
    name: 'Zephaniah',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 18 },
      { number: 2, verses: 15 },
      { number: 3, verses: 20 },
    ],
  },
  {
    id: 'HAG',
    position: 37,
    name: 'Haggai',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 15 },
      { number: 2, verses: 23 },
    ],
  },
  {
    id: 'ZEC',
    position: 38,
    name: 'Zechariah',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 21 },
      { number: 2, verses: 13 },
      { number: 3, verses: 10 },
      { number: 4, verses: 14 },
      { number: 5, verses: 11 },
      { number: 6, verses: 15 },
      { number: 7, verses: 14 },
      { number: 8, verses: 23 },
      { number: 9, verses: 17 },
      { number: 10, verses: 12 },
      { number: 11, verses: 17 },
      { number: 12, verses: 14 },
      { number: 13, verses: 9 },
      { number: 14, verses: 21 },
    ],
  },
  {
    id: 'MAL',
    position: 39,
    name: 'Malachi',
    testament: 'OT',
    chapters: [
      { number: 1, verses: 14 },
      { number: 2, verses: 17 },
      { number: 3, verses: 18 },
      { number: 4, verses: 6 },
    ],
  },
  {
    id: 'MAT',
    position: 40,
    name: 'Matthew',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 25 },
      { number: 2, verses: 23 },
      { number: 3, verses: 17 },
      { number: 4, verses: 25 },
      { number: 5, verses: 48 },
      { number: 6, verses: 34 },
      { number: 7, verses: 29 },
      { number: 8, verses: 34 },
      { number: 9, verses: 38 },
      { number: 10, verses: 42 },
      { number: 11, verses: 30 },
      { number: 12, verses: 50 },
      { number: 13, verses: 58 },
      { number: 14, verses: 36 },
      { number: 15, verses: 39 },
      { number: 16, verses: 28 },
      { number: 17, verses: 27 },
      { number: 18, verses: 35 },
      { number: 19, verses: 30 },
      { number: 20, verses: 34 },
      { number: 21, verses: 46 },
      { number: 22, verses: 46 },
      { number: 23, verses: 39 },
      { number: 24, verses: 51 },
      { number: 25, verses: 46 },
      { number: 26, verses: 75 },
      { number: 27, verses: 66 },
      { number: 28, verses: 20 },
    ],
  },
  {
    id: 'MRK',
    position: 41,
    name: 'Mark',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 45 },
      { number: 2, verses: 28 },
      { number: 3, verses: 35 },
      { number: 4, verses: 41 },
      { number: 5, verses: 43 },
      { number: 6, verses: 56 },
      { number: 7, verses: 37 },
      { number: 8, verses: 38 },
      { number: 9, verses: 50 },
      { number: 10, verses: 52 },
      { number: 11, verses: 33 },
      { number: 12, verses: 44 },
      { number: 13, verses: 37 },
      { number: 14, verses: 72 },
      { number: 15, verses: 47 },
      { number: 16, verses: 20 },
    ],
  },
  {
    id: 'LUK',
    position: 42,
    name: 'Luke',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 80 },
      { number: 2, verses: 52 },
      { number: 3, verses: 38 },
      { number: 4, verses: 44 },
      { number: 5, verses: 39 },
      { number: 6, verses: 49 },
      { number: 7, verses: 50 },
      { number: 8, verses: 56 },
      { number: 9, verses: 62 },
      { number: 10, verses: 42 },
      { number: 11, verses: 54 },
      { number: 12, verses: 59 },
      { number: 13, verses: 35 },
      { number: 14, verses: 35 },
      { number: 15, verses: 32 },
      { number: 16, verses: 31 },
      { number: 17, verses: 37 },
      { number: 18, verses: 43 },
      { number: 19, verses: 48 },
      { number: 20, verses: 47 },
      { number: 21, verses: 38 },
      { number: 22, verses: 71 },
      { number: 23, verses: 56 },
      { number: 24, verses: 53 },
    ],
  },
  {
    id: 'JHN',
    position: 43,
    name: 'John',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 51 },
      { number: 2, verses: 25 },
      { number: 3, verses: 36 },
      { number: 4, verses: 54 },
      { number: 5, verses: 47 },
      { number: 6, verses: 71 },
      { number: 7, verses: 53 },
      { number: 8, verses: 59 },
      { number: 9, verses: 41 },
      { number: 10, verses: 42 },
      { number: 11, verses: 57 },
      { number: 12, verses: 50 },
      { number: 13, verses: 38 },
      { number: 14, verses: 31 },
      { number: 15, verses: 27 },
      { number: 16, verses: 33 },
      { number: 17, verses: 26 },
      { number: 18, verses: 40 },
      { number: 19, verses: 42 },
      { number: 20, verses: 31 },
      { number: 21, verses: 25 },
    ],
  },
  {
    id: 'ACT',
    position: 44,
    name: 'Acts',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 26 },
      { number: 2, verses: 47 },
      { number: 3, verses: 26 },
      { number: 4, verses: 37 },
      { number: 5, verses: 42 },
      { number: 6, verses: 15 },
      { number: 7, verses: 60 },
      { number: 8, verses: 40 },
      { number: 9, verses: 43 },
      { number: 10, verses: 48 },
      { number: 11, verses: 30 },
      { number: 12, verses: 25 },
      { number: 13, verses: 52 },
      { number: 14, verses: 28 },
      { number: 15, verses: 41 },
      { number: 16, verses: 40 },
      { number: 17, verses: 34 },
      { number: 18, verses: 28 },
      { number: 19, verses: 41 },
      { number: 20, verses: 38 },
      { number: 21, verses: 40 },
      { number: 22, verses: 30 },
      { number: 23, verses: 35 },
      { number: 24, verses: 27 },
      { number: 25, verses: 27 },
      { number: 26, verses: 32 },
      { number: 27, verses: 44 },
      { number: 28, verses: 31 },
    ],
  },
  {
    id: 'ROM',
    position: 45,
    name: 'Romans',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 32 },
      { number: 2, verses: 29 },
      { number: 3, verses: 31 },
      { number: 4, verses: 25 },
      { number: 5, verses: 21 },
      { number: 6, verses: 23 },
      { number: 7, verses: 25 },
      { number: 8, verses: 39 },
      { number: 9, verses: 33 },
      { number: 10, verses: 21 },
      { number: 11, verses: 36 },
      { number: 12, verses: 21 },
      { number: 13, verses: 14 },
      { number: 14, verses: 23 },
      { number: 15, verses: 33 },
      { number: 16, verses: 27 },
    ],
  },
  {
    id: '1CO',
    position: 46,
    name: '1 Corinthians',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 31 },
      { number: 2, verses: 16 },
      { number: 3, verses: 23 },
      { number: 4, verses: 21 },
      { number: 5, verses: 13 },
      { number: 6, verses: 20 },
      { number: 7, verses: 40 },
      { number: 8, verses: 13 },
      { number: 9, verses: 27 },
      { number: 10, verses: 33 },
      { number: 11, verses: 34 },
      { number: 12, verses: 31 },
      { number: 13, verses: 13 },
      { number: 14, verses: 40 },
      { number: 15, verses: 58 },
      { number: 16, verses: 24 },
    ],
  },
  {
    id: '2CO',
    position: 47,
    name: '2 Corinthians',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 24 },
      { number: 2, verses: 17 },
      { number: 3, verses: 18 },
      { number: 4, verses: 18 },
      { number: 5, verses: 21 },
      { number: 6, verses: 18 },
      { number: 7, verses: 16 },
      { number: 8, verses: 24 },
      { number: 9, verses: 15 },
      { number: 10, verses: 18 },
      { number: 11, verses: 33 },
      { number: 12, verses: 21 },
      { number: 13, verses: 14 },
    ],
  },
  {
    id: 'GAL',
    position: 48,
    name: 'Galatians',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 24 },
      { number: 2, verses: 21 },
      { number: 3, verses: 29 },
      { number: 4, verses: 31 },
      { number: 5, verses: 26 },
      { number: 6, verses: 18 },
    ],
  },
  {
    id: 'EPH',
    position: 49,
    name: 'Ephesians',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 23 },
      { number: 2, verses: 22 },
      { number: 3, verses: 21 },
      { number: 4, verses: 32 },
      { number: 5, verses: 33 },
      { number: 6, verses: 24 },
    ],
  },
  {
    id: 'PHP',
    position: 50,
    name: 'Philippians',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 30 },
      { number: 2, verses: 30 },
      { number: 3, verses: 21 },
      { number: 4, verses: 23 },
    ],
  },
  {
    id: 'COL',
    position: 51,
    name: 'Colossians',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 29 },
      { number: 2, verses: 23 },
      { number: 3, verses: 25 },
      { number: 4, verses: 18 },
    ],
  },
  {
    id: '1TH',
    position: 52,
    name: '1 Thessalonians',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 10 },
      { number: 2, verses: 20 },
      { number: 3, verses: 13 },
      { number: 4, verses: 18 },
      { number: 5, verses: 28 },
    ],
  },
  {
    id: '2TH',
    position: 53,
    name: '2 Thessalonians',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 12 },
      { number: 2, verses: 17 },
      { number: 3, verses: 18 },
    ],
  },
  {
    id: '1TI',
    position: 54,
    name: '1 Timothy',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 20 },
      { number: 2, verses: 15 },
      { number: 3, verses: 16 },
      { number: 4, verses: 16 },
      { number: 5, verses: 25 },
      { number: 6, verses: 21 },
    ],
  },
  {
    id: '2TI',
    position: 55,
    name: '2 Timothy',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 18 },
      { number: 2, verses: 26 },
      { number: 3, verses: 17 },
      { number: 4, verses: 22 },
    ],
  },
  {
    id: 'TIT',
    position: 56,
    name: 'Titus',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 16 },
      { number: 2, verses: 15 },
      { number: 3, verses: 15 },
    ],
  },
  {
    id: 'PHM',
    position: 57,
    name: 'Philemon',
    testament: 'NT',
    chapters: [{ number: 1, verses: 25 }],
  },
  {
    id: 'HEB',
    position: 58,
    name: 'Hebrews',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 14 },
      { number: 2, verses: 18 },
      { number: 3, verses: 19 },
      { number: 4, verses: 16 },
      { number: 5, verses: 14 },
      { number: 6, verses: 20 },
      { number: 7, verses: 28 },
      { number: 8, verses: 13 },
      { number: 9, verses: 28 },
      { number: 10, verses: 39 },
      { number: 11, verses: 40 },
      { number: 12, verses: 29 },
      { number: 13, verses: 25 },
    ],
  },
  {
    id: 'JAS',
    position: 59,
    name: 'James',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 27 },
      { number: 2, verses: 26 },
      { number: 3, verses: 18 },
      { number: 4, verses: 17 },
      { number: 5, verses: 20 },
    ],
  },
  {
    id: '1PE',
    position: 60,
    name: '1 Peter',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 25 },
      { number: 2, verses: 25 },
      { number: 3, verses: 22 },
      { number: 4, verses: 19 },
      { number: 5, verses: 14 },
    ],
  },
  {
    id: '2PE',
    position: 61,
    name: '2 Peter',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 21 },
      { number: 2, verses: 22 },
      { number: 3, verses: 18 },
    ],
  },
  {
    id: '1JN',
    position: 62,
    name: '1 John',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 10 },
      { number: 2, verses: 29 },
      { number: 3, verses: 24 },
      { number: 4, verses: 21 },
      { number: 5, verses: 21 },
    ],
  },
  {
    id: '2JN',
    position: 63,
    name: '2 John',
    testament: 'NT',
    chapters: [{ number: 1, verses: 13 }],
  },
  {
    id: '3JN',
    position: 64,
    name: '3 John',
    testament: 'NT',
    chapters: [{ number: 1, verses: 14 }],
  },
  {
    id: 'JUD',
    position: 65,
    name: 'Jude',
    testament: 'NT',
    chapters: [{ number: 1, verses: 25 }],
  },
  {
    id: 'REV',
    position: 66,
    name: 'Revelation',
    testament: 'NT',
    chapters: [
      { number: 1, verses: 20 },
      { number: 2, verses: 29 },
      { number: 3, verses: 22 },
      { number: 4, verses: 11 },
      { number: 5, verses: 14 },
      { number: 6, verses: 17 },
      { number: 7, verses: 17 },
      { number: 8, verses: 13 },
      { number: 9, verses: 21 },
      { number: 10, verses: 11 },
      { number: 11, verses: 19 },
      { number: 12, verses: 17 },
      { number: 13, verses: 18 },
      { number: 14, verses: 20 },
      { number: 15, verses: 8 },
      { number: 16, verses: 21 },
      { number: 17, verses: 18 },
      { number: 18, verses: 24 },
      { number: 19, verses: 21 },
      { number: 20, verses: 15 },
      { number: 21, verses: 27 },
      { number: 22, verses: 21 },
    ],
  },
];

const booksById = new Map(BIBLE_BOOKS.map((book) => [book.id, book]));

export function getBookMetadata(bookId: string): BookMetadata | undefined {
  return booksById.get(bookId);
}

export function getBookName(bookId: string): string {
  return getBookMetadata(bookId)?.name ?? bookId;
}

export function buildDisplayReference(
  bookId: string,
  chapter: number,
  verse: number,
  reference: string
): string {
  const book = getBookMetadata(bookId);

  if (!book) {
    return reference;
  }

  return `${book.name} ${chapter}:${verse}`;
}
```

- [ ] **Step 2: Run metadata tests**

Run:

```bash
mise exec -- pnpm test -- book.metadata
```

Expected: PASS.

- [ ] **Step 3: Run formatter on new files**

Run:

```bash
mise exec -- pnpm exec prettier --write src/book/book.types.ts src/book/book.metadata.ts src/book/book.metadata.spec.ts
```

Expected: files are formatted.

## Task 3: Add `GET /books`

**Files:**

- Create: `src/book/book.service.ts`
- Create: `src/book/book.controller.ts`
- Create: `src/book/book.module.ts`
- Create: `src/book/book.service.spec.ts`
- Create: `src/book/book.controller.spec.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Write service test**

Create `src/book/book.service.spec.ts`:

```ts
import { BooksService } from './book.service';

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(() => {
    service = new BooksService();
  });

  it('returns the canonical book catalog', () => {
    const books = service.get();

    expect(books).toHaveLength(66);
    expect(books[0]).toMatchObject({
      id: 'GEN',
      name: 'Genesis',
      testament: 'OT',
      position: 1,
    });
    expect(books[65]).toMatchObject({
      id: 'REV',
      name: 'Revelation',
      testament: 'NT',
      position: 66,
    });
  });

  it('returns chapter and verse metadata', () => {
    const genesis = service.get()[0];

    expect(genesis.chapters).toHaveLength(50);
    expect(genesis.chapters[0]).toEqual({ number: 1, verses: 31 });
    expect(genesis.chapters[49]).toEqual({ number: 50, verses: 26 });
  });
});
```

- [ ] **Step 2: Write controller test**

Create `src/book/book.controller.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { BooksController } from './book.controller';
import { BooksService } from './book.service';

describe('BooksController', () => {
  const books = [
    {
      id: 'GEN',
      name: 'Genesis',
      testament: 'OT',
      position: 1,
      chapters: [{ number: 1, verses: 31 }],
    },
  ];
  const service = {
    get: jest.fn().mockReturnValue(books),
  };

  let controller: BooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: service }],
    }).compile();

    controller = module.get(BooksController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates to BooksService.get', () => {
    expect(controller.get()).toBe(books);
    expect(service.get).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run focused failing tests**

Run:

```bash
mise exec -- pnpm test -- book
```

Expected: FAIL because the service and controller do not exist yet.

- [ ] **Step 4: Implement service**

Create `src/book/book.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

import { BIBLE_BOOKS } from './book.metadata';
import { BookMetadata } from './book.types';

@Injectable()
export class BooksService {
  get(): BookMetadata[] {
    return BIBLE_BOOKS;
  }
}
```

- [ ] **Step 5: Implement controller**

Create `src/book/book.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';

import { BooksService } from './book.service';
import { BookMetadata } from './book.types';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  get(): BookMetadata[] {
    return this.booksService.get();
  }
}
```

- [ ] **Step 6: Implement module**

Create `src/book/book.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { BooksController } from './book.controller';
import { BooksService } from './book.service';

@Module({
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
```

- [ ] **Step 7: Register module**

Modify `src/app.module.ts`:

```ts
import { BooksModule } from './book/book.module';
```

Add `BooksModule` to the `imports` array near the other feature modules:

```ts
    TranslationModule,
    SearchModule,
    VerseModule,
    BooksModule,
```

- [ ] **Step 8: Run focused tests**

Run:

```bash
mise exec -- pnpm test -- book
```

Expected: PASS.

## Task 4: Enrich Search Results

**Files:**

- Modify: `src/search/search.types.ts`
- Modify: `src/search/search.service.ts`
- Modify: `src/search/search.service.spec.ts`

- [ ] **Step 1: Update search result type**

Modify `src/search/search.types.ts`:

```ts
import { PaginatedResponse } from '../types/paginated-response';

export interface SearchResult {
  reference: string;
  displayReference: string;
  translation: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  copyright: string;
}

export type SearchResponse = PaginatedResponse<SearchResult>;
```

- [ ] **Step 2: Update service tests for enriched rows**

Modify `row` in `src/search/search.service.spec.ts` to represent the raw database row:

```ts
const row = {
  reference: '1CO.13.4',
  translation: 'engKJV',
  book: '1CO',
  chapter: 13,
  verse: 4,
  text: 'Charity suffereth long, and is kind',
  copyright: 'King James Version. Public Domain.',
};

const enrichedRow = {
  ...row,
  displayReference: '1 Corinthians 13:4',
  bookName: '1 Corinthians',
};
```

Update the first test expectation:

```ts
      data: [enrichedRow],
```

Add this fallback test:

```ts
it('falls back to machine fields when book metadata is missing', async () => {
  const unknownRow = {
    ...row,
    reference: 'UNKNOWN.1.1',
    book: 'UNKNOWN',
    chapter: 1,
    verse: 1,
  };
  const mock = createDb(1, [unknownRow]);
  const service = await createService(mock.db);

  await expect(
    service.search({
      q: 'love',
      abbreviations: ['engKJV'],
      page: 1,
      limit: 10,
    })
  ).resolves.toMatchObject({
    data: [
      {
        ...unknownRow,
        bookName: 'UNKNOWN',
        displayReference: 'UNKNOWN.1.1',
      },
    ],
  });
});
```

- [ ] **Step 3: Run focused failing search test**

Run:

```bash
mise exec -- pnpm test -- search.service
```

Expected: FAIL because `SearchService` still returns raw rows.

- [ ] **Step 4: Enrich rows in search service**

Modify `src/search/search.service.ts`.

Add import:

```ts
import { buildDisplayReference, getBookName } from '../book/book.metadata';
```

Replace the final `data: rows` return field with:

```ts
      data: rows.map((row) => ({
        ...row,
        displayReference: buildDisplayReference(
          row.book,
          row.chapter,
          row.verse,
          row.reference
        ),
        bookName: getBookName(row.book),
      })),
```

- [ ] **Step 5: Run focused search tests**

Run:

```bash
mise exec -- pnpm test -- search
```

Expected: PASS.

## Task 5: Enrich Verse Comparison Responses

**Files:**

- Modify: `src/verse/verse.types.ts`
- Modify: `src/verse/verse.service.ts`
- Modify: `src/verse/verse.service.spec.ts`

- [ ] **Step 1: Update verse response type**

Modify `src/verse/verse.types.ts`:

```ts
export interface VerseTranslationResult {
  id: string;
  abbreviation: string;
  text: string;
  copyright: string;
}

export interface VerseComparisonResponse {
  reference: string;
  displayReference: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  translations: VerseTranslationResult[];
}
```

- [ ] **Step 2: Update service tests for enriched metadata**

In `src/verse/verse.service.spec.ts`, update the expected resolved object in the matching translations test:

```ts
await expect(
  service.findByReference('JHN.3.16', ['KJV', 'NLT', 'AMP'])
).resolves.toEqual({
  reference: 'JHN.3.16',
  displayReference: 'John 3:16',
  book: 'JHN',
  bookName: 'John',
  chapter: 3,
  verse: 16,
  translations: translationRows,
});
```

Update the no matching abbreviations test:

```ts
await expect(service.findByReference('JHN.3.16', ['ZZZ'])).resolves.toEqual({
  reference: 'JHN.3.16',
  displayReference: 'John 3:16',
  book: 'JHN',
  bookName: 'John',
  chapter: 3,
  verse: 16,
  translations: [],
});
```

Add this fallback test:

```ts
it('falls back to machine fields when book metadata is missing', async () => {
  const unknownReferenceRow = {
    reference: 'UNKNOWN.1.1',
    book: 'UNKNOWN',
    chapter: 1,
    verse: 1,
  };
  const mock = createDb([unknownReferenceRow], []);
  const service = await createService(mock.db);

  await expect(
    service.findByReference('UNKNOWN.1.1', ['KJV'])
  ).resolves.toEqual({
    reference: 'UNKNOWN.1.1',
    displayReference: 'UNKNOWN.1.1',
    book: 'UNKNOWN',
    bookName: 'UNKNOWN',
    chapter: 1,
    verse: 1,
    translations: [],
  });
});
```

- [ ] **Step 3: Run focused failing verse test**

Run:

```bash
mise exec -- pnpm test -- verse.service
```

Expected: FAIL because `VerseService` still returns raw metadata.

- [ ] **Step 4: Enrich comparison response**

Modify `src/verse/verse.service.ts`.

Add import:

```ts
import { buildDisplayReference, getBookName } from '../book/book.metadata';
```

Replace:

```ts
return {
  ...verse,
  translations: translationRows,
};
```

with:

```ts
return {
  ...verse,
  displayReference: buildDisplayReference(
    verse.book,
    verse.chapter,
    verse.verse,
    verse.reference
  ),
  bookName: getBookName(verse.book),
  translations: translationRows,
};
```

- [ ] **Step 5: Run focused verse tests**

Run:

```bash
mise exec -- pnpm test -- verse
```

Expected: PASS.

## Task 6: Verify Integration

**Files:**

- Modify only if verification reveals a concrete issue.

- [ ] **Step 1: Run related test groups**

Run:

```bash
mise exec -- pnpm test -- book search verse
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

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

- [ ] **Step 4: Check changed files**

Run:

```bash
git status --short
```

Expected: shows only the planned files and any formatting updates caused by Prettier.

## Self-Review Notes

- Spec coverage: `GET /books`, translation-agnostic metadata, display fields, unchanged compare contract, fallback behavior, and tests are covered.
- Placeholder scan: no deferred implementation steps are included.
- Type consistency: `bookName` and `displayReference` are added consistently to search and verse response types and service return objects.
- Scope check: implementation stays within books metadata, search response enrichment, and verse response enrichment.
