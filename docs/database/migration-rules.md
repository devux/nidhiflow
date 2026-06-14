# Database Migration Rules

## Principles

- All schema changes use version-controlled migrations.
- Migrations are reviewed with the application change.
- Production migrations are forward-safe, observable, and reversible where
  practical.
- Never edit an already-applied migration.

## Expand and Contract

For breaking changes:

1. Add compatible columns/tables/indexes.
2. Deploy code that supports old and new shapes.
3. Backfill in bounded batches.
4. Verify data and metrics.
5. Switch reads/writes.
6. Remove old structures in a later release.

## Safety

- Avoid long table locks.
- Create large indexes concurrently where PostgreSQL permits.
- Add nullable columns before enforcing non-null on existing large tables.
- Add constraints as `NOT VALID` then validate when appropriate.
- Bound backfills and make them resumable/idempotent.
- Take/verify backups before high-risk changes.

## Money and Time Changes

Precision, currency, timezone, or date-boundary migrations require explicit
reconciliation tests and product approval. Never silently round historical
money.

## Soft Delete

Tables with `deleted_at` use partial unique indexes for active records where
needed. Repositories exclude deleted rows by default. Restore behavior and name
conflicts are explicit.

## Data Migrations

Use application-compatible scripts with progress metrics and dry-run support.
Do not log sensitive row payloads. Record counts, checksums, and reconciliation
results.

## Guest Data Versions

Client-side guest storage has its own schema version and migration chain.
Migrations preserve local data, are tested from every supported prior version,
and do not upload data.

## Rollback

Every migration documents rollback limitations. Destructive changes require a
verified backup/restore route; rollback must not pretend dropped data is
recoverable.

## Testing

Run migrations from an empty database and from the latest production-like
schema. Test constraints, indexes, application compatibility, and rollback or
recovery procedure.
