---
name: evidence-first-reading
description: Trace unfamiliar Resturanet behavior from direct code, schema, and test evidence before explaining or changing it.
---

# Evidence-first reading

Use when the request asks what the app does, why it behaves a certain way, or
whether a proposed change fits the current design.

## Evidence ladder

1. Restate the exact claim, including record type, lifecycle action, date range,
   and locale when relevant.
2. Locate entry points with `rg`/`rg --files`; do not rely on filenames alone.
3. Trace renderer -> preload -> IPC -> store/service -> SQLite/files.
4. Read shared contracts, Zod schemas, pure finance helpers, migration code, and
   tests for that path.
5. For derived output, trace the report/dashboard query back to the writes it
   aggregates.
6. Reproduce with isolated data when source alone cannot prove runtime state.
7. Record exact file and symbol evidence while reading.

## Proof rules

- `Verified`: directly supported by current code, test output, or runtime
  observation.
- `Inferred`: follows from evidence but was not exercised; state the assumption.
- `Unknown`: name the missing artifact, state, or test needed.

For finance, prove purchases, recorded expense, cash out, supplier debt, and
result separately using `.cursor/reference/financial-model.md`. For UI, inspect
both locales and directions. For persistence, inspect create/update/trash/
restore and restart—not just insert.

## Output

Return: claim; traced path; verified facts with symbols; inferences; unknowns;
and next test. Do not implement when the user requested explanation or diagnosis
only.
