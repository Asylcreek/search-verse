# Compare Page API Integration Design

## Goal

Integrate the `/compare` frontend route with the backend compare API.

This scope replaces the compare page's mock verse results and mock book/chapter/verse options with live backend data.

## Context

The backend compare endpoint already exists:

```text
GET /v1/verses/:reference?translations=KJV,NLT
```

Successful responses are wrapped by the Nest response interceptor:

```ts
{ status: 'success', data: ... }
```

The backend book catalog also exists:

```text
GET /v1/books
```

The frontend already uses browser-side TanStack Query integration for the search page. Compare should follow the same structure:

- `web/src/lib/api/searchverse.ts` owns typed fetch functions and API error handling.
- `web/src/lib/queries/query-keys.ts` owns query key constants.
- `web/src/lib/queries/searchverse.ts` owns query helpers.
- Route components consume query helpers instead of calling `fetch` directly.

## User Decisions

- `/compare` starts empty. It does not default to John 3:16.
- Valid URL params hydrate the picker.
- The picker uses `GET /v1/books`, not mock catalog data.
- If the backend returns `translations: []`, the page shows a compact empty state.

## API Data

Add frontend types for the book catalog:

```ts
interface BookMetadata {
  id: string;
  name: string;
  testament: 'OT' | 'NT';
  position: number;
  chapters: Array<{
    number: number;
    verses: number;
  }>;
}
```

Add frontend types for compare responses:

```ts
interface VerseTranslationResult {
  id: string;
  abbreviation: string;
  text: string;
  copyright: string;
}

interface VerseComparison {
  reference: string;
  displayReference: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  translations: VerseTranslationResult[];
}
```

Add API functions:

```text
fetchBooks() -> GET /v1/books
compareVerse(reference, translations) -> GET /v1/verses/:reference?translations=...
```

Use `URLSearchParams` for the `translations` query string. Keep response unwrapping inside the API client.

## Query Layer

Extend query keys:

```ts
GET_BOOKS;
COMPARE;
```

Add query helpers:

```text
createBooksQuery()
createCompareQuery({ reference, abbreviations })
```

`createCompareQuery` is enabled only when:

- `reference` is present.
- At least one selected translation abbreviation is present.

Selected abbreviations should be normalized before entering the query key and request params, matching the search integration.

## Compare Route Data Flow

1. `/compare` loads with empty picker state.
2. `VersePicker` reads URL params: `book`, `chapter`, and `verse`.
3. `VersePicker` calls `createBooksQuery()` and fetches the backend book catalog.
4. `VersePicker` uses `useSearchParams` as the source of truth for book, chapter, and verse.
5. If URL params map to a valid book/chapter/verse, the picker renders that selection from the URL state.
6. The picker builds the canonical backend reference from the selected book ID:

   ```text
   ${book.id}.${chapter}.${verse}
   ```

7. Picker selections write back to the URL with display book names:

   ```text
   /compare?book=John&chapter=3&verse=16
   ```

8. The compare route also reads the URL params and cached books query to derive the current canonical selection.
9. Once a canonical reference and selected translations exist, `createCompareQuery()` fetches comparison results.
10. Result cards render from `comparison.translations`.
11. If `comparison.translations` is empty, the page renders the compact empty state.

## Verse Picker

Update `web/src/lib/components/verse-picker.svelte` to fetch backend book metadata through `createBooksQuery()` instead of importing mock data or receiving books from the route.

Required behavior:

- Start empty by default.
- Read and write `book`, `chapter`, and `verse` through `useSearchParams`.
- Use book display names in the book select.
- Use the selected book's chapter metadata for chapter options.
- Use the selected chapter's verse count for verse options.
- Changing book resets chapter and verse.
- Changing chapter resets verse.
  The compare route derives this selection shape from URL params and the books query:

```ts
{
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  reference: string;
}
```

## Compare Page States

The page should cover these states:

- Initial empty picker: show `Choose a verse to compare.`
- Books loading inside the picker area: show `Loading books...`.
- Books error inside the picker area: show `Books failed to load.` with retry.
- Valid verse but no selected translations: toast once per verse with `Select at least one translation.`
- Compare loading: show `Comparing...`.
- Compare 404: show `Verse not found.`
- Other compare error: show `Compare failed.` with retry.
- Compare empty result: show `No selected translations have this verse.`
- Compare results: render one `VerseResultCard` per returned translation.

## Copyright Behavior

Keep existing result card copyright modal behavior. Compare result cards should continue to hide the repeated reference because the page already knows which verse is being compared.

## Files

Expected files:

```text
web/src/lib/api/searchverse.ts
web/src/lib/queries/query-keys.ts
web/src/lib/queries/searchverse.ts
web/src/lib/components/verse-picker.svelte
web/src/routes/compare/+page.svelte
web/src/lib/mock-data.ts
```

Mock compare data and mock picker catalog data should no longer be used by `/compare` after this integration.

## Verification

Static checks:

```text
pnpm --dir web run check
pnpm --dir web run lint
```

Runtime checks:

- `/compare` starts with no selected book/chapter/verse.
- `/compare?book=John&chapter=3&verse=16` hydrates the picker after books load.
- Selecting a verse updates the URL with display book name, chapter, and verse.
- The compare request uses the canonical reference, such as `JHN.3.16`.
- The compare request includes normalized selected translations.
- Changing selected translations refetches the current valid comparison.
- `translations: []` renders `No selected translations have this verse.`
- Backend errors render the appropriate compact error state.
