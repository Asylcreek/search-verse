# SearchVerse Web UI Design

## Goal

Add a SvelteKit web UI for SearchVerse with two user-facing routes:

- `/` for keyword verse search.
- `/compare` for comparing one verse across translations.

The frontend is developed as a separate SvelteKit app in `web/`. In production, the built UI is served by the existing Nest app so the API and UI can deploy together.

## Scope

In scope:

- Create a SvelteKit app under `web/`.
- Build the homepage search experience.
- Build the compare page experience.
- Use shared persisted translation selection across both routes.
- Use TanStack Query for browser-side API fetching.
- Use Tailwind v4 for styling with light and dark mode.
- Use Bits UI for searchable book/chapter/verse selects.
- Use `svelte-sonner` for toasts.
- Add production static serving through Nest.

Out of scope:

- SvelteKit server-side API loading for search and compare data.
- User accounts or server-side saved preferences.
- Moving the existing Nest app into an `apps/api` monorepo structure.
- Changing existing API response contracts unless implementation finds a confirmed mismatch.

## Architecture

Project layout:

```text
search-verse/
  src/        Nest API
  web/        SvelteKit UI
```

Development:

- Nest runs as the API server.
- SvelteKit runs on its Vite dev server.
- `PUBLIC_API_BASE_URL` points the web app to the Nest API.

Production:

- SvelteKit builds static client assets.
- Nest serves the built UI assets.
- API routes remain under the existing URI-versioned API path, such as `/v1/...`.
- Frontend routes such as `/` and `/compare` fall back to the built Svelte app.

The current Nest app does not serve static assets. Implementation must add static serving explicitly with `@nestjs/serve-static` and exclude `/v1/*path` from frontend fallback handling.

## Frontend Stack

- SvelteKit
- TanStack Query
- Tailwind v4
- Bits UI
- `svelte-sonner`
- Browser `localStorage`

Search and compare API data are fetched in the browser only. SvelteKit `load` functions are not used for this first UI because selected translations live in `localStorage`.

## Routes

### `/`

The homepage supports keyword search across selected translations.

Layout order:

1. Centered page title.
2. Search input with `Search` button.
3. Centered translation pills.
4. Result summary, such as `32 results`.
5. Search result cards.

### `/compare`

The compare page supports selecting one verse and reading it across selected translations.

Layout order:

1. Centered page title.
2. Three searchable selects: book, chapter, verse.
3. Centered translation pills.
4. Current display reference, such as `John 3:16`.
5. Compare result cards.

The URL uses the display book name:

```text
/compare?book=John&chapter=3&verse=16
```

The API request uses the canonical reference built from the book catalog:

```text
GET /verses/JHN.3.16?translations=KJV,NLT
```

## Shared Translation State

Selected translations are shared across both routes and persisted in `localStorage`.

```text
localStorage key: searchverse:selected-translations
value: ["KJV", "NLT", "AMP"]
```

Rules:

- No translations are selected by default.
- Translation pills are multi-select toggles only.
- No `Select all` or `Clear` actions are included.
- Changing a pill updates `localStorage` immediately.
- Both pages read and write the same selected translation state.

## Homepage Behavior

Search only runs after the user presses `Search`.

Rules:

- Typing does not fetch.
- Pressing `Search` validates the query and selected translations.
- If the query is empty, show a toast and do not fetch.
- If no translations are selected, show a toast and do not fetch.
- If valid, update the URL to `/?q=...` and fetch search results.
- On page load, hydrate the input from `?q=`.
- If `?q=` exists and selected translations exist, fetch immediately.
- If `?q=` exists but no translations are selected, show the query in the input and do not fetch.
- After a search has been submitted, changing selected translations refetches the last submitted query.

## Compare Behavior

Compare fetches automatically once all required inputs are valid.

Rules:

- Book, chapter, and verse are selected through searchable selects.
- Book options use full display names, such as `John`.
- Changing the book resets chapter and verse.
- Changing the chapter resets verse.
- Once book, chapter, verse, and selected translations are valid, fetch comparison results.
- If book, chapter, and verse are valid but no translations are selected, show a toast once and do not fetch.
- Selecting a translation after a valid verse is selected triggers the comparison fetch.
- Changing selected translations refetches comparison results when the verse is valid.
- The URL is updated to the current valid verse using display book name, chapter, and verse.

## Components

Proposed component structure:

```text
app-shell.svelte
route-nav.svelte
theme-toggle.svelte
search-bar.svelte
translation-pills.svelte
search-result-card.svelte
compare-result-card.svelte
copyright-modal.svelte
verse-picker.svelte
```

`app-shell.svelte` owns the shared page frame, navigation, theme control, and toast host.

`translation-pills.svelte` receives available translations, selected abbreviations, and a change callback. It does not own persistence directly.

`verse-picker.svelte` receives book catalog metadata and emits valid book/chapter/verse selections. It resets dependent selections according to compare page rules.

## Result Cards

Search result card:

- Subtle display reference at the top-left.
- Verse text is the prominent card content.
- Translation metadata appears bottom-left.
- `Copyright` button appears bottom-right.

Compare result card:

- No top-left reference because the compared reference is already shown on the page.
- Verse text is the prominent card content.
- Translation metadata appears bottom-left.
- `Copyright` button appears bottom-right.

## Copyright Modal

The copyright modal is scoped to the clicked card.

Rules:

- Opens from a result card's `Copyright` button.
- Shows the clicked result's translation and copyright text.
- Closes with an explicit close button.
- Closes with Escape.
- Closes on backdrop click.
- Keeps keyboard focus inside the modal while open.

## API Client

Create the frontend API wrapper in:

```text
web/src/lib/api/searchverse.ts
```

Expected API calls:

```text
GET /translations
GET /books
GET /search?q=...&abbreviations=...
GET /verses/:reference?translations=...
```

TanStack Query keys should include all fetch inputs:

```text
["translations"]
["books"]
["search", submittedQuery, selectedTranslations]
["compare", reference, selectedTranslations]
```

Selected translations should be normalized before entering query keys so equivalent selections do not create unnecessary cache misses.

## Styling

Use a calmer editorial style based on the approved mockup.

Principles:

- Centered composition for page titles, primary controls, and translation pills.
- Verse text should be the strongest visual element inside result cards.
- Cards should be readable and coherent without feeling heavy.
- Light and dark mode are required.
- Tailwind v4 theme tokens should define the color system.
- Avoid decorative clutter.

## UX States

Required states:

- Loading translations.
- Failed translations load.
- No translations selected.
- Empty search query.
- Search loading.
- Search error.
- Search empty results.
- Search results.
- Books loading.
- Books error.
- Incomplete compare selection.
- Compare loading.
- Compare error.
- Compare empty translation results.
- Compare results.

Toast messages should be short. The no-translation toast should be:

```text
Select at least one translation.
```

## Production Static Serving

Implementation must add static asset serving to the Nest app.

Use `@sveltejs/adapter-static` for the SvelteKit production build. Configure the static build to emit pages and assets into `web/build`.

Expected behavior:

- API routes under `/v1/...` continue to resolve to Nest controllers.
- Built frontend assets from `web/build` are served by Nest.
- Browser refresh on `/compare` returns the frontend app, not a 404.
- Asset URLs generated by the SvelteKit static build resolve correctly.

Nest static serving should use `web/build` as the root path. The implementation plan must verify the exact fallback option needed for direct requests to `/compare`.

## Testing

Frontend tests should cover:

- Initial no-translation state.
- `localStorage` persistence.
- Shared translation selection across routes.
- Homepage search submit behavior.
- Homepage restore from `?q=`.
- Translation changes rerun the submitted search.
- Compare book change resets chapter and verse.
- Compare chapter change resets verse.
- Compare auto-fetch rules.
- Compare URL uses display book name.
- API compare request uses canonical reference.
- Copyright modal opens with clicked card data.

Production serving tests or e2e checks should verify:

- `/v1/...` routes still hit API controllers.
- `/` serves the frontend.
- `/compare` serves the frontend on direct request or refresh.
