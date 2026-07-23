# Financial model

This is the accounting classification contract for Resturanet. Code and tests
remain authoritative; update this file when verified behavior changes.

## Independent measures

Never use these terms interchangeably:

- **Purchases**: value received from suppliers through supplier invoices.
- **Recorded expense**: economic cost recognized for the selected period.
- **Cash out**: money actually paid during the selected period.
- **Supplier debt**: derived amount owed to a supplier; a negative value is
  credit in favor of the restaurant.
- **Approximate result**: usable sales minus recorded expense.

## Posting matrix

| Operation                         | Purchases | Recorded expense |  Cash out | Supplier debt |
| --------------------------------- | --------: | ---------------: | --------: | ------------: |
| Direct restaurant expense         |         0 |        `+amount` | `+amount` |             0 |
| Supplier invoice                  |  `+total` |         `+total` |         0 |      `+total` |
| Invoice “paid now” linked payment |         0 |                0 | `+amount` |     `-amount` |
| Standalone supplier payment       |         0 |                0 | `+amount` |     `-amount` |
| Operating liability               |         0 |         `+total` |         0 |             0 |
| Operating-liability child payment |         0 |                0 | `+amount` |             0 |
| Supplier opening balance          |         0 |                0 |         0 |     `+amount` |
| Increase-debt adjustment          |         0 |                0 |         0 |     `+amount` |
| Decrease-debt adjustment          |         0 |                0 |         0 |     `-amount` |
| Sale                              |         0 |                0 |         0 |             0 |

Sales contribute to the result separately:

```text
approximate result = usable sales - recorded expense
```

## Derived formulas

```text
supplier balance =
  opening balance
  + active supplier-invoice totals
  - active supplier payments
  + signed active adjustments
```

```text
recorded expense =
  active direct restaurant expenses
  + active supplier-invoice totals
  + active operating liabilities
```

```text
cash out =
  active direct restaurant expenses
  + active supplier payments
  + active operating-liability payments
```

The linked payment created by invoice “paid now” is already in supplier
payments. Never add the invoice field a second time.

## Sales completeness

For every active work day in the selected range:

- `complete`: sales may be used without a warning;
- `estimated`: sales may be used only with a prominent estimated-data warning;
- `unavailable`, or no sales row: the result is unavailable.

An empty calendar date is irrelevant. A work day exists because an operation
was recorded and therefore participates in completeness.

## Lifecycle invariants

- Create and update produce the same posting classification.
- Moving a transaction to another date re-links it to the correct work day.
- A work day is removed only when no active or trashed record still needs it.
- Soft-deleted records do not affect active totals.
- Restore reintroduces exactly the original effect.
- Permanent deletion cannot orphan child payments or attachments.
- Historical entry reuses these postings; it is not a second ledger.
- Historical batches validate completely and commit all rows or none.
- Money is integer IQD. Quantities may be decimal; monetary results may not.
