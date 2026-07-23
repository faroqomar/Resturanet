---
name: commit-helper
description: Commit intended Resturanet changes with a conventional message, push them to GitHub, and verify the remote SHA.
---

# Commit helper

In this repository, the user's word **commit** means **commit and push**.

## Preflight

1. Inspect status, unstaged/staged diff, current branch, upstream, and remote URL.
2. Identify intended files from the current request. Preserve unrelated user
   changes; never “clean” them away.
3. Exclude `out/`, `release/`, databases, attachments, backups, logs, secrets,
   exports, and machine paths.
4. Run relevant current-tree checks if they have not already passed.

## Publish

1. Stage only intended files and inspect `git diff --cached`.
2. Use one coherent conventional message: `type(scope): imperative subject`.
3. Commit without rewriting unrelated history.
4. Push the current branch to `origin` without force.
5. Resolve the remote branch SHA and compare it with local `HEAD`.

## Report

Return repository URL, branch, commit SHA and subject, checks run, push result,
and explicit remote-SHA equality. If push fails, preserve the local commit and
report the exact failure and safe next action.

Do not claim publication after a local commit alone.
