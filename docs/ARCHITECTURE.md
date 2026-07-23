# Resturanet architecture

## Runtime boundary

Resturanet is a single-user, offline Electron application. React never receives Node.js or SQLite access. The renderer communicates through the typed and allowlisted `window.restaurantApi` bridge in the preload process.

The BrowserWindow enables `contextIsolation`, sandboxing, and web security while disabling Node integration, external navigation, new windows, and permission requests. The renderer Content Security Policy blocks remote scripts, objects, and connections.

## Layers

- `src/shared` contains contracts, Zod schemas, catalog definitions, and pure financial functions.
- `src/main` owns SQLite, migrations, transactions, attachments, backups, printing, and IPC validation.
- `src/preload` exposes the least-privilege typed API.
- `src/renderer` contains the bilingual React interface and local translation dictionary.

All money is stored as integer Iraqi dinars. Business dates use `YYYY-MM-DD` in the `Asia/Baghdad` timezone. IDs are UUIDs.

## Database and migrations

Schema migrations are recorded in `schema_migrations`. Version 2 adds:

- the persisted `ar` or `en` application language;
- stable translation keys for built-in catalog rows;
- a supplier opening-balance date;
- dated supplier adjustments with increase-debt and decrease-debt directions.

Existing Arabic catalog names remain unchanged. Built-in rows are displayed through their stable translation key, while user-created names and notes are shown exactly as entered.

Every financial header and its child rows are written inside a SQLite transaction. Work days are created automatically for dated records and removed only when no active or trashed record still needs them.

## Supplier accounting

Supplier balance is derived from:

`opening balance + purchases - payments + signed adjustments`

The balance is never stored as a mutable running total. An embedded invoice payment creates a linked supplier payment so the ledger and cash-out reports include it exactly once.

A first historical opening balance updates the supplier baseline. When a supplier already has a balance or activity, the application requires confirmation and records the difference as a dated adjustment instead of silently rewriting history. Adjustments affect supplier debt, work-day activity, the supplier statement, and the invoice register, but never recorded expenses or cash out.

## Historical entry

Detailed entry dispatches to the same save services used by the normal transaction pages and supports attachments. Batch entry uses a discriminated `HistoricalEntryInput` union, requires one transaction type per batch, validates up to 250 rows, and wraps all saves in one outer SQLite transaction.

Batch mode intentionally excludes attachments. Duplicate numbers, overpayments, and existing opening balances retain their explicit confirmation gates.

## Localization

The language setting defaults to Arabic and is persisted in SQLite. The renderer updates the document `lang` and `dir`, uses locale-aware number and date formatting, and switches between RTL and LTR logical CSS. Native file dialogs, backup dialogs, CSV headers, print content, validation errors, and built-in catalogs follow the selected locale.

The application bundle uses the language-neutral name `Resturanet`; the in-app product title is localized.

## Attachments and backups

Attachments are copied under UUID-based internal names after extension, size, and resolved-path validation. Supported formats are JPG, JPEG, PNG, and PDF, with a 25 MB per-file limit.

Backup packages use the `.resturanet-backup` extension and contain `database.sqlite`, `manifest.json`, and `attachments/`. Restore rejects unknown ZIP paths, checks compatibility, creates a safety backup, stages files outside the data directory, and replaces data before reopening and migrating SQLite.

## Validation

Run:

```bash
npm run check:agent-config
npm run format:check
npm run typecheck
npm test
npm run build
npm run package:mac
```

The tests cover financial formulas, SQLite transactions, supplier adjustments, historical batch rollback, migration behavior, bilingual formatting, RTL/LTR behavior, and input validation.
