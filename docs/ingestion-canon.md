# Ingestion Canon

Ingestion currently supports the 66-book Protestant canon.

The testament mapping is intentionally strict: unknown, deuterocanonical, apocryphal, or translation-specific book IDs fail ingestion instead of being guessed into OT or NT.

To support another canon, update `src/ingestion/testament.helper.ts` with the expected book IDs and add matching tests before ingesting that translation.
