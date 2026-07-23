# Trace a financial flow

Investigate the named operation from user input to every derived output.

1. Identify its contract and Zod schema.
2. Trace renderer -> preload -> IPC -> store transaction -> SQLite tables.
3. Classify purchases, recorded expense, cash out, supplier debt, and sales
   result using `.cursor/reference/financial-model.md`.
4. Trace work-day creation/date movement, report queries, supplier statement,
   dashboard, trash/restore, attachments, and historical entry.
5. Compare code with existing tests and provide a small numeric counterexample
   that would reveal double counting or omission.

Return verified facts with exact file/symbol evidence, a posting table, gaps or
unknowns, and recommended tests. Do not modify code unless explicitly asked.
