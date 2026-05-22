# Books Catalog and Display References Design

## Goal

Expose translation-agnostic Bible book metadata so frontend clients can show plain book names, chapter choices, and verse choices while still building the canonical references used by the existing API.

Existing search and compare behavior stays centered on canonical references such as `GEN.1.1`. The frontend builds those references from catalog metadata. The backend enriches existing responses with human-readable passage names.

## User Stories

US-1: As a user, I want to select Bible books by plain names like `Genesis` and `1 Kings`, so that I do not need to know API book IDs.

US-2: As a user, I want chapter and verse selectors to prevent invalid choices, so that I can build valid references before requesting a comparison.

US-3: As a user, I want search and compare results to show full passage names like `Genesis 1:1`, so that results are readable without decoding canonical IDs.

US-4: As a frontend developer, I want stable machine fields and display fields, so that UI labels can change without breaking the existing API contract.

## Scope

In scope:

- Add `GET /books`.
- Return the 66-book Protestant canon in canonical order.
- Include book ID, plain name, testament, position, chapters, and verse counts.
- Add `bookName` and `displayReference` to search results.
- Add `bookName` and `displayReference` to verse comparison responses.
- Keep existing `reference`, `book`, `chapter`, and `verse` fields.
- Keep compare requests as `GET /verses/:reference`.

Out of scope:

- Translation-scoped book catalogs.
- Server-side reference building from `book`, `chapter`, and `verse` query parameters.
- Accepting plain names as compare references.
- Changing search or compare availability behavior.
- Supporting non-Protestant canons.

## API Design

### `GET /books`

Returns a translation-agnostic catalog.

```json
[
  {
    "id": "GEN",
    "name": "Genesis",
    "testament": "OT",
    "position": 1,
    "chapters": [
      { "number": 1, "verses": 31 },
      { "number": 2, "verses": 25 }
    ]
  }
]
```

Fields:

- `id`: canonical API book ID used to build references.
- `name`: display name for selectors and results.
- `testament`: `OT` or `NT`.
- `position`: canonical ordering from Genesis through Revelation.
- `chapters`: ordered chapter metadata.
- `chapters[].number`: chapter number.
- `chapters[].verses`: number of verses in that chapter.

The frontend builds references as:

```text
${book.id}.${chapter.number}.${verseNumber}
```

Example:

```text
GEN.1.1
```

## Response Enrichment

### Search Results

Current machine-readable fields remain. Add `bookName` and `displayReference`.

```json
{
  "reference": "GEN.1.1",
  "displayReference": "Genesis 1:1",
  "translation": "KJV",
  "book": "GEN",
  "bookName": "Genesis",
  "chapter": 1,
  "verse": 1,
  "text": "In the beginning God created the heaven and the earth.",
  "copyright": "King James Version. Public Domain."
}
```

### Verse Comparison

Current machine-readable fields remain. Add `bookName` and `displayReference`.

```json
{
  "reference": "GEN.1.1",
  "displayReference": "Genesis 1:1",
  "book": "GEN",
  "bookName": "Genesis",
  "chapter": 1,
  "verse": 1,
  "translations": []
}
```

## Architecture

Add a dedicated books feature:

- `BooksModule` registers the controller and service.
- `BooksController` exposes `GET /books`.
- `BooksService` returns canonical book metadata.
- A canonical metadata module stores the Protestant book/chapter/verse map.

Search and verse comparison should reuse the same canonical metadata helper to derive:

- `bookName`
- `displayReference`

The canonical metadata should not be derived from ingested translation data. Search and compare already account for translation availability through their existing database queries.

## Error Handling

`GET /books` has no request parameters and should return `200` with the canonical catalog.

If search or compare encounters a canonical book ID that is missing from the metadata map, the service should fall back to `bookName: book` and `displayReference: reference`. That case indicates an internal metadata mismatch and should be covered by tests.

## Testing

Add focused tests for:

- `BooksController` delegates to `BooksService`.
- `BooksService` returns Genesis first and Revelation last.
- `BooksService` includes verse counts for representative chapters.
- Search results include `bookName` and `displayReference`.
- Verse comparison responses include `bookName` and `displayReference`.
- Existing `reference`, `book`, `chapter`, and `verse` fields remain unchanged.
- Search and verse comparison use stable fallback display fields if metadata is missing.

No end-to-end test is required unless route registration or response wrapping behavior becomes uncertain during implementation.
