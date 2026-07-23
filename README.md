# Resturanet

Resturanet is an offline, bilingual Arabic/English desktop application for managing the sales, expenses, supplier invoices, supplier balances, and daily records of a single restaurant.

The application is built with Electron, React, TypeScript, and SQLite through `better-sqlite3`. All financial data and attachments remain on the local computer; no account, internet connection, cloud service, or remote content is required.

## Features

- Arabic RTL and English LTR interfaces with a persistent language switch.
- Daily, weekly, monthly, and custom-range financial dashboards.
- Work days that group every transaction by its Baghdad calendar date.
- Restaurant expense invoices with categories, attachments, and optional manual totals.
- Standard and produce supplier invoices, embedded payments, standalone payments, and derived supplier statements.
- Dated supplier opening balances and explicit debt-increase or debt-decrease adjustments.
- Daily sales with complete, estimated, or unavailable data states.
- Rent, salaries, and other liabilities with partial payments.
- Historical Entry Center with a detailed form and atomic batch entry.
- Financial reports, supplier debt reports, category breakdowns, printing, and UTF-8 CSV export.
- JPG, JPEG, PNG, and PDF attachments up to 25 MB.
- Recoverable trash, full SQLite/attachment backups, and safe restore.

## Historical Entry Center

The **Historical Entry** page records older restaurant data without creating a separate ledger. It supports restaurant expenses, standard and produce supplier invoices, supplier payments, supplier opening balances and adjustments, sales, and operating expenses.

Detailed mode supports line items and attachments. Batch mode accepts one transaction type per batch, validates every row, and saves the entire batch inside one SQLite transaction. If one row fails, no row is committed.

Supplier opening balances and adjustments affect supplier debt only. They do not count as recorded expenses or cash out.

## Development

Requirements: macOS, Node.js, and npm.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run check:agent-config
npm run format:check
npm run typecheck
npm test
npm run build
```

Build the Apple Silicon DMG:

```bash
npm run package:mac
```

The output is written to `release/Resturanet-1.1.0-arm64.dmg`. The local build is ad-hoc signed but is not notarized with an Apple Developer ID.

## Local data and backups

Resturanet stores its SQLite database and attachment directory under Electron's standard `userData` folder. Use **Settings → Create backup** instead of copying the live SQLite file.

A `.resturanet-backup` package contains:

- a consistent SQLite Backup API snapshot;
- all local attachments;
- a manifest containing the application and schema versions.

Restoring creates an automatic safety backup first. Backups from schema version 1 are accepted and migrated to the current schema.

## Financial rules

- A supplier invoice increases purchases and supplier debt.
- A supplier payment is actual cash out and is counted once.
- A direct restaurant expense is both a recorded expense and cash out.
- Rent, salaries, and other liabilities are recorded expenses; only their payments are cash out.
- Supplier opening balances and adjustments change supplier debt only.
- An estimated result is shown only when every work day in the range has usable sales data.

See [Architecture](docs/ARCHITECTURE.md) for the data model, IPC boundary, migration strategy, and security design.

## AI-assisted development

Repository-specific instructions start in [AGENTS.md](AGENTS.md). The curated
`.cursor/` workspace contains file-scoped rules, canonical finance/security
references, procedural skills, reusable slash commands, and independent
read-only reviewers. Validate the toolkit with:

```bash
npm run check:agent-config
```
