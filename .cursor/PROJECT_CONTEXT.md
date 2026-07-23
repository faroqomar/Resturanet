# Resturanet project context

## Product

Resturanet is an offline bilingual desktop accounting and operations ledger for
one restaurant. It records work days, direct restaurant expenses, supplier
invoices and payments, daily sales, operating liabilities and partial payments,
historical records, reports, attachments, trash, backup, and restore.

The application is not a general accounting platform. It intentionally excludes
inventory, recipes, meal costing, user accounts, permissions, cloud services,
and synchronization.

## Product decisions

- One restaurant and one local operator.
- Offline runtime with no remote renderer content.
- Arabic is the first-run default; English is equally supported.
- Gregorian business dates use Baghdad timezone semantics; week is Saturday
  through Friday.
- Old records use normal postings through Historical Entry, not a parallel
  accounting book.
- Financial deletion is recoverable until explicitly removed permanently.

## Technology

- Electron main process and sandboxed BrowserWindow
- React and TypeScript renderer
- SQLite through `better-sqlite3`
- Zod validation at IPC boundaries
- Vitest and Testing Library
- electron-vite and electron-builder
- macOS Apple Silicon DMG as the primary package

The exact package versions and scripts are authoritative in `package.json`.

## Source map

| Area           | Location                   | Responsibility                                |
| -------------- | -------------------------- | --------------------------------------------- |
| Shared domain  | `src/shared/`              | Contracts, schemas, catalogs, pure finance    |
| Main process   | `src/main/`                | SQLite, transactions, filesystem, IPC, backup |
| Preload        | `src/preload/`             | Typed least-privilege `window.restaurantApi`  |
| Renderer       | `src/renderer/`            | React UI, Arabic/English, RTL/LTR             |
| Tests          | `src/**/*.test.*`          | Finance, SQLite, schemas, components          |
| Packaging      | `scripts/`, `package.json` | Native rebuild and ARM64 DMG                  |
| Public docs    | `README.md`                | Product, setup, and usage overview            |
| Technical docs | `docs/ARCHITECTURE.md`     | Runtime and data design                       |
| Design intent  | `.impeccable.md`           | Visual character and UX principles            |

## Runtime data flow

```text
React renderer
  -> window.restaurantApi
  -> preload allowlist
  -> validated IPC handler
  -> AppStore / attachment / backup service
  -> SQLite and local files
```

The renderer never receives database or filesystem access.

## Domain invariants

- A work day is created when the first dated operation is saved.
- Financial documents use UUID primary keys and generated editable references.
- Soft-deleted records are excluded from reports and remain restorable.
- Supplier balances are calculated from ledger movements, not stored as a
  mutable balance.
- Historical detailed entry reuses normal save paths. Historical batch entry is
  one transaction type per batch and commits all rows or none.
- Attachments are stored under safe internal names while preserving display
  metadata.
- Backups contain a consistent SQLite snapshot, attachments, and a versioned
  manifest. Restore creates a safety backup and migrates older compatible data.

Exact posting classifications live in
`.cursor/reference/financial-model.md`. Do not duplicate them here or in
renderer code.

## Localization

- `ar` is the default locale and uses RTL.
- `en` uses LTR.
- Built-in catalogs have stable translation keys.
- Custom data remains exactly as entered.
- Dates, currency, CSV, native dialogs, reports, and print content follow the
  selected language.

## Security and privacy

- No remote content or network dependency is required at runtime.
- `nodeIntegration` stays disabled; context isolation, sandbox, and web security
  stay enabled.
- All external paths and backup ZIP entries are validated before use.
- Do not log invoice contents, attachments, restaurant data, local paths, or
  backup contents in committed files.
- Project CLI deny rules live in `.cursor/cli.json`; no credentials belong in
  repository configuration.

The full trust model is `.cursor/reference/security-boundary.md`.

## Engineering workflow

Classify changes with `.cursor/reference/change-impact-matrix.md`. Implement
persistent/cross-process changes from shared contracts through main, preload,
renderer, and tests. Use project commands for explicit repeatable workflows and
read-only custom agents for independent audits.

Run for completed implementation:

```bash
npm run check:agent-config
npm run format:check
npm run typecheck
npm test
npm run build
```

For release work, also run:

```bash
npm run package:mac
```

Then mount and launch the DMG build using an isolated
`RESTURANET_DATA_DIR` and execute
`.cursor/reference/release-ledger-scenario.md`.

The package is not notarized unless valid Apple Developer credentials are
provided.

## Documentation hierarchy

- Code, schemas, and tests are the behavioral source of truth.
- `docs/ARCHITECTURE.md` explains the technical design.
- `.cursor/PROJECT_CONTEXT.md` guides project work.
- `README.md` is the public overview.

When these disagree, verify the code, fix the behavior if needed, and update only
the stale documents.
