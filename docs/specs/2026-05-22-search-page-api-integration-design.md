# Search Page API Integration Design

## Goal

Integrate the homepage search experience with the backend search API.

This scope is limited to what the search page needs:

- Live translation options.
- URL-driven search state.
- Backend search results.
- Backend pagination.

The compare page remains mock-backed.

## Context

The existing web UI is a SvelteKit app under `web/`. It currently renders the search page from `web/src/lib/mock-data.ts`.

The backend search endpoint is:

```text
GET /v1/search
```

Supported query parameters:

- `q`: required search text.
- `abbreviations`: required comma-separated translation abbreviations.
- `page`: optional page number, default `1`.
- `limit`: optional page size, default `20`.
- `testament`: optional, not included in this integration.
- `book`: optional, not included in this integration.

API responses are wrapped by the Nest response interceptor:

```ts
{ status: 'success', data: ... }
```

The implementation should unwrap this shape in the frontend API client.

## Architecture

The search page uses browser-side fetching, matching the existing frontend design.

Add TanStack Query to the web app and follow the same structure used in `/Users/asyl/Documents/thelm/web`:

- `+layout.ts` creates a `QueryClient`.
- `+layout.svelte` wraps the app with `QueryClientProvider`.
- `lib/api/*` owns fetch and HTTP error handling.
- `lib/queries/*` owns query keys and `createQuery` helpers.
- Page components consume query helpers instead of calling `fetch` directly.

TanStack Query devtools should be loaded only in development with `import.meta.env.DEV`.

## API Client

Create:

```text
web/src/lib/api/searchverse.ts
```

The client should use `PUBLIC_API_BASE_URL` as the API origin and call versioned backend routes.

Expected calls:

```text
GET ${PUBLIC_API_BASE_URL}/v1/translations
GET ${PUBLIC_API_BASE_URL}/v1/search?q=...&abbreviations=...&page=...&limit=...
```

The client should use `URLSearchParams` for query construction.

It should expose typed functions for:

- Fetching translations.
- Searching verses.

It should throw clear errors for non-OK responses.

## Query Layer

Create:

```text
web/src/lib/queries/query-keys.ts
web/src/lib/queries/searchverse.ts
```

Recommended query keys:

```ts
['GET_TRANSLATIONS'][('GET_SEARCH', q, normalizedAbbreviations, page, limit)];
```

Selected translations should be normalized before entering query keys and request params so equivalent selections do not create unnecessary cache misses.

The search query should be enabled only when:

- `q.trim()` is not empty.
- At least one selected translation exists.
- Translations are available.

## URL State

The search page uses URL-driven state for:

- `q`
- `page`
- `limit`

Rules:

- `page` defaults to `1`.
- `limit` defaults to `20`.
- `limit` remains hidden from the UI.
- If `limit` is present in the URL and valid, preserve it.
- If `limit` is absent or invalid, use `20`.
- Search submission writes `q`, `page=1`, and `limit`.
- Pagination updates `page` while preserving `q` and `limit`.

Example:

```text
/?q=love&page=2&limit=20
```

## Translation Selection

`TranslationPills` should be backed by live translations from:

```text
GET /v1/translations
```

The existing selected translation persistence remains:

```text
localStorage key: searchverse:selected-translations
```

Rules:

- Selected abbreviations persist immediately.
- Search submission requires at least one selected translation.
- If translations are loading, search submission is disabled.
- If translations fail to load, show a compact failure state near the pills and prevent submission.
- Changing selected translations refetches the current search when a submitted query exists.
- Changing selected translations resets `page` to `1` for an active search.

## Search Behavior

Search runs only from submitted URL state, not on every keystroke.

Startup behavior:

- Read `q`, `page`, and `limit` from the URL.
- Hydrate the search input from `q`.
- Read selected translations from `localStorage`.
- If `q` and selected translations are valid, fetch search results.
- If `q` exists but no translations are selected, show the query in the input and do not fetch.

Submit behavior:

- Trim the input value.
- If empty, show `Enter a search query.`
- If no translations are selected, show `Select at least one translation.`
- If valid, update the URL to `/?q=<query>&page=1&limit=<limit>`.

Request shape:

```text
GET /v1/search?q=...&abbreviations=KJV,NLT&page=1&limit=20
```

## UI States

The search page should cover these states:

- No submitted query: no result count and no mock results.
- Empty query on submit: toast `Enter a search query.`
- No selected translations on submit: toast `Select at least one translation.`
- Translations loading: disabled submit and loading state in the pill area.
- Translations error: compact failure message near the pills.
- Search loading: stable results-area loading state.
- Search error: compact error state with a retry action.
- Empty results: `0 results` and an empty result message.
- Results: backend `totalDocuments`, `data`, `currentPage`, and `totalPages`.

## Pagination

Pagination is included in this integration.

Rules:

- Render pagination only after a successful search with `totalPages > 1`.
- Use previous and next controls.
- Show a compact page indicator, such as `Page 2 of 5`.
- Disable previous on page `1`.
- Disable next on `totalPages`.
- Page controls update `q`, `page`, and `limit` in the URL.
- If the URL has a page beyond the backend result range, render the backend response as-is.

## Components And Files

Likely files:

```text
web/package.json
web/src/routes/+layout.ts
web/src/routes/+layout.svelte
web/src/lib/api/searchverse.ts
web/src/lib/queries/query-keys.ts
web/src/lib/queries/searchverse.ts
web/src/lib/components/translation-pills.svelte
web/src/routes/+page.svelte
web/src/lib/mock-data.ts
```

The compare page should continue to render with mock data.

## Verification

Run static checks:

```text
pnpm --dir web run check
pnpm --dir web run lint
```

Use runtime evidence:

- Start the API and web app.
- Select translations.
- Submit a search.
- Confirm the network request includes `q`, `abbreviations`, `page`, and `limit`.
- Confirm results render from the backend.
- Refresh `/?q=...&page=...&limit=...` and confirm state restores.
- Change page and confirm the URL and request update.
- Change selected translations and confirm the search refetches from page `1`.
- Confirm the compare page still renders with mock data.

## Out Of Scope

- Compare page API integration.
- Book or testament filters on the search page.
- User-facing limit control.
- Server-side SvelteKit loading.
- Changing backend search contracts.
