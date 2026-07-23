# Resturanet Cursor workspace

This directory is a project-specific engineering harness. It is intentionally
small enough to stay relevant and concrete enough to verify itself.

## What loads when

| Primitive        | Location             | Purpose                                          |
| ---------------- | -------------------- | ------------------------------------------------ |
| Repository guide | `../AGENTS.md`       | durable authority, scope, and definition of done |
| Context          | `PROJECT_CONTEXT.md` | concise product and source map                   |
| Rules            | `rules/*.mdc`        | persistent or file-scoped constraints            |
| References       | `reference/*.md`     | canonical details rules/skills point to          |
| Skills           | `skills/*/SKILL.md`  | discoverable procedural playbooks                |
| Commands         | `commands/*.md`      | user-invoked repeatable `/` workflows            |
| Subagents        | `agents/*.md`        | independent read-only review perspectives        |
| CLI safety       | `cli.json`           | project-level deny rules                         |
| Context ignore   | `../.cursorignore`   | excludes builds, data, logs, and secrets         |

`prompt.md` is a portable manual task contract. Cursor does not need it for
normal command discovery.

## Commands

- `/implement-feature`
- `/fix-bug`
- `/review-change`
- `/trace-financial-flow`
- `/verify-release`
- `/commit-and-push`

## Review agents

- `architecture-reviewer`: process ownership and minimum complete change
- `financial-integrity-reviewer`: postings, transactions, migration, totals
- `security-reviewer`: Electron, IPC, file, attachment, and restore threats
- `ui-quality-reviewer`: Arabic/English, RTL/LTR, keyboard, resilient UX
- `release-auditor`: installed ARM64 artifact acceptance

Agents are reviewers, not ceremony. Use one when its independent context can
find defects the main implementation pass may miss.

## Self-check

```bash
npm run check:agent-config
```

Root `AGENTS.md` is the entry point and has precedence over this directory.
