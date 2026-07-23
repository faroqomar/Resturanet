# Debug log policy

Runtime debug logs are temporary evidence, not project source.

- Write temporary logs outside the repository or to ignored `*.log` files.
- Never commit restaurant data, invoice contents, attachment names, phone
  numbers, local user paths, database rows, backup contents, tokens, or session
  identifiers.
- Prefer a short reproduction note and a regression test over a permanent log.
- Remove instrumentation after the issue is fixed unless it is a privacy-safe,
  purposeful operational signal.
- When sharing a log, redact values and retain only timestamp, subsystem, event
  name, correlation ID, and a sanitized error category.

Source debug logs are copied into this repository only when they contain
Resturanet evidence and are fully sanitized. The reviewed source log did not
meet that relevance requirement, so it was intentionally excluded.
