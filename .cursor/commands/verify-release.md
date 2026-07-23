# Verify the Resturanet release

Perform the full release workflow from source checks through the installed ARM64
DMG. Never use live restaurant data.

Run format, typecheck, tests, build, and `npm run package:mac`. Verify the DMG,
checksum, architecture, version, signing, and notarization state. Mount it,
copy the app to a temporary location, and launch it with an isolated
`RESTURANET_DATA_DIR`.

Execute `.cursor/reference/release-ledger-scenario.md` and compare every actual
value with its expected value. Verify both languages, CSV, attachment, trash,
backup/restore, and restart persistence.

Return `PASS`, `CONDITIONAL PASS`, `FAIL`, or `BLOCKED` first, followed by a
gate/evidence table. “Not run” is never “pass.”
