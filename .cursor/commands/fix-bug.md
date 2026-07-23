# Diagnose and fix a Resturanet bug

Reproduce the reported behavior with isolated data when runtime behavior is
involved. Write down expected versus actual values before editing.

Trace the smallest failing path across contracts, Zod parsing, IPC, store
transaction/query, derived totals, and renderer state. For finance bugs,
classify every affected movement using
`.cursor/reference/financial-model.md`.

Fix the root cause with the smallest complete change. Add a regression test that
fails for the original bug and covers edit/delete/restore or restart when
relevant. Run the targeted test first, then format, typecheck, tests, and build
as warranted.

Do not repair displayed totals by introducing a mutable balance, duplicating a
calculation in UI code, or suppressing an error. Report reproduction evidence,
root cause, fix, regression proof, and any untested environment condition.
