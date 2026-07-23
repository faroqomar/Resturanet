# Deterministic release ledger scenario

Run this only with an isolated `RESTURANET_DATA_DIR`. The fixed amounts make
double counting and missing postings obvious.

## Fixture

Use business date `2026-01-15` unless a date-specific migration test requires
another date.

1. Complete onboarding in Arabic with restaurant name `مطعم الاختبار`.
2. Switch to English and back to Arabic; restart and confirm the last locale.
3. Create supplier `مورد الاختبار` with opening balance `100,000` IQD dated
   `2026-01-01`.
4. Create a standard supplier invoice for `50,000` IQD with `paid now` of
   `20,000` IQD and one small PNG attachment.
5. Create a produce supplier invoice for `30,000` IQD with no payment.
6. Create a standalone supplier payment of `10,000` IQD.
7. Create a decrease-debt supplier adjustment of `5,000` IQD.
8. Create a direct restaurant expense of `15,000` IQD.
9. Create a salary/operating liability of `40,000` IQD with a child payment of
   `12,000` IQD.
10. Create complete daily sales of `250,000` IQD.

## Expected values

```text
supplier purchases = 50,000 + 30,000 = 80,000
supplier payments = 20,000 + 10,000 = 30,000
supplier balance = 100,000 + 80,000 - 30,000 - 5,000 = 145,000

recorded expense = 15,000 + 80,000 + 40,000 = 135,000
cash out = 15,000 + 30,000 + 12,000 = 57,000
approximate result = 250,000 - 135,000 = 115,000
operating liability remaining = 40,000 - 12,000 = 28,000
```

Confirm those exact values in the work day, supplier statement, dashboard, and
relevant reports.

## Completeness and lifecycle checks

1. Change sales to `estimated`: result stays `115,000` with a prominent warning.
2. Change sales to `unavailable`: result becomes unavailable, never zero.
3. Restore sales to `complete`.
4. Soft-delete the standalone `10,000` supplier payment:
   - supplier balance becomes `155,000`;
   - cash out becomes `47,000`.
5. Restore it and confirm the original values return.
6. Export CSV in Arabic and English; verify UTF-8 BOM, column alignment, commas,
   quotes, and user-entered Arabic text.
7. Create a backup, add a clearly identifiable extra record, restore, and
   confirm the extra record disappears while the attachment still opens.
8. Close and reopen the installed app; confirm every expected value persists.

## Evidence

Record the app version, artifact SHA-256, macOS version, test-data directory,
actual totals, screenshots for both directions, CSV inspection, backup path
(without committing it), and any unavailable physical-print/notarization test.
