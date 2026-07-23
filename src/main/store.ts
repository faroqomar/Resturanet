import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  AppLocale,
  CatalogItem,
  CatalogKind,
  DashboardSummary,
  DateRange,
  EntityType,
  LedgerEntry,
  OperatingExpense,
  OperatingExpenseInput,
  ReportFilters,
  ReportRow,
  RestaurantExpense,
  RestaurantExpenseInput,
  Sale,
  SaleInput,
  SaveResult,
  SettingsSnapshot,
  Supplier,
  SupplierAdjustment,
  SupplierAdjustmentInput,
  SupplierInvoice,
  SupplierInvoiceInput,
  SupplierInvoiceKind,
  SupplierPayment,
  SupplierPaymentInput,
  SupplierOpeningBalanceInput,
  HistoricalEntryInput,
  TrashItem,
  WorkDayDetail,
  WorkDaySummary,
} from "../shared/contracts";
import {
  approximateResult,
  paymentStatus,
  supplierBalance,
} from "../shared/finance";

type Row = Record<string, any>;

const now = () => new Date().toISOString();
const asBool = (value: unknown) => Boolean(value);
const rangeSql = (range?: DateRange, column = "date") =>
  range ? ` AND ${column} BETWEEN @from AND @to` : "";

export class AppStore {
  constructor(private readonly db: Database.Database) {}

  private workDay(date: string): string {
    const existing = this.db
      .prepare("SELECT id FROM work_days WHERE date = ?")
      .get(date) as Row | undefined;
    if (existing) return existing.id;
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO work_days(id, date) VALUES (?, ?)")
      .run(id, date);
    return id;
  }

  private cleanupWorkDay(id: string): void {
    const row = this.db
      .prepare(
        `
      SELECT
        (SELECT COUNT(*) FROM restaurant_expense_invoices WHERE work_day_id = @id AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM supplier_invoices WHERE work_day_id = @id AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM supplier_payments WHERE work_day_id = @id AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM supplier_adjustments WHERE work_day_id = @id AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM sales WHERE work_day_id = @id AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM operating_expenses WHERE work_day_id = @id AND deleted_at IS NULL) AS count
    `,
      )
      .get({ id }) as Row;
    if (row.count !== 0) return;
    const all = this.db
      .prepare(
        `
      SELECT
        (SELECT COUNT(*) FROM restaurant_expense_invoices WHERE work_day_id = @id) +
        (SELECT COUNT(*) FROM supplier_invoices WHERE work_day_id = @id) +
        (SELECT COUNT(*) FROM supplier_payments WHERE work_day_id = @id) +
        (SELECT COUNT(*) FROM supplier_adjustments WHERE work_day_id = @id) +
        (SELECT COUNT(*) FROM sales WHERE work_day_id = @id) +
        (SELECT COUNT(*) FROM operating_expenses WHERE work_day_id = @id) AS count
    `,
      )
      .get({ id }) as Row;
    if (all.count === 0)
      this.db.prepare("DELETE FROM work_days WHERE id = ?").run(id);
  }

  private nextNumber(prefix: string, date: string, table: string): string {
    const allowed: Record<string, string> = {
      restaurant_expense_invoices: "invoice_number",
      supplier_invoices: "invoice_number",
      supplier_payments: "payment_number",
      supplier_adjustments: "adjustment_number",
      sales: "record_number",
      operating_expenses: "record_number",
      operating_expense_payments: "payment_number",
    };
    const column = allowed[table];
    if (!column) throw new Error("نوع المستند غير صالح");
    const compactDate = date.replaceAll("-", "");
    const pattern = `${prefix}-${compactDate}-%`;
    const count =
      (
        this.db
          .prepare(
            `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} LIKE ?`,
          )
          .get(pattern) as Row
      ).count + 1;
    return `${prefix}-${compactDate}-${String(count).padStart(3, "0")}`;
  }

  private assertDuplicate(
    table: string,
    numberColumn: string,
    number: string,
    id: string | undefined,
    extraSql: string,
    extra: Record<string, unknown>,
    allow?: boolean,
  ): void {
    if (allow) return;
    const row = this.db
      .prepare(
        `SELECT id FROM ${table} WHERE ${numberColumn} = @number AND deleted_at IS NULL AND id != @id ${extraSql} LIMIT 1`,
      )
      .get({ number, id: id ?? "", ...extra });
    if (row)
      throw new Error(
        "DUPLICATE_CONFIRM_REQUIRED: يوجد مستند آخر بالرقم نفسه. راجع السجل ثم أكد الحفظ إذا كان التكرار صحيحًا.",
      );
  }

  settings(): SettingsSnapshot {
    const values = Object.fromEntries(
      (this.db.prepare("SELECT key, value FROM settings").all() as Row[]).map(
        (row) => [row.key, row.value],
      ),
    );
    return {
      restaurantName: values.restaurant_name ?? "",
      currency: "IQD",
      language: values.language === "en" ? "en" : "ar",
      catalogs: (
        this.db
          .prepare("SELECT * FROM catalogs ORDER BY kind, built_in DESC, name")
          .all() as Row[]
      ).map(this.mapCatalog),
    };
  }

  saveRestaurantName(name: string): SettingsSnapshot {
    const clean = name.trim().slice(0, 160);
    if (!clean) throw new Error("اسم المطعم مطلوب");
    this.db
      .prepare(
        "INSERT INTO settings(key, value) VALUES ('restaurant_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(clean);
    return this.settings();
  }

  saveLanguage(language: AppLocale): SettingsSnapshot {
    this.db
      .prepare(
        "INSERT INTO settings(key, value) VALUES ('language', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(language);
    return this.settings();
  }

  addCatalog(kind: CatalogKind, name: string): CatalogItem {
    const id = randomUUID();
    try {
      this.db
        .prepare(
          "INSERT INTO catalogs(id, kind, name, active, built_in) VALUES (?, ?, ?, 1, 0)",
        )
        .run(id, kind, name.trim());
    } catch {
      throw new Error("هذا النوع موجود مسبقًا");
    }
    return this.mapCatalog(
      this.db.prepare("SELECT * FROM catalogs WHERE id = ?").get(id) as Row,
    );
  }

  toggleCatalog(id: string, active: boolean): CatalogItem {
    this.db
      .prepare("UPDATE catalogs SET active = ? WHERE id = ?")
      .run(active ? 1 : 0, id);
    const row = this.db
      .prepare("SELECT * FROM catalogs WHERE id = ?")
      .get(id) as Row | undefined;
    if (!row) throw new Error("النوع غير موجود");
    return this.mapCatalog(row);
  }

  private mapCatalog = (row: Row): CatalogItem => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    translationKey: row.translation_key ?? null,
    active: asBool(row.active),
    builtIn: asBool(row.built_in),
  });

  listSuppliers(includeInactive = false): Supplier[] {
    const rows = this.db
      .prepare(
        `
      SELECT s.*, c.name AS type_name,
        COALESCE((SELECT SUM(i.total) FROM (
          SELECT si.id, SUM(sii.total) total FROM supplier_invoices si JOIN supplier_invoice_items sii ON sii.invoice_id = si.id
          WHERE si.supplier_id = s.id AND si.deleted_at IS NULL GROUP BY si.id
        ) i), 0) AS purchases,
        COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_id = s.id AND sp.deleted_at IS NULL), 0) AS payments,
        COALESCE((SELECT SUM(balance_adjustment) FROM supplier_invoices si WHERE si.supplier_id = s.id AND si.deleted_at IS NULL), 0) +
        COALESCE((SELECT SUM(CASE direction WHEN 'increase_debt' THEN amount ELSE -amount END) FROM supplier_adjustments sa WHERE sa.supplier_id = s.id AND sa.deleted_at IS NULL), 0) AS adjustments,
        MAX(COALESCE((SELECT MAX(date) FROM supplier_invoices si WHERE si.supplier_id = s.id AND si.deleted_at IS NULL), ''),
            COALESCE((SELECT MAX(date) FROM supplier_payments sp WHERE sp.supplier_id = s.id AND sp.deleted_at IS NULL), ''),
            COALESCE((SELECT MAX(date) FROM supplier_adjustments sa WHERE sa.supplier_id = s.id AND sa.deleted_at IS NULL), '')) AS last_activity
      FROM suppliers s JOIN catalogs c ON c.id = s.type_id
      WHERE s.deleted_at IS NULL ${includeInactive ? "" : "AND s.active = 1"}
      ORDER BY s.active DESC, s.name
    `,
      )
      .all() as Row[];
    return rows.map((row) => this.mapSupplier(row));
  }

  private mapSupplier(row: Row): Supplier {
    const purchases = Number(row.purchases ?? 0);
    const payments = Number(row.payments ?? 0);
    const adjustments = Number(row.adjustments ?? 0);
    return {
      id: row.id,
      name: row.name,
      typeId: row.type_id,
      typeName: row.type_name,
      phone: row.phone,
      address: row.address,
      notes: row.notes,
      openingBalance: Number(row.opening_balance),
      openingBalanceDate: row.opening_balance_date ?? null,
      active: asBool(row.active),
      purchases,
      payments,
      balance: supplierBalance(
        Number(row.opening_balance),
        purchases,
        payments,
        adjustments,
      ),
      lastActivity: row.last_activity || null,
      deletedAt: row.deleted_at,
    };
  }

  saveSupplier(
    input: Omit<Supplier, "id"> & { id?: string },
  ): SaveResult<Supplier> {
    const id = input.id ?? randomUUID();
    if (input.id) {
      this.db
        .prepare(
          `UPDATE suppliers SET name=@name, type_id=@typeId, phone=@phone, address=@address, notes=@notes,
        opening_balance=@openingBalance, opening_balance_date=@openingBalanceDate, active=@active, updated_at=@updatedAt WHERE id=@id AND deleted_at IS NULL`,
        )
        .run({
          ...input,
          id,
          phone: input.phone ?? "",
          address: input.address ?? "",
          notes: input.notes ?? "",
          openingBalanceDate: input.openingBalanceDate ?? null,
          active: input.active ? 1 : 0,
          updatedAt: now(),
        });
    } else {
      this.db
        .prepare(
          `INSERT INTO suppliers(id,name,type_id,phone,address,notes,opening_balance,opening_balance_date,active) VALUES (@id,@name,@typeId,@phone,@address,@notes,@openingBalance,@openingBalanceDate,@active)`,
        )
        .run({
          ...input,
          id,
          phone: input.phone ?? "",
          address: input.address ?? "",
          notes: input.notes ?? "",
          openingBalanceDate: input.openingBalanceDate ?? null,
          active: input.active ? 1 : 0,
        });
    }
    const supplier = this.listSuppliers(true).find((item) => item.id === id);
    if (!supplier) throw new Error("تعذر حفظ المورد");
    return {
      value: supplier,
      message: input.id ? "تم تحديث المورد" : "تمت إضافة المورد",
    };
  }

  supplierBalanceAt(
    supplierId: string,
    date?: string,
    excludeInvoiceId?: string,
  ): number {
    const supplier = this.db
      .prepare(
        "SELECT opening_balance, opening_balance_date FROM suppliers WHERE id = ?",
      )
      .get(supplierId) as Row | undefined;
    if (!supplier) throw new Error("المورد غير موجود");
    const before = date ? " AND date <= @date" : "";
    const purchases = this.db
      .prepare(
        `SELECT COALESCE(SUM(item_total),0) total FROM (
      SELECT si.id, SUM(sii.total) item_total FROM supplier_invoices si JOIN supplier_invoice_items sii ON sii.invoice_id=si.id
      WHERE si.supplier_id=@supplierId AND si.deleted_at IS NULL AND si.id != @exclude ${before} GROUP BY si.id
    )`,
      )
      .get({ supplierId, date, exclude: excludeInvoiceId ?? "" }) as Row;
    const payments = this.db
      .prepare(
        `SELECT COALESCE(SUM(amount),0) total FROM supplier_payments
      WHERE supplier_id=@supplierId AND deleted_at IS NULL AND (supplier_invoice_id IS NULL OR supplier_invoice_id != @exclude) ${before}`,
      )
      .get({ supplierId, date, exclude: excludeInvoiceId ?? "" }) as Row;
    const adjustments = this.db
      .prepare(
        `SELECT COALESCE(SUM(balance_adjustment),0) total FROM supplier_invoices
      WHERE supplier_id=@supplierId AND deleted_at IS NULL AND id != @exclude ${before}`,
      )
      .get({ supplierId, date, exclude: excludeInvoiceId ?? "" }) as Row;
    const standaloneAdjustments = this.db
      .prepare(
        `SELECT COALESCE(SUM(CASE direction WHEN 'increase_debt' THEN amount ELSE -amount END),0) total
      FROM supplier_adjustments WHERE supplier_id=@supplierId AND deleted_at IS NULL ${before}`,
      )
      .get({ supplierId, date }) as Row;
    const opening =
      date &&
      supplier.opening_balance_date &&
      supplier.opening_balance_date > date
        ? 0
        : Number(supplier.opening_balance);
    return supplierBalance(
      opening,
      Number(purchases.total),
      Number(payments.total),
      Number(adjustments.total) + Number(standaloneAdjustments.total),
    );
  }

  supplierDetail(id: string): {
    supplier: Supplier;
    ledger: LedgerEntry[];
    invoices: SupplierInvoice[];
    payments: SupplierPayment[];
    adjustments: SupplierAdjustment[];
  } {
    const supplier = this.listSuppliers(true).find((item) => item.id === id);
    if (!supplier) throw new Error("المورد غير موجود");
    const invoices = this.listSupplierInvoices(undefined, undefined).filter(
      (item) => item.supplierId === id,
    );
    const payments = this.listSupplierPayments().filter(
      (item) => item.supplierId === id,
    );
    const adjustments = this.listSupplierAdjustments().filter(
      (item) => item.supplierId === id,
    );
    type OrderedLedgerEntry = Omit<LedgerEntry, "runningBalance"> & {
      createdAt: string;
      order: number;
    };
    const invoiceMetadata = new Map(
      (
        this.db
          .prepare(
            "SELECT id,created_at,balance_adjustment FROM supplier_invoices WHERE supplier_id=?",
          )
          .all(id) as Row[]
      ).map((row) => [row.id, row]),
    );
    const paymentMetadata = new Map(
      (
        this.db
          .prepare(
            "SELECT id,created_at,supplier_invoice_id FROM supplier_payments WHERE supplier_id=?",
          )
          .all(id) as Row[]
      ).map((row) => [row.id, row]),
    );
    const adjustmentMetadata = new Map(
      (
        this.db
          .prepare(
            "SELECT id,created_at FROM supplier_adjustments WHERE supplier_id=?",
          )
          .all(id) as Row[]
      ).map((row) => [row.id, row]),
    );
    const entries: OrderedLedgerEntry[] = [
      {
        id: `opening-${id}`,
        date: supplier.openingBalanceDate ?? "0000-00-00",
        kind: "opening",
        reference: "الرصيد الافتتاحي",
        debit: supplier.openingBalance,
        credit: 0,
        createdAt: "",
        order: 0,
      },
    ];
    for (const invoice of invoices) {
      const metadata = invoiceMetadata.get(invoice.id);
      entries.push({
        id: invoice.id,
        date: invoice.date,
        kind: "purchase",
        reference: invoice.invoiceNumber,
        debit: invoice.total,
        credit: 0,
        entityId: invoice.id,
        createdAt: metadata?.created_at ?? "",
        order: 10,
      });
      if (metadata?.balance_adjustment)
        entries.push({
          id: `adjustment-${invoice.id}`,
          date: invoice.date,
          kind: "adjustment",
          reference: `تسوية ${invoice.invoiceNumber}`,
          debit: Math.max(0, metadata.balance_adjustment),
          credit: Math.max(0, -metadata.balance_adjustment),
          entityId: invoice.id,
          createdAt: metadata.created_at,
          order: 20,
        });
    }
    for (const payment of payments) {
      const metadata = paymentMetadata.get(payment.id);
      entries.push({
        id: payment.id,
        date: payment.date,
        kind: "payment",
        reference: payment.paymentNumber,
        debit: 0,
        credit: payment.amount,
        entityId: payment.id,
        createdAt: metadata?.created_at ?? "",
        order: metadata?.supplier_invoice_id ? 30 : 40,
      });
    }
    for (const adjustment of adjustments) {
      const metadata = adjustmentMetadata.get(adjustment.id);
      entries.push({
        id: adjustment.id,
        date: adjustment.date,
        kind: "adjustment",
        reference: adjustment.adjustmentNumber,
        debit: adjustment.direction === "increase_debt" ? adjustment.amount : 0,
        credit:
          adjustment.direction === "decrease_debt" ? adjustment.amount : 0,
        entityId: adjustment.id,
        createdAt: metadata?.created_at ?? "",
        order: 50,
      });
    }
    entries.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.order - b.order ||
        a.reference.localeCompare(b.reference),
    );
    let balance = 0;
    const ledger = entries.map(
      ({ createdAt: _createdAt, order: _order, ...entry }) => ({
        ...entry,
        runningBalance: (balance += entry.debit - entry.credit),
      }),
    );
    return { supplier, ledger, invoices, payments, adjustments };
  }

  listRestaurantExpenses(range?: DateRange): RestaurantExpense[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM restaurant_expense_invoices WHERE deleted_at IS NULL ${rangeSql(range)} ORDER BY date DESC, created_at DESC`,
      )
      .all(range ?? {}) as Row[];
    return rows.map((row) => this.restaurantExpense(row.id));
  }

  restaurantExpense(id: string): RestaurantExpense {
    const row = this.db
      .prepare("SELECT * FROM restaurant_expense_invoices WHERE id=?")
      .get(id) as Row | undefined;
    if (!row) throw new Error("الفاتورة غير موجودة");
    const lines = (
      this.db
        .prepare(
          `SELECT i.*, c.name category_name FROM restaurant_expense_items i JOIN catalogs c ON c.id=i.category_id WHERE invoice_id=?`,
        )
        .all(id) as Row[]
    ).map((line) => ({
      id: line.id,
      categoryId: line.category_id,
      categoryName: line.category_name,
      amount: Number(line.amount),
      notes: line.notes,
    }));
    const calculatedTotal = lines.reduce((sum, line) => sum + line.amount, 0);
    return {
      id,
      invoiceNumber: row.invoice_number,
      date: row.date,
      name: row.name,
      notes: row.notes,
      manualTotal: row.manual_total === null ? null : Number(row.manual_total),
      calculatedTotal,
      effectiveTotal:
        row.manual_total === null ? calculatedTotal : Number(row.manual_total),
      lines,
      deletedAt: row.deleted_at,
    };
  }

  saveRestaurantExpense(
    input: RestaurantExpenseInput,
  ): SaveResult<RestaurantExpense> {
    const id = input.id ?? randomUUID();
    const number =
      input.invoiceNumber ||
      this.nextNumber("RE", input.date, "restaurant_expense_invoices");
    this.assertDuplicate(
      "restaurant_expense_invoices",
      "invoice_number",
      number,
      input.id,
      "AND name=@party",
      { party: input.name },
      input.allowDuplicate,
    );
    const transaction = this.db.transaction(() => {
      const workDayId = this.workDay(input.date);
      if (input.id) {
        const old = this.db
          .prepare(
            "SELECT work_day_id FROM restaurant_expense_invoices WHERE id=?",
          )
          .get(id) as Row;
        this.db
          .prepare(
            `UPDATE restaurant_expense_invoices SET work_day_id=@workDayId,invoice_number=@number,date=@date,name=@name,notes=@notes,manual_total=@manualTotal,updated_at=@updatedAt WHERE id=@id`,
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            name: input.name,
            notes: input.notes ?? "",
            manualTotal: input.manualTotal ?? null,
            updatedAt: now(),
          });
        this.db
          .prepare("DELETE FROM restaurant_expense_items WHERE invoice_id=?")
          .run(id);
        if (old && old.work_day_id !== workDayId)
          this.cleanupWorkDay(old.work_day_id);
      } else {
        this.db
          .prepare(
            `INSERT INTO restaurant_expense_invoices(id,work_day_id,invoice_number,date,name,notes,manual_total) VALUES (@id,@workDayId,@number,@date,@name,@notes,@manualTotal)`,
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            name: input.name,
            notes: input.notes ?? "",
            manualTotal: input.manualTotal ?? null,
          });
      }
      const insert = this.db.prepare(
        "INSERT INTO restaurant_expense_items(id,invoice_id,category_id,amount,notes) VALUES (?,?,?,?,?)",
      );
      input.lines.forEach((line) =>
        insert.run(
          line.id ?? randomUUID(),
          id,
          line.categoryId,
          line.amount,
          line.notes ?? "",
        ),
      );
    });
    transaction();
    return {
      value: this.restaurantExpense(id),
      message: input.id ? "تم تحديث فاتورة المصروف" : "تم حفظ فاتورة المصروف",
    };
  }

  listSupplierInvoices(
    kind?: SupplierInvoiceKind,
    range?: DateRange,
  ): SupplierInvoice[] {
    const rows = this.db
      .prepare(
        `SELECT id FROM supplier_invoices WHERE deleted_at IS NULL ${kind ? "AND kind=@kind" : ""} ${rangeSql(range)} ORDER BY date DESC, created_at DESC`,
      )
      .all({ ...(range ?? {}), kind }) as Row[];
    return rows.map((row) => this.supplierInvoice(row.id));
  }

  supplierInvoice(id: string): SupplierInvoice {
    const row = this.db
      .prepare(
        `SELECT si.*, s.name supplier_name FROM supplier_invoices si JOIN suppliers s ON s.id=si.supplier_id WHERE si.id=?`,
      )
      .get(id) as Row | undefined;
    if (!row) throw new Error("فاتورة المورد غير موجودة");
    const lines = (
      this.db
        .prepare("SELECT * FROM supplier_invoice_items WHERE invoice_id=?")
        .all(id) as Row[]
    ).map((line) => ({
      id: line.id,
      name: line.name,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPrice: line.unit_price === null ? null : Number(line.unit_price),
      total: Number(line.total),
      notes: line.notes,
    }));
    const paid = this.db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) total FROM supplier_payments WHERE supplier_invoice_id=? AND deleted_at IS NULL",
      )
      .get(id) as Row;
    const total = lines.reduce((sum, line) => sum + line.total, 0);
    return {
      id,
      kind: row.kind,
      invoiceNumber: row.invoice_number,
      date: row.date,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      previousBalanceOverride: row.balance_adjustment
        ? Number(row.previous_balance_snapshot) + Number(row.balance_adjustment)
        : null,
      previousBalance:
        Number(row.previous_balance_snapshot) + Number(row.balance_adjustment),
      paidNow: Number(paid.total),
      notes: row.notes,
      lines,
      total,
      remainingBalance:
        Number(row.previous_balance_snapshot) +
        Number(row.balance_adjustment) +
        total -
        Number(paid.total),
      deletedAt: row.deleted_at,
    };
  }

  saveSupplierInvoice(
    input: SupplierInvoiceInput,
  ): SaveResult<SupplierInvoice> {
    const id = input.id ?? randomUUID();
    const prefix = input.kind === "produce" ? "PI" : "SI";
    const number =
      input.invoiceNumber ||
      this.nextNumber(prefix, input.date, "supplier_invoices");
    this.assertDuplicate(
      "supplier_invoices",
      "invoice_number",
      number,
      input.id,
      "AND supplier_id=@supplierId",
      { supplierId: input.supplierId },
      input.allowDuplicate,
    );
    const baseBalance = this.supplierBalanceAt(
      input.supplierId,
      input.date,
      input.id,
    );
    const adjustment =
      input.previousBalanceOverride == null
        ? 0
        : input.previousBalanceOverride - baseBalance;
    const total = input.lines.reduce((sum, line) => sum + line.total, 0);
    if (
      (input.paidNow ?? 0) > baseBalance + adjustment + total &&
      !input.confirmOverpayment
    )
      throw new Error(
        "OVERPAYMENT_CONFIRM_REQUIRED: الدفعة أكبر من دين المورد. أكد الحفظ لإنشاء رصيد لصالح المطعم.",
      );
    const transaction = this.db.transaction(() => {
      const workDayId = this.workDay(input.date);
      const createdAt = now();
      if (input.id) {
        const old = this.db
          .prepare("SELECT work_day_id FROM supplier_invoices WHERE id=?")
          .get(id) as Row;
        this.db
          .prepare(
            `UPDATE supplier_invoices SET work_day_id=@workDayId,kind=@kind,invoice_number=@number,date=@date,supplier_id=@supplierId,
          previous_balance_snapshot=@baseBalance,balance_adjustment=@adjustment,notes=@notes,updated_at=@updatedAt WHERE id=@id`,
          )
          .run({
            id,
            workDayId,
            kind: input.kind,
            number,
            date: input.date,
            supplierId: input.supplierId,
            baseBalance,
            adjustment,
            notes: input.notes ?? "",
            updatedAt: now(),
          });
        this.db
          .prepare("DELETE FROM supplier_invoice_items WHERE invoice_id=?")
          .run(id);
        this.db
          .prepare("DELETE FROM supplier_payments WHERE supplier_invoice_id=?")
          .run(id);
        if (old?.work_day_id !== workDayId)
          this.cleanupWorkDay(old.work_day_id);
      } else {
        this.db
          .prepare(
            `INSERT INTO supplier_invoices(id,work_day_id,kind,invoice_number,date,supplier_id,previous_balance_snapshot,balance_adjustment,notes,created_at)
          VALUES (@id,@workDayId,@kind,@number,@date,@supplierId,@baseBalance,@adjustment,@notes,@createdAt)`,
          )
          .run({
            id,
            workDayId,
            kind: input.kind,
            number,
            date: input.date,
            supplierId: input.supplierId,
            baseBalance,
            adjustment,
            notes: input.notes ?? "",
            createdAt,
          });
      }
      const insertLine = this.db.prepare(
        "INSERT INTO supplier_invoice_items(id,invoice_id,name,quantity,unit,unit_price,total,notes) VALUES (?,?,?,?,?,?,?,?)",
      );
      input.lines.forEach((line) =>
        insertLine.run(
          line.id ?? randomUUID(),
          id,
          line.name,
          line.quantity,
          line.unit ?? "",
          line.unitPrice ?? null,
          line.total,
          line.notes ?? "",
        ),
      );
      if ((input.paidNow ?? 0) > 0) {
        this.db
          .prepare(
            `INSERT INTO supplier_payments(id,work_day_id,payment_number,date,supplier_id,amount,method,notes,supplier_invoice_id,overpayment_confirmed,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          )
          .run(
            randomUUID(),
            workDayId,
            `${number}-P`,
            input.date,
            input.supplierId,
            input.paidNow,
            "cash",
            "دفعة مع الفاتورة",
            id,
            input.confirmOverpayment ? 1 : 0,
            new Date(new Date(createdAt).getTime() + 1).toISOString(),
          );
      }
    });
    transaction();
    return {
      value: this.supplierInvoice(id),
      message: input.id ? "تم تحديث فاتورة المورد" : "تم حفظ فاتورة المورد",
    };
  }

  listSupplierPayments(range?: DateRange): SupplierPayment[] {
    const rows = this.db
      .prepare(
        `SELECT sp.*,s.name supplier_name FROM supplier_payments sp JOIN suppliers s ON s.id=sp.supplier_id WHERE sp.deleted_at IS NULL ${rangeSql(range, "sp.date")} ORDER BY sp.date DESC,sp.created_at DESC`,
      )
      .all(range ?? {}) as Row[];
    return rows.map((row) => this.mapSupplierPayment(row));
  }

  private mapSupplierPayment(row: Row): SupplierPayment {
    return {
      id: row.id,
      paymentNumber: row.payment_number,
      date: row.date,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      amount: Number(row.amount),
      method: row.method,
      notes: row.notes,
      invoiceId: row.supplier_invoice_id,
      confirmOverpayment: asBool(row.overpayment_confirmed),
      deletedAt: row.deleted_at,
    };
  }

  supplierPayment(id: string): SupplierPayment {
    const row = this.db
      .prepare(
        "SELECT sp.*,s.name supplier_name FROM supplier_payments sp JOIN suppliers s ON s.id=sp.supplier_id WHERE sp.id=?",
      )
      .get(id) as Row | undefined;
    if (!row) throw new Error("الدفعة غير موجودة");
    return this.mapSupplierPayment(row);
  }

  saveSupplierPayment(
    input: SupplierPaymentInput,
  ): SaveResult<SupplierPayment> {
    const id = input.id ?? randomUUID();
    const number =
      input.paymentNumber ||
      this.nextNumber("SP", input.date, "supplier_payments");
    this.assertDuplicate(
      "supplier_payments",
      "payment_number",
      number,
      input.id,
      "AND supplier_id=@supplierId",
      { supplierId: input.supplierId },
      input.allowDuplicate,
    );
    const existing = input.id
      ? (this.db
          .prepare(
            "SELECT amount,supplier_id FROM supplier_payments WHERE id=? AND deleted_at IS NULL",
          )
          .get(input.id) as Row | undefined)
      : undefined;
    const balance =
      this.supplierBalanceAt(input.supplierId, input.date) +
      (existing?.supplier_id === input.supplierId
        ? Number(existing.amount)
        : 0);
    if (input.amount > balance && !input.confirmOverpayment)
      throw new Error(
        "OVERPAYMENT_CONFIRM_REQUIRED: الدفعة أكبر من دين المورد. أكد الحفظ لإنشاء رصيد لصالح المطعم.",
      );
    const transaction = this.db.transaction(() => {
      const workDayId = this.workDay(input.date);
      const createdAt = now();
      if (input.id) {
        const old = this.db
          .prepare(
            "SELECT work_day_id,supplier_invoice_id FROM supplier_payments WHERE id=?",
          )
          .get(id) as Row;
        if (old?.supplier_invoice_id)
          throw new Error(
            "تُعدّل هذه الدفعة من داخل فاتورة المورد المرتبطة بها",
          );
        this.db
          .prepare(
            `UPDATE supplier_payments SET work_day_id=@workDayId,payment_number=@number,date=@date,supplier_id=@supplierId,amount=@amount,method=@method,notes=@notes,overpayment_confirmed=@confirmed,updated_at=@updatedAt WHERE id=@id`,
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            supplierId: input.supplierId,
            amount: input.amount,
            method: input.method ?? "cash",
            notes: input.notes ?? "",
            confirmed: input.confirmOverpayment ? 1 : 0,
            updatedAt: now(),
          });
        if (old?.work_day_id !== workDayId)
          this.cleanupWorkDay(old.work_day_id);
      } else {
        this.db
          .prepare(
            `INSERT INTO supplier_payments(id,work_day_id,payment_number,date,supplier_id,amount,method,notes,overpayment_confirmed,created_at) VALUES (@id,@workDayId,@number,@date,@supplierId,@amount,@method,@notes,@confirmed,@createdAt)`,
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            supplierId: input.supplierId,
            amount: input.amount,
            method: input.method ?? "cash",
            notes: input.notes ?? "",
            confirmed: input.confirmOverpayment ? 1 : 0,
            createdAt,
          });
      }
    });
    transaction();
    return {
      value: this.supplierPayment(id),
      message: input.id ? "تم تحديث الدفعة" : "تم تسجيل الدفعة",
    };
  }

  listSupplierAdjustments(range?: DateRange): SupplierAdjustment[] {
    const rows = this.db
      .prepare(
        `SELECT sa.*,s.name supplier_name FROM supplier_adjustments sa
         JOIN suppliers s ON s.id=sa.supplier_id
         WHERE sa.deleted_at IS NULL ${rangeSql(range, "sa.date")}
         ORDER BY sa.date DESC,sa.created_at DESC`,
      )
      .all(range ?? {}) as Row[];
    return rows.map((row) => this.mapSupplierAdjustment(row));
  }

  private mapSupplierAdjustment(row: Row): SupplierAdjustment {
    const amount = Number(row.amount);
    return {
      id: row.id,
      adjustmentNumber: row.adjustment_number,
      date: row.date,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      direction: row.direction,
      amount,
      signedAmount: row.direction === "increase_debt" ? amount : -amount,
      reason: row.reason,
      notes: row.notes,
      deletedAt: row.deleted_at,
    };
  }

  supplierAdjustment(id: string): SupplierAdjustment {
    const row = this.db
      .prepare(
        `SELECT sa.*,s.name supplier_name FROM supplier_adjustments sa
         JOIN suppliers s ON s.id=sa.supplier_id WHERE sa.id=?`,
      )
      .get(id) as Row | undefined;
    if (!row) throw new Error("التسوية غير موجودة");
    return this.mapSupplierAdjustment(row);
  }

  saveSupplierAdjustment(
    input: SupplierAdjustmentInput,
  ): SaveResult<SupplierAdjustment> {
    const id = input.id ?? randomUUID();
    const number =
      input.adjustmentNumber ||
      this.nextNumber("ADJ", input.date, "supplier_adjustments");
    this.assertDuplicate(
      "supplier_adjustments",
      "adjustment_number",
      number,
      input.id,
      "AND supplier_id=@supplierId",
      { supplierId: input.supplierId },
      input.allowDuplicate,
    );
    const transaction = this.db.transaction(() => {
      const workDayId = this.workDay(input.date);
      const createdAt = now();
      if (input.id) {
        const old = this.db
          .prepare("SELECT work_day_id FROM supplier_adjustments WHERE id=?")
          .get(id) as Row | undefined;
        this.db
          .prepare(
            `UPDATE supplier_adjustments SET work_day_id=@workDayId,adjustment_number=@number,date=@date,
             supplier_id=@supplierId,direction=@direction,amount=@amount,reason=@reason,notes=@notes,
             updated_at=@updatedAt WHERE id=@id AND deleted_at IS NULL`,
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            supplierId: input.supplierId,
            direction: input.direction,
            amount: input.amount,
            reason: input.reason,
            notes: input.notes ?? "",
            updatedAt: now(),
          });
        if (old && old.work_day_id !== workDayId)
          this.cleanupWorkDay(old.work_day_id);
      } else {
        this.db
          .prepare(
            `INSERT INTO supplier_adjustments(id,work_day_id,adjustment_number,date,supplier_id,direction,amount,reason,notes,created_at)
             VALUES (@id,@workDayId,@number,@date,@supplierId,@direction,@amount,@reason,@notes,@createdAt)`,
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            supplierId: input.supplierId,
            direction: input.direction,
            amount: input.amount,
            reason: input.reason,
            notes: input.notes ?? "",
            createdAt,
          });
      }
    });
    transaction();
    return {
      value: this.supplierAdjustment(id),
      message: input.id ? "تم تحديث التسوية" : "تم تسجيل التسوية",
    };
  }

  saveSupplierOpeningBalance(
    input: SupplierOpeningBalanceInput,
  ): SaveResult<Supplier | SupplierAdjustment> {
    const supplier = this.listSuppliers(true).find(
      (item) => item.id === input.supplierId,
    );
    if (!supplier) throw new Error("المورد غير موجود");
    const movementCount = (
      this.db
        .prepare(
          `SELECT
          (SELECT COUNT(*) FROM supplier_invoices WHERE supplier_id=@id AND deleted_at IS NULL) +
          (SELECT COUNT(*) FROM supplier_payments WHERE supplier_id=@id AND deleted_at IS NULL) +
          (SELECT COUNT(*) FROM supplier_adjustments WHERE supplier_id=@id AND deleted_at IS NULL) count`,
        )
        .get({ id: input.supplierId }) as Row
    ).count;
    const hasHistory =
      movementCount > 0 ||
      supplier.openingBalance !== 0 ||
      Boolean(supplier.openingBalanceDate);
    if (!hasHistory) {
      this.db
        .prepare(
          "UPDATE suppliers SET opening_balance=?,opening_balance_date=?,updated_at=? WHERE id=?",
        )
        .run(input.amount, input.date, now(), input.supplierId);
      const updated = this.listSuppliers(true).find(
        (item) => item.id === input.supplierId,
      );
      if (!updated) throw new Error("تعذر حفظ الرصيد الافتتاحي");
      return { value: updated, message: "تم حفظ الرصيد الافتتاحي" };
    }
    if (!input.confirmExisting)
      throw new Error(
        "OPENING_BALANCE_CONFIRM_REQUIRED: لدى المورد رصيد أو حركات سابقة. سيُحفظ الفرق كتسوية مؤرخة بدل تغيير السجل بصمت.",
      );
    const current = this.supplierBalanceAt(input.supplierId, input.date);
    const difference = input.amount - current;
    if (difference === 0)
      return { value: supplier, message: "الرصيد مطابق ولا يحتاج إلى تسوية" };
    return this.saveSupplierAdjustment({
      date: input.date,
      supplierId: input.supplierId,
      direction: difference > 0 ? "increase_debt" : "decrease_debt",
      amount: Math.abs(difference),
      reason: "تصحيح رصيد افتتاحي",
      notes: input.notes,
    });
  }

  listSales(range?: DateRange): Sale[] {
    const rows = this.db
      .prepare(
        `SELECT id FROM sales WHERE deleted_at IS NULL ${rangeSql(range)} ORDER BY date DESC,created_at DESC`,
      )
      .all(range ?? {}) as Row[];
    return rows.map((row) => this.sale(row.id));
  }

  sale(id: string): Sale {
    const row = this.db.prepare("SELECT * FROM sales WHERE id=?").get(id) as
      Row | undefined;
    if (!row) throw new Error("سجل المبيعات غير موجود");
    const lines = (
      this.db
        .prepare("SELECT * FROM sales_items WHERE sale_id=?")
        .all(id) as Row[]
    ).map((line) => ({
      id: line.id,
      categoryId: line.category_id,
      name: line.name,
      amount: Number(line.amount),
    }));
    const calculatedTotal = lines.reduce((sum, line) => sum + line.amount, 0);
    return {
      id,
      recordNumber: row.record_number,
      date: row.date,
      completeness: row.completeness,
      manualTotal: row.manual_total === null ? null : Number(row.manual_total),
      notes: row.notes,
      lines,
      calculatedTotal,
      effectiveTotal:
        row.completeness === "unavailable"
          ? 0
          : row.manual_total === null
            ? calculatedTotal
            : Number(row.manual_total),
      deletedAt: row.deleted_at,
    };
  }

  saveSale(input: SaleInput): SaveResult<Sale> {
    const id = input.id ?? randomUUID();
    const number =
      input.recordNumber || this.nextNumber("SALE", input.date, "sales");
    this.assertDuplicate(
      "sales",
      "record_number",
      number,
      input.id,
      "",
      {},
      input.allowDuplicate,
    );
    const transaction = this.db.transaction(() => {
      const workDayId = this.workDay(input.date);
      if (input.id) {
        const old = this.db
          .prepare("SELECT work_day_id FROM sales WHERE id=?")
          .get(id) as Row;
        this.db
          .prepare(
            `UPDATE sales SET work_day_id=@workDayId,record_number=@number,date=@date,completeness=@completeness,manual_total=@manualTotal,notes=@notes,updated_at=@updatedAt WHERE id=@id`,
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            completeness: input.completeness,
            manualTotal: input.manualTotal ?? null,
            notes: input.notes ?? "",
            updatedAt: now(),
          });
        this.db.prepare("DELETE FROM sales_items WHERE sale_id=?").run(id);
        if (old?.work_day_id !== workDayId)
          this.cleanupWorkDay(old.work_day_id);
      } else {
        this.db
          .prepare(
            "INSERT INTO sales(id,work_day_id,record_number,date,completeness,manual_total,notes) VALUES (@id,@workDayId,@number,@date,@completeness,@manualTotal,@notes)",
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            completeness: input.completeness,
            manualTotal: input.manualTotal ?? null,
            notes: input.notes ?? "",
          });
      }
      const insert = this.db.prepare(
        "INSERT INTO sales_items(id,sale_id,category_id,name,amount) VALUES (?,?,?,?,?)",
      );
      input.lines.forEach((line) =>
        insert.run(
          line.id ?? randomUUID(),
          id,
          line.categoryId ?? null,
          line.name,
          line.amount,
        ),
      );
    });
    transaction();
    return {
      value: this.sale(id),
      message: input.id ? "تم تحديث المبيعات" : "تم تسجيل المبيعات",
    };
  }

  listOperatingExpenses(range?: DateRange): OperatingExpense[] {
    const rows = this.db
      .prepare(
        `SELECT id FROM operating_expenses WHERE deleted_at IS NULL ${rangeSql(range)} ORDER BY date DESC,created_at DESC`,
      )
      .all(range ?? {}) as Row[];
    return rows.map((row) => this.operatingExpense(row.id));
  }

  operatingExpense(id: string): OperatingExpense {
    const row = this.db
      .prepare(
        "SELECT oe.*,c.name type_name FROM operating_expenses oe JOIN catalogs c ON c.id=oe.expense_type_id WHERE oe.id=?",
      )
      .get(id) as Row | undefined;
    if (!row) throw new Error("المصروف غير موجود");
    const payments = (
      this.db
        .prepare(
          "SELECT * FROM operating_expense_payments WHERE expense_id=? ORDER BY date",
        )
        .all(id) as Row[]
    ).map((p) => ({
      id: p.id,
      paymentNumber: p.payment_number,
      date: p.date,
      amount: Number(p.amount),
      method: p.method,
      notes: p.notes,
    }));
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    return {
      id,
      recordNumber: row.record_number,
      date: row.date,
      expenseTypeId: row.expense_type_id,
      expenseTypeName: row.type_name,
      recipient: row.recipient,
      totalDue: Number(row.total_due),
      notes: row.notes,
      payments,
      paid,
      remaining: Number(row.total_due) - paid,
      paymentStatus: paymentStatus(Number(row.total_due), paid),
      deletedAt: row.deleted_at,
    };
  }

  saveOperatingExpense(
    input: OperatingExpenseInput,
  ): SaveResult<OperatingExpense> {
    const id = input.id ?? randomUUID();
    const number =
      input.recordNumber ||
      this.nextNumber("OE", input.date, "operating_expenses");
    this.assertDuplicate(
      "operating_expenses",
      "record_number",
      number,
      input.id,
      "",
      {},
      input.allowDuplicate,
    );
    const transaction = this.db.transaction(() => {
      const workDayId = this.workDay(input.date);
      if (input.id) {
        const old = this.db
          .prepare("SELECT work_day_id FROM operating_expenses WHERE id=?")
          .get(id) as Row;
        this.db
          .prepare(
            `UPDATE operating_expenses SET work_day_id=@workDayId,record_number=@number,date=@date,expense_type_id=@expenseTypeId,recipient=@recipient,total_due=@totalDue,notes=@notes,updated_at=@updatedAt WHERE id=@id`,
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            expenseTypeId: input.expenseTypeId,
            recipient: input.recipient ?? "",
            totalDue: input.totalDue,
            notes: input.notes ?? "",
            updatedAt: now(),
          });
        this.db
          .prepare("DELETE FROM operating_expense_payments WHERE expense_id=?")
          .run(id);
        if (old?.work_day_id !== workDayId)
          this.cleanupWorkDay(old.work_day_id);
      } else {
        this.db
          .prepare(
            "INSERT INTO operating_expenses(id,work_day_id,record_number,date,expense_type_id,recipient,total_due,notes) VALUES (@id,@workDayId,@number,@date,@expenseTypeId,@recipient,@totalDue,@notes)",
          )
          .run({
            id,
            workDayId,
            number,
            date: input.date,
            expenseTypeId: input.expenseTypeId,
            recipient: input.recipient ?? "",
            totalDue: input.totalDue,
            notes: input.notes ?? "",
          });
      }
      const insert = this.db.prepare(
        "INSERT INTO operating_expense_payments(id,expense_id,payment_number,date,amount,method,notes) VALUES (?,?,?,?,?,?,?)",
      );
      input.payments.forEach((payment, index) =>
        insert.run(
          payment.id ?? randomUUID(),
          id,
          payment.paymentNumber || `${number}-P${index + 1}`,
          payment.date,
          payment.amount,
          payment.method ?? "cash",
          payment.notes ?? "",
        ),
      );
    });
    transaction();
    return {
      value: this.operatingExpense(id),
      message: input.id ? "تم تحديث المصروف" : "تم تسجيل المصروف",
    };
  }

  saveHistoricalBatch(entries: HistoricalEntryInput[]): { saved: number } {
    const transaction = this.db.transaction(() => {
      for (const entry of entries) {
        switch (entry.type) {
          case "restaurantExpense":
            this.saveRestaurantExpense(entry.value);
            break;
          case "supplierInvoice":
            this.saveSupplierInvoice(entry.value);
            break;
          case "supplierPayment":
            this.saveSupplierPayment(entry.value);
            break;
          case "supplierOpeningBalance":
            this.saveSupplierOpeningBalance(entry.value);
            break;
          case "supplierAdjustment":
            this.saveSupplierAdjustment(entry.value);
            break;
          case "sale":
            this.saveSale(entry.value);
            break;
          case "operatingExpense":
            this.saveOperatingExpense(entry.value);
            break;
        }
      }
    });
    transaction();
    return { saved: entries.length };
  }

  workDays(range?: DateRange): WorkDaySummary[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM work_days wd WHERE (
      EXISTS(SELECT 1 FROM restaurant_expense_invoices WHERE work_day_id=wd.id AND deleted_at IS NULL) OR
      EXISTS(SELECT 1 FROM supplier_invoices WHERE work_day_id=wd.id AND deleted_at IS NULL) OR
      EXISTS(SELECT 1 FROM supplier_payments WHERE work_day_id=wd.id AND deleted_at IS NULL) OR
      EXISTS(SELECT 1 FROM supplier_adjustments WHERE work_day_id=wd.id AND deleted_at IS NULL) OR
      EXISTS(SELECT 1 FROM sales WHERE work_day_id=wd.id AND deleted_at IS NULL) OR
      EXISTS(SELECT 1 FROM operating_expenses WHERE work_day_id=wd.id AND deleted_at IS NULL)
    ) ${rangeSql(range, "wd.date")} ORDER BY wd.date DESC`,
      )
      .all(range ?? {}) as Row[];
    return rows.map((row) => this.workDaySummary(row.id, row.date));
  }

  private workDaySummary(id: string, date: string): WorkDaySummary {
    const restaurant = this.listRestaurantExpenses({ from: date, to: date });
    const invoices = this.listSupplierInvoices(undefined, {
      from: date,
      to: date,
    });
    const payments = this.listSupplierPayments({ from: date, to: date });
    const adjustments = this.listSupplierAdjustments({
      from: date,
      to: date,
    });
    const sales = this.listSales({ from: date, to: date });
    const operating = this.listOperatingExpenses({ from: date, to: date });
    const restaurantExpenses = restaurant.reduce(
      (s, item) => s + item.effectiveTotal,
      0,
    );
    const supplierPurchases = invoices.reduce((s, item) => s + item.total, 0);
    const supplierPayments = payments.reduce((s, item) => s + item.amount, 0);
    const salesTotal = sales.reduce((s, item) => s + item.effectiveTotal, 0);
    const operatingExpenses = operating.reduce(
      (s, item) => s + item.totalDue,
      0,
    );
    const operatingPaid = operating.reduce((s, item) => s + item.paid, 0);
    const state =
      sales.length === 0
        ? "missing"
        : sales.some((item) => item.completeness === "unavailable")
          ? "unavailable"
          : sales.some((item) => item.completeness === "estimated")
            ? "estimated"
            : "complete";
    return {
      id,
      date,
      sales: salesTotal,
      restaurantExpenses,
      supplierPurchases,
      supplierPayments,
      operatingExpenses,
      cashOut: restaurantExpenses + supplierPayments + operatingPaid,
      approximateResult: approximateResult(
        salesTotal,
        restaurantExpenses + supplierPurchases + operatingExpenses,
        [state],
      ),
      salesState: state,
      count:
        restaurant.length +
        invoices.length +
        payments.length +
        adjustments.length +
        sales.length +
        operating.length,
    };
  }

  workDayDetail(date: string): WorkDayDetail {
    const row = this.db
      .prepare("SELECT id FROM work_days WHERE date=?")
      .get(date) as Row | undefined;
    if (!row) throw new Error("يوم العمل غير موجود");
    return {
      ...this.workDaySummary(row.id, date),
      restaurantExpenseInvoices: this.listRestaurantExpenses({
        from: date,
        to: date,
      }),
      supplierInvoices: this.listSupplierInvoices(undefined, {
        from: date,
        to: date,
      }),
      supplierPaymentsList: this.listSupplierPayments({ from: date, to: date }),
      supplierAdjustmentsList: this.listSupplierAdjustments({
        from: date,
        to: date,
      }),
      salesRecords: this.listSales({ from: date, to: date }),
      operatingExpensesList: this.listOperatingExpenses({
        from: date,
        to: date,
      }),
    };
  }

  dashboard(range: DateRange): DashboardSummary {
    const days = this.workDays(range);
    const suppliers = this.listSuppliers(true);
    const sales = days.reduce((s, d) => s + d.sales, 0);
    const restaurantExpenses = days.reduce(
      (s, d) => s + d.restaurantExpenses,
      0,
    );
    const supplierPurchases = days.reduce((s, d) => s + d.supplierPurchases, 0);
    const supplierPayments = days.reduce((s, d) => s + d.supplierPayments, 0);
    const operatingExpenses = days.reduce((s, d) => s + d.operatingExpenses, 0);
    const recordedExpenses =
      restaurantExpenses + supplierPurchases + operatingExpenses;
    const cashOut = days.reduce((s, d) => s + d.cashOut, 0);
    const salesComplete =
      days.length > 0 &&
      days.every(
        (d) => d.salesState !== "missing" && d.salesState !== "unavailable",
      );
    const recent = this.reportRows({ ...range })
      .slice(0, 8)
      .map((row) => ({
        id: row.id,
        type: row.entityType,
        date: row.date,
        title: `${row.type} — ${row.party || row.reference}`,
        amount: row.amount,
      }));
    const expenseBreakdownMap = new Map<string, number>();
    for (const row of this.reportRows({ ...range }))
      if (
        !["sale", "supplierPayment", "supplierAdjustment"].includes(
          row.entityType,
        )
      )
        expenseBreakdownMap.set(
          row.category || row.type,
          (expenseBreakdownMap.get(row.category || row.type) ?? 0) + row.amount,
        );
    return {
      range,
      sales,
      restaurantExpenses,
      supplierPurchases,
      supplierPayments,
      operatingExpenses,
      recordedExpenses,
      cashOut,
      supplierDebt: suppliers.reduce(
        (s, supplier) => s + Math.max(0, supplier.balance ?? 0),
        0,
      ),
      approximateResult: salesComplete ? sales - recordedExpenses : null,
      salesComplete,
      documentCount: days.reduce((s, d) => s + d.count, 0),
      suppliersWithDebt: suppliers.filter(
        (supplier) => (supplier.balance ?? 0) > 0,
      ).length,
      recent,
      supplierDebts: suppliers
        .filter((supplier) => (supplier.balance ?? 0) > 0)
        .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
        .slice(0, 8)
        .map((s) => ({ id: s.id, name: s.name, balance: s.balance ?? 0 })),
      dailyChart: [...days].reverse().map((d) => ({
        date: d.date,
        sales: d.sales,
        expenses:
          d.restaurantExpenses + d.supplierPurchases + d.operatingExpenses,
      })),
      expenseBreakdown: [...expenseBreakdownMap.entries()]
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: recordedExpenses
            ? Math.round((amount / recordedExpenses) * 1000) / 10
            : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10),
    };
  }

  private entityTypeFromLabel(label: string): EntityType {
    if (label === "مبيعات") return "sale";
    if (label === "فاتورة مورد" || label === "فاتورة مخضر")
      return "supplierInvoice";
    if (label === "دفعة مورد") return "supplierPayment";
    if (label === "مصروف تشغيلي") return "operatingExpense";
    return "restaurantExpense";
  }

  reportRows(filters: ReportFilters): ReportRow[] {
    const params = {
      from: filters.from,
      to: filters.to,
      supplierId: filters.supplierId ?? "",
      search: `%${filters.search ?? ""}%`,
    };
    const rows = this.db
      .prepare(
        `
      SELECT rei.id,rei.date,'فاتورة مصروف' type,rei.invoice_number reference,rei.name party,c.name category,rei_i.amount amount,rei_i.amount paid,0 remaining,'restaurantExpense' entity_type
      FROM restaurant_expense_invoices rei JOIN restaurant_expense_items rei_i ON rei_i.invoice_id=rei.id JOIN catalogs c ON c.id=rei_i.category_id
      WHERE rei.deleted_at IS NULL AND rei.date BETWEEN @from AND @to
      UNION ALL
      SELECT si.id,si.date,CASE si.kind WHEN 'produce' THEN 'فاتورة مخضر' ELSE 'فاتورة مورد' END,si.invoice_number,s.name,'مشتريات مورد',SUM(sii.total),COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_invoice_id=si.id AND sp.deleted_at IS NULL),0),
        SUM(sii.total)-COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_invoice_id=si.id AND sp.deleted_at IS NULL),0),'supplierInvoice'
      FROM supplier_invoices si JOIN supplier_invoice_items sii ON sii.invoice_id=si.id JOIN suppliers s ON s.id=si.supplier_id
      WHERE si.deleted_at IS NULL AND si.date BETWEEN @from AND @to GROUP BY si.id
      UNION ALL
      SELECT sp.id,sp.date,'دفعة مورد',sp.payment_number,s.name,'دفعات الموردين',sp.amount,sp.amount,0,'supplierPayment'
      FROM supplier_payments sp JOIN suppliers s ON s.id=sp.supplier_id WHERE sp.deleted_at IS NULL AND sp.date BETWEEN @from AND @to
      UNION ALL
      SELECT sad.id,sad.date,'تسوية مورد',sad.adjustment_number,s.name,sad.reason,
        CASE sad.direction WHEN 'increase_debt' THEN sad.amount ELSE -sad.amount END,0,
        CASE sad.direction WHEN 'increase_debt' THEN sad.amount ELSE -sad.amount END,'supplierAdjustment'
      FROM supplier_adjustments sad JOIN suppliers s ON s.id=sad.supplier_id
      WHERE sad.deleted_at IS NULL AND sad.date BETWEEN @from AND @to
      UNION ALL
      SELECT sa.id,sa.date,'مبيعات',sa.record_number,'المطعم','مبيعات',COALESCE(sa.manual_total,(SELECT SUM(amount) FROM sales_items WHERE sale_id=sa.id),0),COALESCE(sa.manual_total,(SELECT SUM(amount) FROM sales_items WHERE sale_id=sa.id),0),0,'sale'
      FROM sales sa WHERE sa.deleted_at IS NULL AND sa.date BETWEEN @from AND @to
      UNION ALL
      SELECT oe.id,oe.date,'مصروف تشغيلي',oe.record_number,oe.recipient,c.name,oe.total_due,COALESCE((SELECT SUM(amount) FROM operating_expense_payments op WHERE op.expense_id=oe.id),0),oe.total_due-COALESCE((SELECT SUM(amount) FROM operating_expense_payments op WHERE op.expense_id=oe.id),0),'operatingExpense'
      FROM operating_expenses oe JOIN catalogs c ON c.id=oe.expense_type_id WHERE oe.deleted_at IS NULL AND oe.date BETWEEN @from AND @to
      ORDER BY date DESC, reference DESC
    `,
      )
      .all(params) as Row[];
    return rows
      .filter(
        (row) =>
          (!filters.entityType || row.entity_type === filters.entityType) &&
          (!filters.supplierId ||
            ([
              "supplierInvoice",
              "supplierPayment",
              "supplierAdjustment",
            ].includes(row.entity_type) &&
              this.belongsToSupplier(
                row.entity_type,
                row.id,
                filters.supplierId,
              ))) &&
          (!filters.search ||
            `${row.reference} ${row.party} ${row.category}`.includes(
              filters.search,
            )),
      )
      .map((row) => ({
        id: row.id,
        entityType: row.entity_type,
        date: row.date,
        type: row.type,
        reference: row.reference,
        party: row.party,
        category: row.category,
        amount: Number(row.amount),
        paid: Number(row.paid),
        remaining: Number(row.remaining),
      }));
  }

  private belongsToSupplier(
    type: string,
    id: string,
    supplierId: string,
  ): boolean {
    const tables: Record<string, string> = {
      supplierInvoice: "supplier_invoices",
      supplierPayment: "supplier_payments",
      supplierAdjustment: "supplier_adjustments",
    };
    const table = tables[type];
    if (!table) return false;
    return Boolean(
      this.db
        .prepare(`SELECT 1 FROM ${table} WHERE id=? AND supplier_id=?`)
        .get(id, supplierId),
    );
  }

  trash(type: TrashItem["type"], id: string): void {
    const tables: Record<TrashItem["type"], string> = {
      supplier: "suppliers",
      restaurantExpense: "restaurant_expense_invoices",
      supplierInvoice: "supplier_invoices",
      supplierPayment: "supplier_payments",
      supplierAdjustment: "supplier_adjustments",
      sale: "sales",
      operatingExpense: "operating_expenses",
    };
    const table = tables[type];
    if (type === "supplier") {
      const count = (
        this.db
          .prepare(
            `SELECT
             (SELECT COUNT(*) FROM supplier_invoices WHERE supplier_id=@id AND deleted_at IS NULL) +
             (SELECT COUNT(*) FROM supplier_payments WHERE supplier_id=@id AND deleted_at IS NULL) +
             (SELECT COUNT(*) FROM supplier_adjustments WHERE supplier_id=@id AND deleted_at IS NULL) count`,
          )
          .get({ id }) as Row
      ).count;
      if (count > 0) {
        this.db.prepare("UPDATE suppliers SET active=0 WHERE id=?").run(id);
        return;
      }
      this.db
        .prepare("UPDATE suppliers SET deleted_at=? WHERE id=?")
        .run(now(), id);
      return;
    }
    const row = this.db
      .prepare(`SELECT work_day_id FROM ${table} WHERE id=?`)
      .get(id) as Row | undefined;
    if (!row) throw new Error("السجل غير موجود");
    this.db
      .prepare(`UPDATE ${table} SET deleted_at=? WHERE id=?`)
      .run(now(), id);
    if (type === "supplierInvoice")
      this.db
        .prepare(
          "UPDATE supplier_payments SET deleted_at=? WHERE supplier_invoice_id=?",
        )
        .run(now(), id);
    if (row?.work_day_id) this.cleanupWorkDay(row.work_day_id);
  }

  trashList(): TrashItem[] {
    const definitions: Array<[TrashItem["type"], string, string]> = [
      ["supplier", "suppliers", "name"],
      ["restaurantExpense", "restaurant_expense_invoices", "invoice_number"],
      ["supplierInvoice", "supplier_invoices", "invoice_number"],
      ["supplierPayment", "supplier_payments", "payment_number"],
      ["supplierAdjustment", "supplier_adjustments", "adjustment_number"],
      ["sale", "sales", "record_number"],
      ["operatingExpense", "operating_expenses", "record_number"],
    ];
    return definitions
      .flatMap(([type, table, title]) =>
        (
          this.db
            .prepare(
              `SELECT id,${title} title,deleted_at FROM ${table} WHERE deleted_at IS NOT NULL`,
            )
            .all() as Row[]
        ).map((row) => ({
          id: row.id,
          type,
          title: row.title,
          deletedAt: row.deleted_at,
        })),
      )
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  }

  restore(type: TrashItem["type"], id: string): void {
    const tables: Record<TrashItem["type"], string> = {
      supplier: "suppliers",
      restaurantExpense: "restaurant_expense_invoices",
      supplierInvoice: "supplier_invoices",
      supplierPayment: "supplier_payments",
      supplierAdjustment: "supplier_adjustments",
      sale: "sales",
      operatingExpense: "operating_expenses",
    };
    const table = tables[type];
    if (type === "supplier") {
      this.db
        .prepare("UPDATE suppliers SET deleted_at=NULL,active=1 WHERE id=?")
        .run(id);
      return;
    }
    const row = this.db
      .prepare(`SELECT date FROM ${table} WHERE id=?`)
      .get(id) as Row | undefined;
    if (row?.date)
      this.db
        .prepare(`UPDATE ${table} SET work_day_id=? WHERE id=?`)
        .run(this.workDay(row.date), id);
    this.db.prepare(`UPDATE ${table} SET deleted_at=NULL WHERE id=?`).run(id);
    if (type === "supplierInvoice")
      this.db
        .prepare(
          "UPDATE supplier_payments SET deleted_at=NULL WHERE supplier_invoice_id=?",
        )
        .run(id);
  }

  removePermanently(type: TrashItem["type"], id: string): void {
    const tables: Record<TrashItem["type"], string> = {
      supplier: "suppliers",
      restaurantExpense: "restaurant_expense_invoices",
      supplierInvoice: "supplier_invoices",
      supplierPayment: "supplier_payments",
      supplierAdjustment: "supplier_adjustments",
      sale: "sales",
      operatingExpense: "operating_expenses",
    };
    const table = tables[type];
    const row = this.db
      .prepare(`SELECT deleted_at FROM ${table} WHERE id=?`)
      .get(id) as Row | undefined;
    if (!row?.deleted_at)
      throw new Error("لا يمكن الحذف النهائي قبل نقل السجل إلى السلة");
    this.db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);
  }
}
