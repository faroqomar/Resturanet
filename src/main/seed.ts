import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { CatalogKind } from "../shared/contracts";

const defaults: Record<CatalogKind, string[]> = {
  supplier_type: [
    "مورد دجاج",
    "مورد غذائية",
    "مورد مخضر",
    "مورد فلين أو تغليف",
    "مورد غاز",
    "مورد كاز",
    "مورد لحوم",
    "مورد ألبان",
    "مورد مشروبات غازية",
    "مورد آخر",
  ],
  expense_type: [
    "الإيجار",
    "الرواتب",
    "يوميات العمال",
    "كهرباء",
    "ماء",
    "إنترنت",
    "صيانة",
    "مواد تنظيف",
    "نقل",
    "غاز",
    "فلين أو تغليف",
    "مصروف متنوع",
    "نوع مخصص",
  ],
  sales_category: ["صالة المطعم", "سفري", "توصيل", "أخرى"],
  restaurant_expense_category: [
    "صمون",
    "مخضر",
    "لحم",
    "خبز",
    "غاز",
    "لحوم + ألبان",
    "غذائية",
    "مشروبات غازية",
    "أسواق إبراهيم",
    "الدجاج المصروف",
    "الدجاج المتبقي",
    "الفلافل",
    "مشتريات",
    "يوميات العمال",
  ],
};

export function seedCatalogs(db: Database.Database): void {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO catalogs(id, kind, name, active, built_in) VALUES (?, ?, ?, 1, 1)",
  );
  const seed = db.transaction(() => {
    for (const [kind, names] of Object.entries(defaults) as Array<
      [CatalogKind, string[]]
    >) {
      for (const name of names) insert.run(randomUUID(), kind, name);
    }
  });
  seed();
}
