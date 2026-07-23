---
name: docs-sync
description: Update Resturanet public, architecture, and AI context docs after verified behavior changes.
---

# Documentation sync

Use after verified behavior changes—not as a substitute for implementing or
testing them.

## Source-to-document map

- `README.md`: public capabilities, setup, usage, backup, packaging.
- `docs/ARCHITECTURE.md`: runtime boundary, schema, finance, security, restore.
- `.cursor/PROJECT_CONTEXT.md`: working source map and engineering decisions.
- `AGENTS.md`: durable constraints and contribution protocol.
- `.cursor/reference/*`: operational invariants and deterministic acceptance.
- `.impeccable.md`: intentional visual direction.

## Workflow

1. Inspect behavior, tests, and current diff.
2. List claims made stale by the change; leave unrelated prose untouched.
3. Update each claim at its canonical level and replace duplicate detail with a
   link/reference where practical.
4. Validate commands against `package.json`, symbols against source, schema
   versions against `database.ts`, and artifact names against build config.
5. Run the agent-config validator and formatting check.

Write project documentation in English while retaining localized product labels
when useful. Do not add speculative roadmap, promises, fabricated results,
private data, logs, secrets, or machine-specific absolute paths.
