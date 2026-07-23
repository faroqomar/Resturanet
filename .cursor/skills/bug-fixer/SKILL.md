---
name: bug-fixer
description: Reproduce, isolate, repair, and regression-test Resturanet defects across Electron, SQLite, and React.
---

# Bug fixer

Use for a concrete defect the user asked to repair. If they requested diagnosis
only, use `evidence-first-reading` and stop before editing.

## Reproduce

1. Inspect the dirty worktree and preserve unrelated changes.
2. Use an isolated `RESTURANET_DATA_DIR` for runtime/storage defects.
3. Write the shortest deterministic reproduction with expected and actual
   state. For money, include exact integer totals.
4. Confirm whether the bug exists in development, packaged app, or both.

## Isolate

Trace contracts -> schema -> IPC -> transaction/query -> derived DTO -> UI.
Identify the first layer where actual state diverges from expected state. Check
create, update, date move, trash/restore, and restart when the defect can vary by
lifecycle.

Do not edit until one root-cause statement explains the evidence. If evidence
supports multiple causes, design the smallest experiment that separates them.

## Repair

1. Make the smallest complete fix without unrelated cleanup.
2. Preserve `.cursor/reference/financial-model.md` and
   `.cursor/reference/security-boundary.md`.
3. Add a regression test that fails for the original reason, not merely the
   visible symptom.
4. Prefer the lowest deterministic layer, adding UI/E2E coverage only when the
   lower layer cannot catch the regression.
5. Run the new test, affected suite, format, typecheck, and relevant build.
6. For native/packaged-only defects, rebuild and retest the installed DMG.

## Stop conditions

Stop and report rather than guess if reproduction would touch live restaurant
data, the intended behavior changes financial meaning, or a destructive
migration/restore requires user authority.

Never “fix” totals with a mutable supplier balance, duplicated UI calculation,
suppressed error, or second posting path.
