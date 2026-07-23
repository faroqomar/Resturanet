# Review the current change

Review the current diff and the affected surrounding implementation. Do not edit
unless the user separately asks for fixes.

Prioritize:

1. financial correctness and double counting;
2. transaction, migration, trash, and backup compatibility;
3. Electron, IPC, file, and restore security;
4. Arabic/English, RTL/LTR, keyboard, and error-state regressions;
5. missing tests, stale docs, and unnecessary complexity.

Report only actionable findings. Each finding needs severity, file and tight
line range, concrete evidence, user impact, and the smallest safe correction.
Do not report formatting preferences or hypothetical issues without a reachable
failure path.

If no findings remain, say so and list inspected areas and checks actually run.
