# Commit and push the intended work

In this repository, “commit” means commit **and push**.

1. Inspect status, full diff, branch, upstream, and remote URL.
2. Separate intended work from unrelated user changes.
3. Exclude generated output, databases, attachments, backups, logs, secrets,
   and machine-specific files.
4. Run the relevant current-tree checks if they have not already passed.
5. Stage only the intended files and inspect the staged diff.
6. Create one coherent conventional commit: `type(scope): imperative subject`.
7. Push the current branch to `origin` without force.
8. Compare local `HEAD` with the remote branch SHA.

Report commit SHA, message, branch, repository URL, checks, and remote-SHA
verification. A local commit is not a successful result.
