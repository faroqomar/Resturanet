---
name: desktop-e2e
description: Exercise the installed Resturanet desktop application with isolated realistic financial data.
---

# Desktop end-to-end test

Use when runtime integration, persistence, or a release candidate must be
proven. Never touch the user’s live restaurant data.

## Environment

1. Create a unique temporary `RESTURANET_DATA_DIR` and record it in test notes.
2. Record app version, source/artifact SHA, OS, and whether this is dev or
   installed DMG.
3. Keep screenshots, exports, and backups outside the repository and do not
   commit them.

## Execute

Run `.cursor/reference/release-ledger-scenario.md` exactly. Record expected
formulas before entry and actual values after each posting. Then cover:

- detailed historical entry with an attachment;
- a valid batch and an invalid batch that commits zero rows;
- duplicate-number and overpayment confirmations;
- work-day date move and cleanup;
- every report filter and open-record link;
- keyboard entry, error recovery, empty states, and both directions;
- print preview when available;
- backup/restore immediate refresh and close/reopen persistence.

## Evidence standard

For each scenario capture: action, expected state, actual state, and pass/fail.
A screenshot proves appearance, not database correctness; pair it with displayed
totals or direct test assertions. Return `PASS`, `FAIL`, or `BLOCKED` with exact
failed step and environmental limitations.
