# Change impact matrix

Use this matrix before editing. It prevents locally correct changes that leave a
contract, persistence path, report, or installed build inconsistent.

| Change type             | Inspect first                                 | Usually change                        | Required proof                               |
| ----------------------- | --------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| Pure financial formula  | `src/shared/finance.ts`, callers, reports     | finance helper and tests              | table-driven edge cases and exact totals     |
| New/changed saved field | contracts, schemas, `database.ts`, `store.ts` | shared + migration + store + form     | fresh DB, previous schema, CRUD, restart     |
| Renderer API method     | contracts, schemas, `ipc.ts`, preload         | shared + main + preload + renderer    | malformed input rejected; success serialized |
| Financial transaction   | posting matrix, store query/write paths       | store transaction + reports + UI      | create/edit/date move/trash/restore totals   |
| Historical batch type   | discriminated union and normal save path      | schema + batch dispatcher + grid      | invalid row rolls back whole batch           |
| Attachment behavior     | `files.ts`, entity save, trash                | main file service + IPC + UI          | type/size/path rejection and lifecycle       |
| Backup/restore          | `backup.ts`, migrations, file service         | manifest/staging/reopen flow          | real DB + attachment round-trip              |
| Translation/UI copy     | i18n dictionary and component                 | both locale entries + tests           | AR/RTL and EN/LTR, live switch, restart      |
| Layout/navigation       | `.impeccable.md`, layout and CSS              | renderer only unless contract changes | keyboard, focus, long text, narrow window    |
| CSV/print               | report rows, translator, IPC output           | main export/print + localized labels  | BOM/columns/escaping; both languages         |
| Release/package         | `package.json`, scripts, native modules       | build config/scripts/docs             | installed ARM64 DMG scenario                 |

## Vertical-slice order

For behavior that crosses the desktop boundary, implement in this order:

1. domain contract and invariants;
2. Zod input validation;
3. schema migration, if persistent shape changes;
4. transactional store/service behavior;
5. allowlisted IPC handler;
6. narrow preload method;
7. renderer state and UI;
8. focused tests;
9. affected docs;
10. packaged-app check when runtime or native behavior changed.

## Scope test

Before adding a new abstraction, answer:

- Which duplicate behavior exists today?
- Which current call sites will use the abstraction in this change?
- Does it preserve process isolation and serializability?
- Can a smaller complete change meet the request?

If the first two answers have no evidence, defer the abstraction.

## Change report contract

Every completed implementation should report:

- outcome visible to the user;
- financial classification change, or “none”;
- migration/backup impact, or “none”;
- security/IPC impact, or “none”;
- AR/EN and RTL/LTR impact, or “none”;
- checks actually run and their result;
- remaining environmental limitations.
