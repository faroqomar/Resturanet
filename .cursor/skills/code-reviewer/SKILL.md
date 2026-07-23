---
name: code-reviewer
description: Review Resturanet changes for correctness, regressions, security, localization, and test gaps.
---

# Code reviewer

Use for a requested review or a final pre-commit audit. Review is read-only
unless the user also asks to fix findings.

## Build the review surface

1. Inspect status, diff, and surrounding implementation—not filenames alone.
2. Identify user-visible and persistent behavior changed.
3. Map the change through `.cursor/reference/change-impact-matrix.md`.
4. Read tests and docs that claim to cover the behavior.
5. Run focused checks where they can confirm or reject a suspected defect.

## Review order

1. data loss, corruption, wrong financial posting, or security boundary break;
2. transaction rollback, migration, restore, trash, and attachment lifecycle;
3. IPC validation, serialization, and least privilege;
4. AR/EN, RTL/LTR, keyboard, errors, confirmations, and custom-data retention;
5. missing regression coverage, stale claims, performance, and complexity.

## Finding standard

Every finding must contain:

- severity: `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`;
- exact file and tight line range;
- reachable failure path or counterexample;
- user/data impact;
- smallest safe correction.

Do not report style preferences, pre-existing unrelated issues, or hypotheses
without explaining how to prove them. Findings come first. If none remain,
state that explicitly, then list inspected surfaces, checks run, and residual
testing limits.
