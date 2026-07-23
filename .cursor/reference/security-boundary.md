# Security boundary

Resturanet protects valuable local restaurant data even though it is an offline,
single-user application. The renderer is an untrusted presentation surface.

## Trust zones

```text
untrusted UI/input
  -> typed preload facade
  -> allowlisted IPC + sender check + Zod parse
  -> main-process service/store transaction
  -> SQLite or validated local file operation
```

| Zone     | May own                                               | Must not receive                                            |
| -------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Renderer | React state, formatted DTOs, opaque attachment tokens | Node.js, Electron internals, SQL, raw filesystem capability |
| Preload  | narrow `contextBridge` methods                        | generic `invoke`, arbitrary channels, business persistence  |
| Main     | IPC validation, SQLite, dialogs, files, backup, print | unparsed renderer input                                     |
| Shared   | serializable types, schemas, catalogs, pure finance   | Electron, React, SQLite, filesystem side effects            |

## Non-negotiable controls

- `nodeIntegration: false`, `contextIsolation: true`, sandbox and web security
  remain enabled.
- Renderer CSP denies remote scripts, connections, objects, and unsafe dynamic
  execution.
- Navigation, popups, permission requests, and unexpected external protocols
  are blocked.
- Every IPC channel is named, allowlisted, sender-checked, and schema-validated.
- Errors returned to the UI contain no stack, SQL, backup internals, or
  unintended local path.

## File and attachment controls

- Accept only JPG/JPEG/PNG/PDF and enforce 25 MB before commit.
- Treat extensions and MIME labels as hints; never execute attachment content.
- Resolve paths and prove the source/target remains inside the intended root.
- Copy to generated internal names; preserve the original name only as display
  metadata.
- Opening a file is an explicit user action through a narrow main-process
  method.

## Backup and restore controls

- Create the SQLite snapshot through the supported database backup API.
- Manifest schema/app versions are parsed and compatibility-checked.
- ZIP entries use an allowlist and reject absolute paths, traversal, symlinks,
  duplicates, and unexpected entries.
- Bound entry count and extracted size before materializing untrusted content.
- Extract to staging outside live data, validate fully, create a safety backup,
  then swap data and reopen.
- A failed restore leaves the current database and attachments usable.

## Review triggers

Run a security review for any new IPC method, dependency, external URL, file
format, import/export, backup change, shell execution, native module, logging
change, or renderer permission. “Local only” is not a reason to skip the review.
