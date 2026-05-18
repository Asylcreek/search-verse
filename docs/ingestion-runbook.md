# Ingestion Runbook

## Current Mode

Bible translations are currently ingested manually from the local CLI.

The stale refresh scheduler exists, but `refreshStaleTranslations()` is intentionally not decorated with `@Cron`. Do not assume automatic 30-day refreshes are running.

The CLI currently enqueues a BullMQ job and waits for it to finish. A worker must be running separately for this path to complete. If we want a truly standalone CLI later, prefer calling `IngestionService.ingest()` directly from the command instead of starting a BullMQ worker inside the CLI.

## Known Translation Status

| Translation | API.Bible ID          | Status                                                |
| ----------- | --------------------- | ----------------------------------------------------- |
| KJV         | `de4e12af7f28f599-02` | Ingested and verified                                 |
| NLT         | `d6e14a625393b4da-01` | Ingested and verified                                 |
| NIV         | `78a9f6124f344018-01` | Ingested and verified                                 |
| NKJV        | `63097d2a0a2f7db3-01` | Ingested and verified                                 |
| AMP         | `a81b73293d3080c9-01` | Ingested and verified                                 |
| MSG         | `6f11a7de016f942e-01` | Paused; do not treat as a normal ingestion target yet |

KJV baseline:

- Books: `66`
- Verses: `31102`
- Last verified locally after reingestion on `2026-05-18`

## API.Bible Notes

Use grouped passage calls for normal verse ranges. Passage chunks are capped at `199` verse summaries because API.Bible can truncate around the 200-verse boundary.

Composite verse IDs require special handling:

- IDs containing `-` are fetched individually through verse content.
- IDs containing `,` are fetched from chapter JSON content.
- If a passage range is rejected with `400`, ingestion falls back to individual verse content.

API.Bible JSON text should be grouped by `attrs.verseId`. Styled text can split words across nodes, so parser changes must preserve intra-word chunks like `L` + `ord` while still inserting spaces between normal word or punctuation boundaries.

Transient API.Bible failures are retried for statuses `0`, `429`, `500`, `502`, `503`, and `504`.

## Verification

After CLI ingestion, verify the database:

```sql
select
  t.id,
  t.abbreviation,
  t.name,
  t.last_synced_at,
  (select count(*) from books b where b.translation_id = t.id) as book_count,
  (select count(*) from verses v where v.translation_id = t.id) as verse_count
from translations t
where t.id = '<api-bible-id>';
```

Expected for supported Protestant translations:

- `last_synced_at` is not null
- `book_count` is `66`
- `verse_count` matches the translation's expected count

For the local Postgres.app install, `psql` is available at:

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/psql
```

## Canon Limitation

The current testament mapping supports the 66-book Protestant canon only. Unknown, deuterocanonical, apocryphal, or translation-specific book IDs fail ingestion instead of being guessed into OT or NT.
