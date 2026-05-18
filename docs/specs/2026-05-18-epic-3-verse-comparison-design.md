# Epic 3: Verse Comparison Design

## Goal

Implement `GET /verses/:reference` so API consumers can fetch one verse reference across a required set of translation abbreviations.

The endpoint reads from locally ingested verse and translation data. It does not call api.bible at request time.

## User Stories

US-3.1: As a user, I want to look up a known verse reference and see it in every translation I care about, so that I can compare how different translations render the same passage.

US-3.2: As a developer consuming the API, I want clear errors for invalid requests, so that I can surface useful messages to the user.

For this project, US-3.2 follows the existing app error contract from `GlobalExceptionFilter`: error bodies use `status` and `message`.

## Acceptance Criteria

- `GET /verses/JHN.3.16?translations=KJV,NLT,AMP` returns metadata for `JHN.3.16` and matching translation entries.
- `translations` is required and accepts comma-separated translation abbreviations.
- Unknown abbreviations are not errors.
- Requested translations without an ingested row for the reference are omitted.
- If the reference exists in any ingested translation but none of the requested abbreviations match, the endpoint returns `200` with `translations: []`.
- If the reference does not exist in any ingested translation, the endpoint returns `404`.
- The `reference` path parameter is passed to the database as provided. No verse-reference format parser is added.
- Error responses use the existing shape: `{ "status": "fail", "message": "..." }`.

## Architecture

Add a dedicated verse feature module:

- `VerseModule` registers the controller and service.
- `VerseController` owns the public `GET /verses/:reference` route.
- `VerseService` owns database access, reference existence checks, and response mapping.
- `VerseTranslationsQueryDto` validates and parses the required `translations` query.
- `VerseComparisonResponse` and `VerseTranslationResult` define the HTTP response shape.

Register `VerseModule` in `AppModule` beside the existing translation and search modules.

## Data Flow

1. Client calls `GET /verses/:reference?translations=KJV,NLT,AMP`.
2. `VerseController.findByReference(reference, query)` delegates to `VerseService.findByReference(reference, query.translations)`.
3. `VerseService` queries one row from `verses` by `verses.reference = reference`, without applying translation filters.
4. If no row exists, the service throws `AppError` with HTTP `404`.
5. The found row supplies `reference`, `book`, `chapter`, and `verse`.
6. The service queries `verses` joined to `translations`, filtered by the same reference and requested translation abbreviations.
7. The service returns matching translation rows as the `translations` array.
8. Successful responses are wrapped by `ResponseInterceptor`.
9. Error responses are sent by `GlobalExceptionFilter`.

## Response Shape

Successful response body:

```json
{
  "status": "success",
  "data": {
    "reference": "JHN.3.16",
    "book": "JHN",
    "chapter": 3,
    "verse": 16,
    "translations": [
      {
        "id": "de4e12af7f28f599-01",
        "abbreviation": "KJV",
        "text": "For God so loved the world...",
        "copyright": "King James Version. Public Domain."
      }
    ]
  }
}
```

Existing reference with no matching requested translations:

```json
{
  "status": "success",
  "data": {
    "reference": "JHN.3.16",
    "book": "JHN",
    "chapter": 3,
    "verse": 16,
    "translations": []
  }
}
```

Missing reference response body:

```json
{
  "status": "fail",
  "message": "We cannot seem to find that verse. Please check the reference and try again"
}
```

## Error Handling

Use the existing `AppError` and `GlobalExceptionFilter` behavior.

Expected client-facing failures:

- Missing or empty `translations`: HTTP `400` from validation, normalized to `{ "status": "fail", "message": "..." }`.
- Reference with no ingested rows anywhere: HTTP `404` from `AppError`, normalized to `{ "status": "fail", "message": "..." }`.

Malformed-looking references such as `INVALID` are not format-validated. They are queried as-is and return `404` only when absent from the database.

## Testing

Add focused unit tests:

- Query DTO parses comma-separated translation abbreviations.
- Query DTO rejects missing or empty `translations`.
- Service returns verse metadata with all requested matching translations.
- Service omits requested abbreviations that have no ingested row for the reference.
- Service returns `translations: []` when the reference exists but no requested abbreviations match.
- Service throws `AppError` with HTTP `404` when the reference does not exist anywhere.
- Controller delegates the raw reference and parsed abbreviation list to the service.

No end-to-end test is required unless route registration or response wrapping behavior becomes uncertain during implementation.
