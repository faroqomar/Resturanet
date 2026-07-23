# Resturanet agent guide

This is the governing engineering contract for **Resturanet**, an offline,
single-restaurant desktop ledger. Apply it to planning, implementation, review,
testing, documentation, and publication.

## Authority and evidence

Read in this order before editing:

1. `AGENTS.md`
2. `.cursor/PROJECT_CONTEXT.md`
3. `README.md`
4. `docs/ARCHITECTURE.md`
5. applicable `.cursor/rules/*.mdc` and `.cursor/reference/*.md`
6. affected source, tests, and current diff

Current code, schema, and test/runtime evidence outrank prose. If they disagree,
investigate the mismatch and update only the stale layer. Do not ask the user to
repeat a decision already recorded here.

## Product boundaries

- Keep the product single-user, offline, local-first, and desktop-only.
- Do not add accounts, permissions, cloud/sync, remote content, inventory,
  recipes, meal costing, or multi-restaurant support without explicit approval.
- Arabic remains the default language. Every user-facing feature must work in
  Arabic/RTL and English/LTR.
- User-entered names, notes, document numbers, and custom categories must never
  be translated or rewritten.
- Optional invoice detail and attachments must not block fast financial entry.

## Runtime boundary

- `src/main` exclusively owns SQLite, filesystem access, attachments, backup,
  restore, printing, and Electron privileged APIs.
- `src/preload` exposes a typed, allowlisted, least-privilege bridge.
- `src/renderer` contains React UI only. It must not import Node.js,
  `better-sqlite3`, Electron main-process APIs, or touch the filesystem.
- `src/shared` contains serializable contracts, Zod schemas, catalog metadata,
  and pure financial functions.
- Validate every IPC input at the main-process boundary with Zod.
- Keep `contextIsolation`, sandboxing, web security, navigation blocking, and
  the remote-content ban intact.

The only valid privileged data path is:

```text
renderer -> preload method -> trusted/validated IPC -> main service/store -> data
```

See `.cursor/reference/security-boundary.md` for the complete trust model.

## Financial and persistence invariants

- Store money as safe integers in Iraqi dinars and business dates as validated
  `YYYY-MM-DD` values in the Baghdad calendar context.
- Supplier balance is derived; never store a mutable running balance.
- Purchases, recorded expense, cash out, supplier debt, and result are separate
  measures. Post one economic movement exactly once.
- Invoice “paid now” creates one linked supplier payment.
- Opening balances and adjustments affect supplier debt only.
- Missing/unavailable work-day sales makes result unavailable; estimated sales
  requires a prominent warning.
- Related headers, items, child payments, and historical batches are atomic.
- Soft deletion is the default. Restore must reproduce the original effect.
- Persistent shape/meaning changes require a new forward migration and older
  compatible backup behavior.

The canonical posting matrix is `.cursor/reference/financial-model.md`.

## Change workflow

1. Confirm requested outcome and authorization. Diagnosis/review does not imply
   permission to edit, publish, delete, or expand scope.
2. Inspect the dirty worktree; preserve unrelated user changes.
3. Trace current behavior end to end and classify impact with
   `.cursor/reference/change-impact-matrix.md`.
4. State finance, migration/backup, security/IPC, and localization impact.
5. Implement the smallest complete vertical slice in dependency order.
6. Add regression coverage for affected formulas, transactions, lifecycle,
   migrations, IPC validation, or UI states.
7. Update documentation only when verified behavior made it stale.
8. Run checks proportional to risk and report only checks actually run.

Baseline implementation gate:

```bash
npm run check:agent-config
npm run format:check
npm run typecheck
npm test
npm run build
```

For release-affecting work, also build/mount the ARM64 DMG and run
`.cursor/reference/release-ledger-scenario.md` against an isolated
`RESTURANET_DATA_DIR`.

## Safety and data handling

- Never use live restaurant data for tests, migrations, or restore experiments.
- Do not log or commit invoice content, attachments, exports, backups, secrets,
  local database files, or machine paths.
- Destructive operations require exact resolved targets and explicit authority.
- Never weaken validation/security to make a test pass.
- Do not claim UI, packaged-app, printing, notarization, or persistence behavior
  from source inspection alone when runtime proof is required.

## Git behavior

- Preserve unrelated user changes.
- Never commit generated `out/`, `release/`, databases, attachments, backups,
  logs, or secrets.
- Use conventional commit messages.
- In this repository, when the user says **commit**, they mean commit the
  intended work **and push it to GitHub**. Verify the remote branch SHA after
  pushing.
- Never force-push, rewrite history, or publish without the user’s request.

## Project toolkit

- `.cursor/rules/`: persistent, file-scoped constraints.
- `.cursor/reference/`: canonical finance, security, impact, and release detail.
- `.cursor/skills/`: procedures discovered when a task matches.
- `.cursor/commands/`: explicit `/` workflows.
- `.cursor/agents/`: focused read-only reviewers, not default ceremony.

Use the smallest applicable tool. Multiple agents are justified only for
independent review surfaces; delegation never broadens authorization or replaces
the main agent’s verification.
