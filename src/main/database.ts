import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const schema = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalogs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('supplier_type','expense_type','sales_category','restaurant_expense_category')),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  built_in INTEGER NOT NULL DEFAULT 0 CHECK(built_in IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kind, name)
);

CREATE TABLE IF NOT EXISTS work_days (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type_id TEXT NOT NULL REFERENCES catalogs(id),
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  opening_balance INTEGER NOT NULL DEFAULT 0 CHECK(opening_balance >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS restaurant_expense_invoices (
  id TEXT PRIMARY KEY,
  work_day_id TEXT NOT NULL REFERENCES work_days(id),
  invoice_number TEXT NOT NULL,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  manual_total INTEGER CHECK(manual_total IS NULL OR manual_total >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS restaurant_expense_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES restaurant_expense_invoices(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES catalogs(id),
  amount INTEGER NOT NULL CHECK(amount > 0),
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  work_day_id TEXT NOT NULL REFERENCES work_days(id),
  kind TEXT NOT NULL CHECK(kind IN ('standard','produce')),
  invoice_number TEXT NOT NULL,
  date TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  previous_balance_snapshot INTEGER NOT NULL DEFAULT 0,
  balance_adjustment INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS supplier_invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity REAL NOT NULL CHECK(quantity > 0),
  unit TEXT NOT NULL DEFAULT '',
  unit_price INTEGER CHECK(unit_price IS NULL OR unit_price >= 0),
  total INTEGER NOT NULL CHECK(total > 0),
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  work_day_id TEXT NOT NULL REFERENCES work_days(id),
  payment_number TEXT NOT NULL,
  date TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  amount INTEGER NOT NULL CHECK(amount > 0),
  method TEXT NOT NULL DEFAULT 'cash' CHECK(method IN ('cash','transfer','other')),
  notes TEXT NOT NULL DEFAULT '',
  supplier_invoice_id TEXT REFERENCES supplier_invoices(id) ON DELETE SET NULL,
  overpayment_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(overpayment_confirmed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  work_day_id TEXT NOT NULL REFERENCES work_days(id),
  record_number TEXT NOT NULL,
  date TEXT NOT NULL,
  completeness TEXT NOT NULL CHECK(completeness IN ('complete','estimated','unavailable')),
  manual_total INTEGER CHECK(manual_total IS NULL OR manual_total >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sales_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES catalogs(id),
  name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount >= 0)
);

CREATE TABLE IF NOT EXISTS operating_expenses (
  id TEXT PRIMARY KEY,
  work_day_id TEXT NOT NULL REFERENCES work_days(id),
  record_number TEXT NOT NULL,
  date TEXT NOT NULL,
  expense_type_id TEXT NOT NULL REFERENCES catalogs(id),
  recipient TEXT NOT NULL DEFAULT '',
  total_due INTEGER NOT NULL CHECK(total_due > 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS operating_expense_payments (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES operating_expenses(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  method TEXT NOT NULL DEFAULT 'cash' CHECK(method IN ('cash','transfer','other')),
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  stored_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK(size >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurant_expense_date ON restaurant_expense_invoices(date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_date ON supplier_invoices(date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_supplier ON supplier_invoices(supplier_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_date ON supplier_payments(date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_supplier ON supplier_payments(supplier_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_operating_expense_date ON operating_expenses(date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_attachment_entity ON attachments(entity_type, entity_id);
`;

export class DatabaseManager {
  private connection: Database.Database;

  constructor(public readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.connection = this.open(path);
    this.migrate();
  }

  get db(): Database.Database {
    return this.connection;
  }

  private open(path: string): Database.Database {
    const db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    return db;
  }

  private migrate(): void {
    this.connection.exec(schema);
    this.connection
      .prepare("INSERT OR IGNORE INTO schema_migrations(version) VALUES (?)")
      .run(1);
    this.connection
      .prepare(
        "INSERT OR IGNORE INTO settings(key, value) VALUES ('restaurant_name', '')",
      )
      .run();
    this.connection
      .prepare(
        "INSERT OR IGNORE INTO settings(key, value) VALUES ('currency', 'IQD')",
      )
      .run();
  }

  close(): void {
    if (this.connection.open) this.connection.close();
  }

  reopen(): void {
    if (this.connection.open) this.connection.close();
    this.connection = this.open(this.path);
    this.migrate();
  }

  async backup(destination: string): Promise<void> {
    await this.connection.backup(destination);
  }
}
