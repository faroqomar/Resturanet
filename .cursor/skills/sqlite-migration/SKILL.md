---
name: sqlite-migration
description: Design and verify backward-compatible Resturanet SQLite migrations and backup restore behavior.
---

# SQLite migration

Use for any persistent shape, constraint, index, seed, catalog key, or financial
semantic change.

## Establish the contract

1. Read `CURRENT_SCHEMA_VERSION`, fresh schema creation, applied migration
   checks, seed behavior, store queries, contracts/schemas, migration tests, and
   backup manifest compatibility.
2. Describe old shape, new shape, semantic meaning, valid null/default values,
   and every reader/writer affected.
3. State how IDs, custom text, inactive catalogs, soft-deleted rows,
   attachments, and current totals remain intact.

## Implement

1. Add a new forward version; never rewrite an applied migration.
2. Prefer additive DDL. When table rebuilding is required, run it transactionally
   with explicit columns, constraints, row-count checks, and foreign-key checks.
3. Make the step safe to resume or prove the migration transaction prevents
   partial application.
4. Backfill stable machine values only. Never translate or normalize custom
   user data.
5. Add indexes only for demonstrated filters/joins and verify they do not change
   uniqueness semantics.
6. Keep backup manifest compatibility explicit.

## Required tests

- fresh database reaches the new version;
- a fixture at the previous supported version migrates once and reopens twice;
- counts, IDs, integer sums, settings, catalog keys, trash, and attachment
  references match before/after;
- invalid/partial legacy state fails safely;
- an older compatible backup restores, reopens, migrates, and preserves totals.

If backward rollback would lose new financial meaning, document a forward-fix
strategy. Do not pretend destructive down-migration is safe.
