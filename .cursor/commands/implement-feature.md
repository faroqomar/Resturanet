# Implement a Resturanet feature

Implement the requested feature completely within its stated scope.

1. Read `AGENTS.md`, `.cursor/PROJECT_CONTEXT.md`, and the applicable rules.
2. Inspect the dirty worktree and preserve unrelated user changes.
3. Trace the current behavior through shared -> main -> preload -> renderer.
4. Classify the change with
   `.cursor/reference/change-impact-matrix.md`.
5. State finance, migration/backup, security/IPC, and localization impact before
   editing. Use “none” only after checking.
6. Implement the smallest complete vertical slice in dependency order.
7. Add focused regression tests, including negative and lifecycle cases.
8. Verify Arabic RTL and English LTR for user-facing changes.
9. Run targeted checks, then the repository quality gates proportional to risk.
10. Update docs only when verified behavior made them stale.

Finish with outcome, exact checks run, changed areas, and real limitations.
Never mark inspection as runtime proof and never commit unless the user asked.
