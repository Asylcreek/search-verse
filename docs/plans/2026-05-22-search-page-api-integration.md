# Search Page API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage mock search experience with live translations, backend search results, and URL-driven pagination.

**Architecture:** The web app uses TanStack Query for browser-side fetching. API calls live in `web/src/lib/api/searchverse.ts`, query helpers live in `web/src/lib/queries/searchverse.ts`, and the search route consumes those helpers while preserving `q`, `page`, and `limit` in the URL.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TanStack Svelte Query, NestJS `/v1` API, `svelte-sonner`, browser `localStorage`.

---

## Important Constraint

Do not make git commits unless the user explicitly asks for commits.

## File Structure

- Modify `web/package.json`: add TanStack Query and devtools dependencies.
- Modify `web/src/routes/+layout.ts`: create the browser-only `QueryClient`.
- Modify `web/src/routes/+layout.svelte`: add `QueryClientProvider` and development-only devtools.
- Create `web/src/lib/api/searchverse.ts`: typed API wrapper for translations and search.
- Create `web/src/lib/queries/query-keys.ts`: stable query key constants.
- Create `web/src/lib/queries/searchverse.ts`: TanStack Query helpers.
- Create `web/src/lib/utils/parsers.ts`: shared parsing helpers for URL parameters.
- Modify `web/src/lib/components/translation-pills.svelte`: fetch live translation options directly and keep selection persistence.
- Modify `web/src/routes/+page.svelte`: replace mock search data with query-backed results and pagination.
- Modify `web/src/lib/mock-data.ts`: remove search-only exports if they become unused; keep compare data.

## Task 1: Add TanStack Query

**Files:**

- Modify: `web/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add dependencies**

Run:

```bash
pnpm add --dir web @tanstack/svelte-query @tanstack/svelte-query-devtools
```

Expected:

```text
dependencies:
  @tanstack/svelte-query
  @tanstack/svelte-query-devtools
```

- [ ] **Step 2: Verify dependency install**

Run:

```bash
pnpm --dir web run check
```

Expected: the command completes with no Svelte or TypeScript errors.

## Task 2: Wire Query Provider

**Files:**

- Modify: `web/src/routes/+layout.ts`
- Modify: `web/src/routes/+layout.svelte`

- [ ] **Step 1: Update layout load**

Replace `web/src/routes/+layout.ts` with:

```ts
import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';

export function load() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 2,
      },
    },
  });

  return { queryClient };
}

export const prerender = true;
export const ssr = false;
```

- [ ] **Step 2: Wrap the app**

In `web/src/routes/+layout.svelte`, import the provider:

```svelte
import {QueryClientProvider} from '@tanstack/svelte-query';
```

Add development-only devtools state:

```svelte
let SvelteQueryDevtools = $state<
	typeof import('@tanstack/svelte-query-devtools').SvelteQueryDevtools | undefined
>(undefined);

if (import.meta.env.DEV) {
	import('@tanstack/svelte-query-devtools').then((mod) => {
		SvelteQueryDevtools = mod.SvelteQueryDevtools;
	});
}
```

Change props to include route data:

```svelte
let {(data, children)} = $props();
```

Wrap the existing top-level layout markup inside `QueryClientProvider`:

```svelte
<QueryClientProvider client={data.queryClient}>
  <div
    class="min-h-screen bg-stone-50 text-stone-950 dark:bg-stone-950 dark:text-stone-50"
  >
    <header
      class="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95"
    >
      <div
        class="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5"
      >
        <a
          href={resolve('/')}
          class="font-serif text-2xl font-semibold tracking-normal"
          >SearchVerse</a
        >
        <RouteNav />
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl px-6 pb-16">
      {@render children()}
    </main>
  </div>

  <ThemeToggle />
  <Toaster richColors position="top-center" />

  {#if import.meta.env.DEV && SvelteQueryDevtools}
    <SvelteQueryDevtools />
  {/if}
</QueryClientProvider>
```

- [ ] **Step 3: Check Svelte syntax**

Run:

```bash
pnpm --dir web run check
```

Expected: no errors.

## Task 3: Add SearchVerse API Client

**Files:**

- Create: `web/src/lib/api/searchverse.ts`

- [ ] **Step 1: Create the API client**

Create `web/src/lib/api/searchverse.ts`:

```ts
import { PUBLIC_API_BASE_URL } from '$env/static/public';

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
  const baseUrl = PUBLIC_API_BASE_URL.replace(/\/$/, '');
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

export function searchVerses(params: SearchVersesParams) {
  const searchParams = new URLSearchParams({
    q: params.q,
    abbreviations: params.abbreviations.join(','),
    page: String(params.page),
    limit: String(params.limit),
  });

  return fetchJson<PaginatedResponse<SearchResult>>(
    apiUrl('/search', searchParams)
  );
}
```

- [ ] **Step 2: Check types**

Run:

```bash
pnpm --dir web run check
```

Expected: no errors.

## Task 4: Add Query Helpers

**Files:**

- Create: `web/src/lib/queries/query-keys.ts`
- Create: `web/src/lib/queries/searchverse.ts`

- [ ] **Step 1: Create query keys**

Create `web/src/lib/queries/query-keys.ts`:

```ts
export const queryKeys = {
  GET_TRANSLATIONS: 'GET_TRANSLATIONS',
  GET_SEARCH: 'GET_SEARCH',
} as const;
```

- [ ] **Step 2: Create query helpers**

Create `web/src/lib/queries/searchverse.ts`:

```ts
import { fetchTranslations, searchVerses } from '$lib/api/searchverse';
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
        queryKeys.GET_SEARCH,
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
```

- [ ] **Step 3: Check types**

Run:

```bash
pnpm --dir web run check
```

Expected: no errors.

## Task 5: Add Parser Utility

**Files:**

- Create: `web/src/lib/utils/parsers.ts`

- [ ] **Step 1: Create parser helper**

Create `web/src/lib/utils/parsers.ts`:

```ts
export function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
```

- [ ] **Step 2: Check types**

Run:

```bash
pnpm --dir web run check
```

Expected: no errors.

## Task 6: Update Translation Pills

**Files:**

- Modify: `web/src/lib/components/translation-pills.svelte`

- [ ] **Step 1: Replace mock import with query helper**

Remove:

```svelte
import {translations} from '$lib/mock-data';
```

Add:

```svelte
import {createTranslationsQuery} from '$lib/queries/searchverse';
```

- [ ] **Step 2: Keep only the change callback prop**

Use these props:

```svelte
let { onChange }: { onChange?: (selection: string[]) => void } = $props();
```

- [ ] **Step 3: Create the translations query inside the component**

Add after derived selection state:

```svelte
const translationsQuery = createTranslationsQuery();
```

- [ ] **Step 4: Add loading and error states before the pills**

Wrap the pill list with the query states:

```svelte
{#if $translationsQuery.isLoading}
  <div class="text-center text-sm text-stone-500 dark:text-stone-400">
    Loading translations...
  </div>
{:else if $translationsQuery.isError}
  <div class="text-center text-sm text-red-600 dark:text-red-400">
    Translations failed to load.
  </div>
{:else}
  <div
    class="mx-auto flex w-full max-w-2xl flex-wrap justify-center gap-2"
    aria-label="Translations"
  >
    {#each $translationsQuery.data ?? [] as translation (translation.abbreviation)}
      {@const active = selectedValues.includes(translation.abbreviation)}
      <button
        type="button"
        class={cn(
          'border px-3 py-2 text-xs uppercase transition',
          active
            ? 'border-stone-800 bg-stone-800 text-stone-50 dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950'
            : 'border-stone-300 bg-stone-100 text-stone-700 hover:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
        )}
        aria-pressed={active}
        title={translation.name}
        onclick={() => toggle(translation.abbreviation)}
      >
        {translation.abbreviation}
      </button>
    {/each}
  </div>
{/if}
```

- [ ] **Step 5: Keep persistence behavior**

Keep the existing `onMount`, `toggle`, `readSelectedTranslations`, and `writeSelectedTranslations` behavior.

The `{#each}` block should iterate over query data:

```svelte
{#each $translationsQuery.data ?? [] as translation (translation.abbreviation)}
```

- [ ] **Step 6: Check component**

Run:

```bash
pnpm --dir web run check
```

Expected: no errors.

## Task 7: Integrate Search Page

**Files:**

- Modify: `web/src/routes/+page.svelte`

- [ ] **Step 1: Replace mock imports**

Remove:

```svelte
import {searchResults} from '$lib/mock-data';
```

Add:

```svelte
import { page as pageState } from '$app/state';
import { createSearchQuery } from '$lib/queries/searchverse';
import { parsePositiveInteger } from '$lib/utils/parsers';
```

- [ ] **Step 2: Add URL parsing helpers**

Add:

```svelte
function currentSearchParams() {
	return pageState.url.searchParams;
}

function currentSubmittedQuery() {
	return currentSearchParams().get('q')?.trim() ?? '';
}

function currentPage() {
	return parsePositiveInteger(currentSearchParams().get('page'), 1);
}

function currentLimit() {
	return parsePositiveInteger(currentSearchParams().get('limit'), 20);
}
```

- [ ] **Step 3: Initialize state and queries**

Use:

```svelte
let query = $state(currentSubmittedQuery());
let selectedTranslations = $state<string[]>([]);

const searchQuery = createSearchQuery({
	q: currentSubmittedQuery,
	abbreviations: () => selectedTranslations,
	page: currentPage,
	limit: currentLimit
});
```

- [ ] **Step 4: Sync input from URL**

Add:

```svelte
$effect(() => {
	query = currentSubmittedQuery();
});
```

- [ ] **Step 5: Update selected translations behavior**

Replace `updateSelectedTranslations` with:

```svelte
function updateSelectedTranslations(selection: string[]) {
	selectedTranslations = selection;

	if (!currentSubmittedQuery()) {
		return;
	}

	const params = new URLSearchParams(currentSearchParams());
	params.set('page', '1');
	replaceState(resolve(`/?${params.toString()}`), {});
}
```

- [ ] **Step 6: Update search submission**

Replace `search()` with:

```svelte
function search() {
	const trimmedQuery = query.trim();

	if (!trimmedQuery) {
		toast.error('Enter a search query.');
		return;
	}

	if (selectedTranslations.length === 0) {
		toast.error('Select at least one translation.');
		return;
	}

	const params = new URLSearchParams({
		q: trimmedQuery,
		page: '1',
		limit: String(currentLimit())
	});

	replaceState(resolve(`/?${params.toString()}`), {});
}
```

- [ ] **Step 7: Add pagination helpers**

Add:

```svelte
function goToPage(page: number) {
	const params = new URLSearchParams(currentSearchParams());
	params.set('page', String(page));
	params.set('limit', String(currentLimit()));

	replaceState(resolve(`/?${params.toString()}`), {});
}
```

- [ ] **Step 8: Keep the translation callback**

Keep the existing component usage with only the selection callback:

```svelte
<TranslationPills onChange={updateSelectedTranslations} />
```

- [ ] **Step 9: Replace result markup**

Replace the mock result count and `{#each searchResults ...}` with:

```svelte
{#if currentSubmittedQuery() && selectedTranslations.length > 0}
  {#if $searchQuery.isLoading}
    <div class="text-center text-sm text-stone-500 dark:text-stone-400">
      Searching...
    </div>
  {:else if $searchQuery.isError}
    <div
      class="grid justify-items-center gap-3 text-center text-sm text-stone-600 dark:text-stone-300"
    >
      <div>Search failed.</div>
      <button
        type="button"
        class="border border-stone-300 px-3 py-2 text-xs uppercase dark:border-stone-700"
        onclick={() => $searchQuery.refetch()}
      >
        Retry
      </button>
    </div>
  {:else if $searchQuery.data}
    <div
      class="text-center text-xs text-stone-500 uppercase dark:text-stone-400"
    >
      {$searchQuery.data.totalDocuments} results
    </div>

    {#if $searchQuery.data.data.length === 0}
      <div class="text-center text-sm text-stone-500 dark:text-stone-400">
        No results found.
      </div>
    {:else}
      <div class="grid gap-4">
        {#each $searchQuery.data.data as result (result.reference + result.translation)}
          <VerseResultCard {result} />
        {/each}
      </div>
    {/if}

    {#if $searchQuery.data.totalPages > 1}
      <nav
        class="flex items-center justify-center gap-3"
        aria-label="Search results pages"
      >
        <button
          type="button"
          class="border border-stone-300 px-3 py-2 text-xs uppercase disabled:opacity-40 dark:border-stone-700"
          disabled={$searchQuery.data.currentPage <= 1}
          onclick={() => goToPage($searchQuery.data.currentPage - 1)}
        >
          Previous
        </button>
        <div class="text-xs text-stone-500 uppercase dark:text-stone-400">
          Page {$searchQuery.data.currentPage} of {$searchQuery.data.totalPages}
        </div>
        <button
          type="button"
          class="border border-stone-300 px-3 py-2 text-xs uppercase disabled:opacity-40 dark:border-stone-700"
          disabled={$searchQuery.data.currentPage >=
            $searchQuery.data.totalPages}
          onclick={() => goToPage($searchQuery.data.currentPage + 1)}
        >
          Next
        </button>
      </nav>
    {/if}
  {/if}
{/if}
```

- [ ] **Step 10: Check page**

Run:

```bash
pnpm --dir web run check
```

Expected: no errors.

## Task 8: Clean Mock Data Usage

**Files:**

- Modify: `web/src/lib/mock-data.ts`
- Inspect: `web/src/routes/compare/+page.svelte`
- Inspect: `web/src/lib/components/verse-picker.svelte`

- [ ] **Step 1: Identify remaining mock-data imports**

Run:

```bash
rg "mock-data|searchResults|translations" web/src
```

Expected: `compareResults`, `books`, `chapters`, and `verses` may still be used by compare-related files. `searchResults` should no longer be used.

- [ ] **Step 2: Remove unused search mock exports**

If `searchResults`, `TranslationOption`, or `translations` are unused, remove those exports from `web/src/lib/mock-data.ts`.

Keep compare-related exports required by `web/src/routes/compare/+page.svelte` and `web/src/lib/components/verse-picker.svelte`.

- [ ] **Step 3: Check**

Run:

```bash
pnpm --dir web run check
```

Expected: no errors.

## Task 9: Static And Runtime Verification

**Files:**

- No required file edits.

- [ ] **Step 1: Run web checks**

Run:

```bash
pnpm --dir web run check
```

Expected: no errors.

- [ ] **Step 2: Run web lint**

Run:

```bash
pnpm --dir web run lint
```

Expected: no errors.

- [ ] **Step 3: Run Svelte autofixer on edited components**

Run:

```bash
npx @sveltejs/mcp svelte-autofixer web/src/routes/+layout.svelte --svelte-version 5
npx @sveltejs/mcp svelte-autofixer web/src/routes/+page.svelte --svelte-version 5
npx @sveltejs/mcp svelte-autofixer web/src/lib/components/translation-pills.svelte --svelte-version 5
```

Expected: no required fixes remain.

- [ ] **Step 4: Start API and web app**

Run API in one terminal:

```bash
pnpm run start:dev
```

Run web in another terminal:

```bash
PUBLIC_API_BASE_URL=http://localhost:3000 pnpm --dir web run dev
```

Expected: API and web app both start.

- [ ] **Step 5: Verify search in browser**

Manual checks:

- Open the web dev server.
- Select at least one translation.
- Search for `love`.
- Confirm the browser network request is `/v1/search?q=love&abbreviations=...&page=1&limit=20`.
- Confirm backend results render.
- Click next page if available.
- Confirm URL updates to `?q=love&page=2&limit=20`.
- Refresh the page and confirm the query, page, limit, and selected translations restore.
- Change a selected translation and confirm page resets to `1`.
- Visit `/compare` and confirm it still renders with mock compare data.

## Self-Review Checklist

- Spec coverage: live translations, URL state, backend search, pagination, devtools, and compare mock preservation are all assigned to tasks.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `Translation`, `SearchResult`, `PaginatedResponse`, and query helper signatures are defined before use.
