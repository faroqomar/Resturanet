import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { defaultCatalogs } from "../shared/catalogs";

export function seedCatalogs(db: Database.Database): void {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO catalogs(id, kind, name, translation_key, active, built_in) VALUES (?, ?, ?, ?, 1, 1)",
  );
  const seed = db.transaction(() => {
    for (const item of defaultCatalogs)
      insert.run(randomUUID(), item.kind, item.ar, item.key);
  });
  seed();
}
