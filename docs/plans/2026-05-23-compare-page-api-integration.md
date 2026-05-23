# Compare Page API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the compare page's mock data with live backend books and verse comparison APIs.

**Architecture:** Extend the existing frontend API and TanStack Query layers, then update the compare route to consume those query helpers. `VersePicker` becomes a catalog-driven component that starts empty and writes valid URL params; the compare route derives the canonical reference from those params and the cached books query.

**Tech Stack:** SvelteKit, Svelte 5 runes, TanStack Svelte Query, TypeScript, existing Nest REST API.

**Design Doc:** `docs/specs/2026-05-23-compare-page-api-integration-design.md`

**Commit Policy:** Do not commit unless the user explicitly asks.

---

## File Structure

- Modify `web/src/lib/api/searchverse.ts`: add book catalog and compare response types plus `fetchBooks()` and `compareVerse()`.
- Modify `web/src/lib/queries/query-keys.ts`: add query key constants for books and compare.
- Modify `web/src/lib/queries/searchverse.ts`: add `createBooksQuery()` and `createCompareQuery()`.
- Modify `web/src/lib/components/verse-picker.svelte`: replace mock catalog imports with its own books query and URL-backed picker controls.
- Modify `web/src/routes/compare/+page.svelte`: derive selection from URL params plus books query, then wire translation selection, compare query, and result UI states.
- Modify `web/src/lib/mock-data.ts`: remove compare-only mock exports if they become unused.

## Task 1: Extend API Client Types And Functions

**Files:**

- Modify: `web/src/lib/api/searchverse.ts`

- [ ] **Step 1: Update API types and functions**

Replace the file with:

```ts
import { env } from '$env/dynamic/public';

export interface ApiResponse<T> {
  status: 'success';
  data: T;
}

export interface Translation {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  copyright: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookChapterMetadata {
  number: number;
  verses: number;
}

export interface BookMetadata {
  id: string;
  name: string;
  testament: 'OT' | 'NT';
  position: number;
  chapters: BookChapterMetadata[];
}

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

export interface VerseTranslationResult {
  id: string;
  abbreviation: string;
  text: string;
  copyright: string;
}

export interface VerseComparison {
  reference: string;
  displayReference: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  translations: VerseTranslationResult[];
}

export interface PaginatedResponse<T> {
  totalDocuments: number;
  totalPages: number;
  currentPage: number;
  numOfResults: number;
  data: T[];
}

export interface SearchVersesParams {
  q: string;
  abbreviations: string[];
  page: number;
  limit: number;
}

export interface CompareVerseParams {
  reference: string;
  translations: string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function apiUrl(path: string, searchParams?: URLSearchParams) {
  const baseUrl = (env.PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  const query = searchParams?.toString();

  return `${baseUrl}/v1${path}${query ? `?${query}` : ''}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.message === 'string'
        ? body.message
        : `Request failed with ${response.status}`;

    throw new ApiError(message, response.status);
  }

  const body = (await response.json()) as ApiResponse<T>;

  return body.data;
}

export function fetchTranslations() {
  return fetchJson<Translation[]>(apiUrl('/translations'));
}

export function fetchBooks() {
  return fetchJson<BookMetadata[]>(apiUrl('/books'));
}

export function searchVerses(params: SearchVersesParams) {
  const searchParams = new URLSearchParams({
    q: params.q,
    abbreviations: params.abbreviations.join(','),
    page: String(params.page),
  });

  return fetchJson<PaginatedResponse<SearchResult>>(
    apiUrl('/search', searchParams)
  );
}

export function compareVerse(params: CompareVerseParams) {
  const searchParams = new URLSearchParams({
    translations: params.translations.join(','),
  });

  return fetchJson<VerseComparison>(
    apiUrl(`/verses/${encodeURIComponent(params.reference)}`, searchParams)
  );
}
```

- [ ] **Step 2: Run static check**

Run:

```bash
pnpm --dir web run check
```

Expected: PASS. If it fails, the failure should be unrelated to compare route wiring because these exports are not consumed yet.

## Task 2: Add Compare Query Helpers

**Files:**

- Modify: `web/src/lib/queries/query-keys.ts`
- Modify: `web/src/lib/queries/searchverse.ts`

- [ ] **Step 1: Update query keys**

Replace `web/src/lib/queries/query-keys.ts` with:

```ts
export const queryKeys = {
  GET_TRANSLATIONS: 'GET_TRANSLATIONS',
  GET_BOOKS: 'GET_BOOKS',
  SEARCH: 'SEARCH',
  COMPARE: 'COMPARE',
} as const;
```

- [ ] **Step 2: Update query helper imports and functions**

Replace `web/src/lib/queries/searchverse.ts` with:

```ts
import {
  compareVerse,
  fetchBooks,
  fetchTranslations,
  searchVerses,
} from '$lib/api/searchverse';
import { createQuery } from '@tanstack/svelte-query';

import { queryKeys } from './query-keys';

export function normalizeAbbreviations(abbreviations: string[]) {
  return [
    ...new Set(abbreviations.map((value) => value.trim()).filter(Boolean)),
  ].sort();
}

export function createTranslationsQuery() {
  return createQuery(() => ({
    queryKey: [queryKeys.GET_TRANSLATIONS],
    queryFn: fetchTranslations,
  }));
}

export function createBooksQuery() {
  return createQuery(() => ({
    queryKey: [queryKeys.GET_BOOKS],
    queryFn: fetchBooks,
  }));
}

export interface SearchQueryInputs {
  q: () => string;
  abbreviations: () => string[];
  page: () => number;
  limit: () => number;
}

export function createSearchQuery(inputs: SearchQueryInputs) {
  return createQuery(() => {
    const q = inputs.q().trim();
    const normalizedAbbreviations = normalizeAbbreviations(
      inputs.abbreviations()
    );

    return {
      queryKey: [
        queryKeys.SEARCH,
        q,
        normalizedAbbreviations,
        inputs.page(),
        inputs.limit(),
      ],
      queryFn: () =>
        searchVerses({
          q,
          abbreviations: normalizedAbbreviations,
          page: inputs.page(),
          limit: inputs.limit(),
        }),
      enabled: () => q.length > 0 && normalizedAbbreviations.length > 0,
    };
  });
}

export interface CompareQueryInputs {
  reference: () => string;
  abbreviations: () => string[];
}

export function createCompareQuery(inputs: CompareQueryInputs) {
  return createQuery(() => {
    const reference = inputs.reference().trim();
    const normalizedAbbreviations = normalizeAbbreviations(
      inputs.abbreviations()
    );

    return {
      queryKey: [queryKeys.COMPARE, reference, normalizedAbbreviations],
      queryFn: () =>
        compareVerse({
          reference,
          translations: normalizedAbbreviations,
        }),
      enabled: () => reference.length > 0 && normalizedAbbreviations.length > 0,
    };
  });
}
```

- [ ] **Step 3: Run static check**

Run:

```bash
pnpm --dir web run check
```

Expected: PASS.

## Task 3: Convert Verse Picker To URL-Backed Backend Catalog Data

**Files:**

- Modify: `web/src/lib/components/verse-picker.svelte`

- [ ] **Step 1: Replace the picker component**

Replace `web/src/lib/components/verse-picker.svelte` with:

`chapter` and `verse` use `0` as the empty URL state. A default of `1` would make the empty `/compare` route look partly selected, which conflicts with the approved empty first load. The `bookSearch`, `chapterSearch`, and `verseSearch` fields are only the combobox filter text required by the existing `Select` component; selected values come from `searchParams`.

```svelte
<script lang="ts">
  import { Select, SelectItem } from '$lib/components/ui/select';
  import { createBooksQuery } from '$lib/queries/searchverse';
  import { createSearchParamsSchema, useSearchParams } from 'runed/kit';

  export type VersePickerSelection = {
    bookId: string;
    bookName: string;
    chapter: number;
    verse: number;
    reference: string;
  };

  let {
    onChange,
  }: {
    onChange?: (selection: VersePickerSelection | null) => void;
  } = $props();

  const searchParams = useSearchParams(
    createSearchParamsSchema({
      book: { type: 'string', default: '' },
      chapter: { type: 'number', default: 0 },
      verse: { type: 'number', default: 0 },
    }),
    { noScroll: true, pushHistory: false }
  );
  const booksQuery = createBooksQuery();

  let bookSearch = $state('');
  let chapterSearch = $state('');
  let verseSearch = $state('');

  const books = $derived(booksQuery.data ?? []);
  const selectedBook = $derived(
    books.find((option) => option.name === searchParams.book)
  );
  const selectedChapter = $derived(
    selectedBook?.chapters.find(
      (option) => option.number === searchParams.chapter
    )
  );
  const bookItems = $derived(
    books.map((option) => ({ value: option.name, label: option.name }))
  );
  const chapterOptions = $derived(
    selectedBook?.chapters.map((option) => String(option.number)) ?? []
  );
  const verseOptions = $derived(
    selectedChapter
      ? Array.from({ length: selectedChapter.verses }, (_, index) =>
          String(index + 1)
        )
      : []
  );
  const chapterItems = $derived(
    chapterOptions.map((option) => ({ value: option, label: option }))
  );
  const verseItems = $derived(
    verseOptions.map((option) => ({ value: option, label: option }))
  );
  const filteredBooks = $derived(
    filterOptions(
      books.map((option) => option.name),
      bookSearch
    )
  );
  const filteredChapters = $derived(
    filterOptions(chapterOptions, chapterSearch)
  );
  const filteredVerses = $derived(filterOptions(verseOptions, verseSearch));
  const chapterValue = $derived(
    searchParams.chapter > 0 ? String(searchParams.chapter) : ''
  );
  const verseValue = $derived(
    searchParams.verse > 0 ? String(searchParams.verse) : ''
  );

  $effect(() => {
    onChange?.(currentSelection());
  });

  function filterOptions(options: string[], search: string) {
    const query = search.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(query));
  }

  function currentSelection(): VersePickerSelection | null {
    if (!selectedBook || !selectedChapter || searchParams.verse < 1) {
      return null;
    }

    if (searchParams.verse > selectedChapter.verses) {
      return null;
    }

    return {
      bookId: selectedBook.id,
      bookName: selectedBook.name,
      chapter: selectedChapter.number,
      verse: searchParams.verse,
      reference: `${selectedBook.id}.${selectedChapter.number}.${searchParams.verse}`,
    };
  }

  function selectBook(value: string) {
    searchParams.update({ book: value, chapter: 0, verse: 0 });
    bookSearch = '';
    chapterSearch = '';
    verseSearch = '';
  }

  function selectChapter(value: string) {
    searchParams.update({
      book: searchParams.book,
      chapter: Number(value),
      verse: 0,
    });
    chapterSearch = '';
    verseSearch = '';
  }

  function selectVerse(value: string) {
    searchParams.update({
      book: searchParams.book,
      chapter: searchParams.chapter,
      verse: Number(value),
    });
    verseSearch = '';
  }
</script>

{#if booksQuery.isLoading}
  <div class="text-center text-sm text-stone-500 dark:text-stone-400">
    Loading books...
  </div>
{:else if booksQuery.isError}
  <div
    class="grid justify-items-center gap-3 text-center text-sm text-stone-600 dark:text-stone-300"
  >
    <div>Books failed to load.</div>
    <button
      type="button"
      class="border border-stone-300 px-3 py-2 text-xs uppercase dark:border-stone-700"
      onclick={() => booksQuery.refetch()}
    >
      Retry
    </button>
  </div>
{:else}
  <div
    class="mx-auto grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_8rem]"
  >
    <div class="grid gap-2">
      <label
        for="book-combobox"
        class="cursor-pointer text-xs text-stone-500 uppercase dark:text-stone-400"
      >
        Book
      </label>
      <Select
        type="single"
        value={searchParams.book}
        inputValue={bookSearch || searchParams.book}
        allowDeselect={false}
        items={bookItems}
        bind:search={bookSearch}
        onValueChange={(value) => selectBook(value)}
        onOpenChangeComplete={(open) => {
          if (!open) bookSearch = '';
        }}
      >
        {#snippet input({ props })}
          <input
            {...props}
            id="book-combobox"
            placeholder="Book"
            class="w-full border-2 border-stone-950 bg-white px-4 py-3 pr-10 font-serif text-base text-stone-950 outline-none placeholder:text-stone-500 dark:border-stone-50 dark:bg-stone-900 dark:text-stone-50"
          />
        {/snippet}
        {#each filteredBooks as option (option)}
          <SelectItem
            value={option}
            label={option}
            itemClass={option === searchParams.book ? 'font-semibold' : ''}
          />
        {/each}
      </Select>
    </div>

    <div class="grid gap-2">
      <label
        for="chapter-combobox"
        class="cursor-pointer text-xs text-stone-500 uppercase dark:text-stone-400"
      >
        Chapter
      </label>
      <Select
        type="single"
        value={chapterValue}
        inputValue={chapterSearch || chapterValue}
        allowDeselect={false}
        items={chapterItems}
        bind:search={chapterSearch}
        onValueChange={(value) => selectChapter(value)}
        onOpenChangeComplete={(open) => {
          if (!open) chapterSearch = '';
        }}
      >
        {#snippet input({ props })}
          <input
            {...props}
            id="chapter-combobox"
            placeholder="Chapter"
            disabled={!selectedBook}
            class="w-full border-2 border-stone-950 bg-white px-4 py-3 pr-10 font-serif text-base text-stone-950 outline-none placeholder:text-stone-500 disabled:opacity-50 dark:border-stone-50 dark:bg-stone-900 dark:text-stone-50"
          />
        {/snippet}
        {#each filteredChapters as option (option)}
          <SelectItem
            value={option}
            label={option}
            itemClass={option === chapterValue ? 'font-semibold' : ''}
          />
        {/each}
      </Select>
    </div>

    <div class="grid gap-2">
      <label
        for="verse-combobox"
        class="cursor-pointer text-xs text-stone-500 uppercase dark:text-stone-400"
      >
        Verse
      </label>
      <Select
        type="single"
        value={verseValue}
        inputValue={verseSearch || verseValue}
        allowDeselect={false}
        items={verseItems}
        bind:search={verseSearch}
        onValueChange={(value) => selectVerse(value)}
        onOpenChangeComplete={(open) => {
          if (!open) verseSearch = '';
        }}
      >
        {#snippet input({ props })}
          <input
            {...props}
            id="verse-combobox"
            placeholder="Verse"
            disabled={!selectedChapter}
            class="w-full border-2 border-stone-950 bg-white px-4 py-3 pr-10 font-serif text-base text-stone-950 outline-none placeholder:text-stone-500 disabled:opacity-50 dark:border-stone-50 dark:bg-stone-900 dark:text-stone-50"
          />
        {/snippet}
        {#each filteredVerses as option (option)}
          <SelectItem
            value={option}
            label={option}
            itemClass={option === verseValue ? 'font-semibold' : ''}
          />
        {/each}
      </Select>
    </div>
  </div>
  <span class="sr-only">Choose a verse</span>
{/if}
```

- [ ] **Step 2: Run the Svelte autofixer**

Run:

```bash
npx @sveltejs/mcp svelte-autofixer web/src/lib/components/verse-picker.svelte --svelte-version 5
```

Expected: no blocking Svelte issues. Apply any concrete fixes it reports.

- [ ] **Step 3: Run static check**

Run:

```bash
pnpm --dir web run check
```

Expected: PASS.

## Task 4: Wire Compare Route To Picker Selection And Compare API

**Files:**

- Modify: `web/src/routes/compare/+page.svelte`

- [ ] **Step 1: Replace the compare route**

Replace `web/src/routes/compare/+page.svelte` with:

```svelte
<script lang="ts">
  import { ApiError } from '$lib/api/searchverse';
  import TranslationPills from '$lib/components/translation-pills.svelte';
  import VersePicker, {
    type VersePickerSelection,
  } from '$lib/components/verse-picker.svelte';
  import VerseResultCard from '$lib/components/verse-result-card.svelte';
  import { createCompareQuery } from '$lib/queries/searchverse';
  import { toast } from 'svelte-sonner';

  let selectedTranslations = $state<string[]>([]);
  let selectedVerse = $state<VersePickerSelection | null>(null);
  let warnedForReference = $state('');

  const compareQuery = createCompareQuery({
    reference: () => selectedVerse?.reference ?? '',
    abbreviations: () => selectedTranslations,
  });

  function updateSelectedTranslations(selection: string[]) {
    selectedTranslations = selection;
    warnForMissingTranslations();
  }

  function updateVerse(selection: VersePickerSelection | null) {
    selectedVerse = selection;
    warnForMissingTranslations();
  }

  function warnForMissingTranslations() {
    if (!selectedVerse || selectedTranslations.length > 0) {
      return;
    }

    if (warnedForReference === selectedVerse.reference) {
      return;
    }

    warnedForReference = selectedVerse.reference;
    toast.error('Select at least one translation.');
  }

  function compareErrorMessage(error: Error) {
    if (error instanceof ApiError && error.status === 404) {
      return 'Verse not found.';
    }

    return 'Compare failed.';
  }
</script>

<section class="grid gap-6 pt-10">
  <div class="mx-auto max-w-2xl text-center">
    <h1
      class="m-0 font-serif text-4xl leading-tight font-semibold tracking-normal text-stone-950 dark:text-stone-50"
    >
      Compare one verse across various translations.
    </h1>
  </div>

  <VersePicker onChange={updateVerse} />
  <TranslationPills onChange={updateSelectedTranslations} />

  {#if !selectedVerse}
    <div
      class="flex h-80 w-full flex-col justify-center text-center text-sm text-stone-500 dark:text-stone-400"
    >
      Choose a verse to compare.
    </div>
  {:else if selectedTranslations.length === 0}
    <div
      class="flex h-80 w-full flex-col justify-center text-center text-sm text-stone-500 dark:text-stone-400"
    >
      Select at least one translation.
    </div>
  {:else if compareQuery.isLoading}
    <div class="text-center text-sm text-stone-500 dark:text-stone-400">
      Comparing...
    </div>
  {:else if compareQuery.isError}
    <div
      class="grid justify-items-center gap-3 text-center text-sm text-stone-600 dark:text-stone-300"
    >
      <div>{compareErrorMessage(compareQuery.error)}</div>
      <button
        type="button"
        class="border border-stone-300 px-3 py-2 text-xs uppercase dark:border-stone-700"
        onclick={() => compareQuery.refetch()}
      >
        Retry
      </button>
    </div>
  {:else if compareQuery.data}
    <div
      class="text-center text-xs text-stone-500 uppercase dark:text-stone-400"
    >
      {compareQuery.data.displayReference}
    </div>

    {#if compareQuery.data.translations.length === 0}
      <div class="text-center text-sm text-stone-500 dark:text-stone-400">
        No selected translations have this verse.
      </div>
    {:else}
      <div class="grid gap-4">
        {#each compareQuery.data.translations as translation (translation.abbreviation)}
          {@const result = {
            text: translation.text,
            translation: translation.abbreviation,
            copyright: translation.copyright,
          }}
          <VerseResultCard {result} showReference={false} />
        {/each}
      </div>
    {/if}
  {/if}
</section>
```

- [ ] **Step 2: Run the Svelte autofixer**

Run:

```bash
npx @sveltejs/mcp svelte-autofixer web/src/routes/compare/+page.svelte --svelte-version 5
```

Expected: no blocking Svelte issues. Apply any concrete fixes it reports.

- [ ] **Step 3: Run static check**

Run:

```bash
pnpm --dir web run check
```

Expected: PASS.

## Task 5: Remove Unused Compare Mock Data

**Files:**

- Modify: `web/src/lib/mock-data.ts`

- [ ] **Step 1: Check mock-data consumers**

Run:

```bash
rg "compareResults|books|chapters|verses" web/src
```

Expected: no `/compare` imports from `mock-data.ts` after Task 4. If any remaining imports are only from `web/src/lib/mock-data.ts` itself, remove the unused exports.

- [ ] **Step 2: Replace mock-data with only still-used exports**

If no exports remain used, replace `web/src/lib/mock-data.ts` with:

```ts
export interface VerseResult {
  reference?: string;
  text: string;
  translation: string;
  testament?: string;
  copyright: string;
  displayReference?: string;
}
```

- [ ] **Step 3: Run static check**

Run:

```bash
pnpm --dir web run check
```

Expected: PASS.

## Task 6: Final Verification

**Files:**

- Verify: `web/src/lib/api/searchverse.ts`
- Verify: `web/src/lib/queries/query-keys.ts`
- Verify: `web/src/lib/queries/searchverse.ts`
- Verify: `web/src/lib/components/verse-picker.svelte`
- Verify: `web/src/routes/compare/+page.svelte`
- Verify: `web/src/lib/mock-data.ts`

- [ ] **Step 1: Run frontend checks**

Run:

```bash
pnpm --dir web run check
pnpm --dir web run lint
```

Expected: both PASS.

- [ ] **Step 2: Run Svelte autofixer on changed Svelte files**

Run:

```bash
npx @sveltejs/mcp svelte-autofixer web/src/lib/components/verse-picker.svelte --svelte-version 5
npx @sveltejs/mcp svelte-autofixer web/src/routes/compare/+page.svelte --svelte-version 5
```

Expected: no blocking Svelte issues.

- [ ] **Step 3: Start the frontend dev server**

Run:

```bash
pnpm --dir web run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 4: Runtime browser verification**

Open the local URL in the in-app browser and verify:

- `/compare` starts with no selected book/chapter/verse.
- `/compare?book=John&chapter=3&verse=16` hydrates the picker after books load.
- Selecting a verse updates the URL with display book name, chapter, and verse.
- The compare request uses a canonical reference like `JHN.3.16`.
- The compare request includes selected translations in the `translations` query parameter.
- Changing selected translations refetches the current valid comparison.
- A response with `translations: []` renders `No selected translations have this verse.`

- [ ] **Step 5: Inspect git status**

Run:

```bash
git status --short
```

Expected: changes are limited to the compare API integration spec, this plan, and the frontend files listed above. Do not commit unless the user explicitly requests it.

## Self-Review

- Spec coverage: the plan covers empty first load, URL hydration, `GET /v1/books`, canonical reference construction, `GET /v1/verses/:reference`, normalized translation query keys, empty translation results, error states, and runtime verification.
- Placeholder scan: no incomplete implementation steps remain.
- Type consistency: `BookMetadata`, `VerseComparison`, and `VersePickerSelection` names and properties match across API, query, component, and route tasks.
