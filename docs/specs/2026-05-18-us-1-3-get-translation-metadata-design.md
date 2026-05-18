# US-1.3: Get Single Translation Metadata Design

## Goal

Implement `GET /translations/:id` so API consumers can fetch full metadata for one locally ingested translation.

The endpoint reads from the local `translations` table and does not call api.bible at request time.

## User Story

As a developer consuming the API, I want to fetch metadata for a specific translation, so that I can display its details or validate it before querying.

## Acceptance Criteria

- `GET /translations/:id` returns one translation by its `id`.
- The response includes every field in the `translations` schema.
- Timestamp fields use snake-case response names.
- Missing translation ids return HTTP `404`.
- The not-found response message is `We cannot seem to find that translation. Please check the id and try again`.

## Architecture

Extend the existing translation feature module:

- `TranslationController` owns the public `GET /translations/:id` route.
- `TranslationService` owns database access and not-found handling.
- `TranslationResponseDto` includes all schema fields returned by translation metadata endpoints.
- `GET /translations` also returns the full schema-backed response shape.
- `AppError` becomes the app-level operational error class for expected client-facing failures.
- `GlobalExceptionFilter` normalizes all error responses to `status: "fail"`.

The existing `ApiBibleError` remains localized to upstream api.bible failures. The global filter converts it to a generic HTTP `502` response without leaking upstream details.

## Data Flow

1. Client calls `GET /translations/:id`.
2. `TranslationController.findOne(id)` delegates to `TranslationService.findOne(id)`.
3. `TranslationService` queries the local `translations` table through `DRIZZLE_CLIENT`.
4. If a row exists, the service returns it using API response field names.
5. If no row exists, the service throws `AppError` with HTTP `404`.
6. Successful responses are wrapped by `ResponseInterceptor`.
7. Error responses are sent by `GlobalExceptionFilter`.

## Response Shape

Successful response body:

```json
{
  "status": "success",
  "data": {
    "id": "de4e12af7f28f599-02",
    "abbreviation": "KJV",
    "name": "King James Version",
    "language": "eng",
    "copyright": "Public domain",
    "last_synced_at": "2026-05-18T14:30:00.000Z",
    "created_at": "2026-05-18T14:00:00.000Z",
    "updated_at": "2026-05-18T14:30:00.000Z"
  }
}
```

Not-found response body:

```json
{
  "status": "fail",
  "message": "We cannot seem to find that translation. Please check the id and try again"
}
```

## Error Handling

Add a local `AppError` class with `message`, `statusCode`, `isOperational`, optional `errors`, and captured stack traces.

Use `AppError` for expected application failures, including US-1.3 not-found responses.

Update `GlobalExceptionFilter` to handle errors in this order:

1. `AppError`: return its HTTP status with `{ "status": "fail", "message": "..." }` and optional `errors`.
2. `HttpException`: normalize framework errors to `{ "status": "fail", "message": "..." }`.
3. `ApiBibleError`: return HTTP `502` with `{ "status": "fail", "message": "Upstream service error" }`.
4. Unknown errors: log and return HTTP `500` with `{ "status": "fail", "message": "Something went very wrong!" }`.

All error response bodies use only `status: "fail"`.

## Testing

Add focused unit tests:

- Service returns all translation schema fields with snake-case timestamp keys for `findAll`.
- Service returns all translation schema fields with snake-case timestamp keys for `findOne`.
- Service throws `AppError` with HTTP `404` and the exact not-found message when no row exists.
- Controller delegates `findOne(id)` to the service.
- Global filter returns `status: "fail"` for `AppError`.
- Global filter returns `status: "fail"` for framework `HttpException` validation-style errors.
- Global filter preserves the `ApiBibleError` HTTP `502` behavior.
- Global filter returns `status: "fail"` for unknown errors.
