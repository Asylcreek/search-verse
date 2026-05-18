# US-1.2: List Available Translations Design

## Goal

Implement `GET /translations` so API consumers can list translations currently available in the local database.

The endpoint returns rows from the `translations` table and does not call api.bible at request time.

## User Story

As a developer consuming the API, I want to retrieve the list of translations available in the system, so that I can present users with translation options.

## Acceptance Criteria

- `GET /translations` returns all rows from the `translations` table.
- Each response item includes `id`, `abbreviation`, `name`, `language`, and `last_synced_at`.
- If no translations have been ingested, the endpoint returns `[]`.

## Architecture

Add a dedicated translation feature module:

- `TranslationModule` registers the controller and service.
- `TranslationController` owns the public `GET /translations` route.
- `TranslationService` owns database access and response mapping.
- `TranslationResponseDto` defines the HTTP response shape.

The existing ingestion module keeps `POST /translations/ingest`. The new translation module owns read-only translation metadata endpoints, giving US-1.3 a natural place for `GET /translations/:id`.

## Data Flow

1. Client calls `GET /translations`.
2. `TranslationController.findAll()` delegates to `TranslationService.findAll()`.
3. `TranslationService` queries the local `translations` table through `DRIZZLE_CLIENT`.
4. The service selects `last_synced_at` in the response shape.
5. The controller returns the DTO array.

## Response Shape

```json
[
  {
    "id": "de4e12af7f28f599-02",
    "abbreviation": "KJV",
    "name": "King James Version",
    "language": "eng",
    "last_synced_at": "2026-05-18T14:30:00.000Z"
  }
]
```

When there are no rows:

```json
[]
```

## Error Handling

No custom error behavior is needed for this story.

Database failures pass through Nest's existing exception handling and return the standard server error response.

## Testing

Add focused unit tests:

- Service returns DTO-shaped rows from the database query.
- Service returns `[]` when the database returns no rows.
- Controller delegates to the service and returns its result.

No end-to-end test is required for this XS story unless implementation reveals route registration risk.
