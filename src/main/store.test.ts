// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { DatabaseManager } from "./database";
import { seedCatalogs } from "./seed";
import { AppStore } from "./store";

describe("تكامل دفتر المطعم مع SQLite", () => {
  let directory: string;
  let manager: DatabaseManager;
  let store: AppStore;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "resturanet-test-"));
    manager = new DatabaseManager(join(directory, "test.sqlite"));
    seedCatalogs(manager.db);
    store = new AppStore(manager.db);
  });

  afterEach(() => {
    manager.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("يحفظ يومًا متكاملًا دون تكرار المصروفات أو الدفعات", () => {
    const settings = store.settings();
    const supplierType = settings.catalogs.find(
      (item) => item.kind === "supplier_type",
    )!;
    const restaurantCategory = settings.catalogs.find(
      (item) => item.kind === "restaurant_expense_category",
    )!;
    const operatingType = settings.catalogs.find(
      (item) => item.kind === "expense_type",
    )!;
    const supplier = store.saveSupplier({
      name: "مورد الاختبار",
      typeId: supplierType.id,
      openingBalance: 0,
      active: true,
    }).value;

    store.saveRestaurantExpense({
      date: "2026-07-22",
      name: "السوق",
      lines: [{ categoryId: restaurantCategory.id, amount: 20_000 }],
    });
    const invoice = store.saveSupplierInvoice({
      kind: "standard",
      date: "2026-07-22",
      supplierId: supplier.id,
      paidNow: 30_000,
      lines: [
        { name: "مواد غذائية", quantity: 2, unit: "كارتون", total: 100_000 },
      ],
    }).value;
    store.saveSale({
      date: "2026-07-22",
      completeness: "complete",
      manualTotal: 250_000,
      lines: [],
    });
    store.saveOperatingExpense({
      date: "2026-07-22",
      expenseTypeId: operatingType.id,
      totalDue: 50_000,
      payments: [{ date: "2026-07-22", amount: 10_000, method: "cash" }],
    });

    const dashboard = store.dashboard({ from: "2026-07-22", to: "2026-07-22" });
    expect(dashboard.sales).toBe(250_000);
    expect(dashboard.recordedExpenses).toBe(170_000);
    expect(dashboard.cashOut).toBe(60_000);
    expect(dashboard.approximateResult).toBe(80_000);
    expect(dashboard.supplierDebt).toBe(70_000);
    expect(
      store.supplierDetail(supplier.id).ledger.at(-1)?.runningBalance,
    ).toBe(70_000);

    store.trash("supplierInvoice", invoice.id);
    expect(store.listSuppliers(true)[0].balance).toBe(0);
    store.restore("supplierInvoice", invoice.id);
    expect(store.listSuppliers(true)[0].balance).toBe(70_000);
  });

  it("لا يعرض نتيجة عند غياب المبيعات", () => {
    const category = store
      .settings()
      .catalogs.find((item) => item.kind === "restaurant_expense_category")!;
    store.saveRestaurantExpense({
      date: "2026-07-21",
      name: "السوق",
      lines: [{ categoryId: category.id, amount: 10_000 }],
    });
    expect(
      store.dashboard({ from: "2026-07-21", to: "2026-07-21" })
        .approximateResult,
    ).toBeNull();
  });

  it("يسمح بتعديل دفعة موجودة ولا يترك يومًا فارغًا ظاهرًا بعد الحذف", () => {
    const type = store
      .settings()
      .catalogs.find((item) => item.kind === "supplier_type")!;
    const supplier = store.saveSupplier({
      name: "مورد الدفعات",
      typeId: type.id,
      openingBalance: 100_000,
      active: true,
    }).value;
    const payment = store.saveSupplierPayment({
      date: "2026-07-20",
      supplierId: supplier.id,
      amount: 30_000,
    }).value;
    store.saveSupplierPayment({ ...payment, amount: 40_000 });
    expect(store.listSuppliers(true)[0].balance).toBe(60_000);
    store.trash("supplierPayment", payment.id);
    expect(store.workDays({ from: "2026-07-20", to: "2026-07-20" })).toEqual(
      [],
    );
  });

  it("ينقل المورد غير المرتبط إلى السلة ويسترجعه", () => {
    const type = store
      .settings()
      .catalogs.find((item) => item.kind === "supplier_type")!;
    const supplier = store.saveSupplier({
      name: "مورد مؤقت",
      typeId: type.id,
      openingBalance: 0,
      active: true,
    }).value;
    store.trash("supplier", supplier.id);
    expect(store.trashList().some((item) => item.id === supplier.id)).toBe(
      true,
    );
    store.restore("supplier", supplier.id);
    expect(
      store.listSuppliers(true).some((item) => item.id === supplier.id),
    ).toBe(true);
  });

  it("ينشئ نسخة SQLite قابلة للفتح", async () => {
    store.saveRestaurantName("مطعم النسخة");
    const backupPath = join(directory, "backup.sqlite");
    await manager.backup(backupPath);
    const backup = new DatabaseManager(backupPath);
    expect(new AppStore(backup.db).settings().restaurantName).toBe(
      "مطعم النسخة",
    );
    backup.close();
  });

  it("يحفظ اللغة ويعرض أسماء الأقسام الافتراضية بمفاتيح ترجمة ثابتة", () => {
    expect(store.settings().language).toBe("ar");
    const updated = store.saveLanguage("en");
    expect(updated.language).toBe("en");
    expect(
      updated.catalogs.every(
        (item) => !item.builtIn || Boolean(item.translationKey),
      ),
    ).toBe(true);
  });

  it("يفصل تسوية المورد عن المصروف والنقد الخارج", () => {
    const type = store
      .settings()
      .catalogs.find((item) => item.kind === "supplier_type")!;
    const supplier = store.saveSupplier({
      name: "Historical supplier",
      typeId: type.id,
      openingBalance: 0,
      active: true,
    }).value;
    store.saveSupplierOpeningBalance({
      supplierId: supplier.id,
      date: "2026-01-01",
      amount: 100_000,
    });
    store.saveSupplierInvoice({
      kind: "standard",
      date: "2026-01-10",
      supplierId: supplier.id,
      lines: [{ name: "Old invoice", quantity: 1, total: 20_000 }],
    });
    expect(() =>
      store.saveSupplierOpeningBalance({
        supplierId: supplier.id,
        date: "2026-01-10",
        amount: 150_000,
      }),
    ).toThrow("OPENING_BALANCE_CONFIRM_REQUIRED");
    store.saveSupplierOpeningBalance({
      supplierId: supplier.id,
      date: "2026-01-10",
      amount: 150_000,
      confirmExisting: true,
    });

    const dashboard = store.dashboard({
      from: "2026-01-10",
      to: "2026-01-10",
    });
    expect(store.listSuppliers(true)[0].balance).toBe(150_000);
    expect(dashboard.recordedExpenses).toBe(20_000);
    expect(dashboard.cashOut).toBe(0);
    expect(
      store
        .reportRows({ from: "2026-01-10", to: "2026-01-10" })
        .some((row) => row.entityType === "supplierAdjustment"),
    ).toBe(true);
  });

  it("يرتب حركات المورد في اليوم نفسه حسب إنشائها ويحسب الرصيد الجاري", () => {
    const type = store
      .settings()
      .catalogs.find((item) => item.kind === "supplier_type")!;
    const supplier = store.saveSupplier({
      name: "Ordered ledger supplier",
      typeId: type.id,
      openingBalance: 100_000,
      openingBalanceDate: "2026-03-01",
      active: true,
    }).value;
    const invoice = store.saveSupplierInvoice({
      kind: "standard",
      date: "2026-03-01",
      supplierId: supplier.id,
      paidNow: 20_000,
      lines: [{ name: "Same-day purchase", quantity: 1, total: 50_000 }],
    }).value;
    const standalonePayment = store.saveSupplierPayment({
      date: "2026-03-01",
      supplierId: supplier.id,
      amount: 30_000,
    }).value;
    const adjustment = store.saveSupplierAdjustment({
      date: "2026-03-01",
      supplierId: supplier.id,
      direction: "increase_debt",
      amount: 5_000,
      reason: "Same-day correction",
    }).value;

    const ledger = store.supplierDetail(supplier.id).ledger;
    expect(ledger.map((entry) => entry.reference)).toEqual([
      "الرصيد الافتتاحي",
      invoice.invoiceNumber,
      `${invoice.invoiceNumber}-P`,
      standalonePayment.paymentNumber,
      adjustment.adjustmentNumber,
    ]);
    expect(ledger.map((entry) => entry.runningBalance)).toEqual([
      100_000, 150_000, 130_000, 100_000, 105_000,
    ]);
  });

  it("يلغي الإدخال الجماعي كاملًا إذا فشل صف واحد", () => {
    const type = store
      .settings()
      .catalogs.find((item) => item.kind === "supplier_type")!;
    const supplier = store.saveSupplier({
      name: "Batch supplier",
      typeId: type.id,
      openingBalance: 0,
      active: true,
    }).value;
    expect(() =>
      store.saveHistoricalBatch([
        {
          type: "supplierAdjustment",
          value: {
            date: "2026-02-01",
            supplierId: supplier.id,
            direction: "increase_debt",
            amount: 10_000,
            reason: "Opening correction",
          },
        },
        {
          type: "supplierAdjustment",
          value: {
            date: "2026-02-01",
            supplierId: supplier.id,
            direction: "increase_debt",
            amount: 0,
            reason: "Invalid row",
          },
        },
      ]),
    ).toThrow();
    expect(store.listSupplierAdjustments()).toHaveLength(0);
    expect(store.workDays({ from: "2026-02-01", to: "2026-02-01" })).toEqual(
      [],
    );
  });

  it("يرحل قاعدة الإصدار الأول ويحافظ على الأقسام والبيانات", () => {
    const legacyPath = join(directory, "legacy.sqlite");
    const legacy = new Database(legacyPath);
    legacy.exec(`
      CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT);
      INSERT INTO schema_migrations(version, applied_at) VALUES (1, CURRENT_TIMESTAMP);
      CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO settings(key, value) VALUES ('restaurant_name', 'Legacy Restaurant');
      CREATE TABLE catalogs(
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        built_in INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(kind, name)
      );
      INSERT INTO catalogs(id, kind, name, active, built_in)
      VALUES ('legacy-rent', 'expense_type', 'الإيجار', 1, 1);
    `);
    legacy.close();

    const migrated = new DatabaseManager(legacyPath);
    seedCatalogs(migrated.db);
    const snapshot = new AppStore(migrated.db).settings();
    expect(snapshot.restaurantName).toBe("Legacy Restaurant");
    expect(snapshot.language).toBe("ar");
    expect(
      snapshot.catalogs.find((item) => item.id === "legacy-rent")
        ?.translationKey,
    ).toBe("expense.rent");
    expect(
      (
        migrated.db
          .prepare(
            "SELECT COUNT(*) count FROM schema_migrations WHERE version=2",
          )
          .get() as { count: number }
      ).count,
    ).toBe(1);
    migrated.close();
  });
});
