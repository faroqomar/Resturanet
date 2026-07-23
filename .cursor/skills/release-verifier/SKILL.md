---
name: release-verifier
description: Build, inspect, and smoke-test the Resturanet Apple Silicon DMG.
---

# Release verifier

Use only when the release artifact, not merely source, must be accepted.

## Build gate

1. Confirm intended version and a clean understanding of current dirty changes.
2. Run `npm run check:agent-config`, format, typecheck, tests, and production
   build.
3. Run `npm run package:mac`; do not reuse an unexplained older artifact.
4. Record artifact size and SHA-256; run `hdiutil verify`.

## Artifact gate

1. Mount the DMG, inspect its contents, copy `Resturanet.app` to a temporary
   directory, then detach reliably.
2. Confirm Mach-O architecture is ARM64 and app/package versions agree.
3. Inspect code-signing output and state clearly whether Developer ID signing
   and Apple notarization exist.
4. Launch without a development server or network dependency using isolated
   data.

## Product gate

Run the `desktop-e2e` skill and
`.cursor/reference/release-ledger-scenario.md`. Verify locale persistence, exact
ledger totals, report/CSV, attachment, trash, backup/restore, and restart.

## Decision

Return `PASS`, `CONDITIONAL PASS`, `FAIL`, or `BLOCKED` with a gate table,
artifact SHA, evidence, and limitations. Do not validate only the unpacked
development build and do not call unnotarized software notarized.
