// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
});
