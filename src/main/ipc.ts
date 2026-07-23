import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
} from "electron";
import { writeFileSync } from "node:fs";
import type { BackupService } from "./backup";
import type { AttachmentService } from "./files";
import type { AppStore } from "./store";
import type {
  CatalogKind,
  EntityType,
  HistoricalEntryInput,
  ReportFilters,
  SupplierInvoiceKind,
  TrashItem,
} from "../shared/contracts";
import {
  catalogSchema,
  dateRangeSchema,
  dateSchema,
  idSchema,
  operatingExpenseSchema,
  reportFiltersSchema,
  historicalBatchSchema,
  localeSchema,
  restaurantExpenseSchema,
  saleSchema,
  supplierInvoiceSchema,
  supplierAdjustmentSchema,
  supplierOpeningBalanceSchema,
  supplierPaymentSchema,
  supplierSchema,
} from "../shared/schemas";
import { z } from "zod";
import { defaultCatalogs } from "../shared/catalogs";

const entityTypeSchema = z.enum([
  "restaurantExpense",
  "supplierInvoice",
  "supplierPayment",
  "supplierAdjustment",
  "sale",
  "operatingExpense",
]);
const trashTypeSchema = z.enum([
  "supplier",
  "restaurantExpense",
  "supplierInvoice",
  "supplierPayment",
  "supplierAdjustment",
  "sale",
  "operatingExpense",
]);

function trusted(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url ?? "";
  if (!url.startsWith("file://") && !url.startsWith("http://localhost:"))
    throw new Error("مصدر الطلب غير موثوق");
}

function channel(
  name: string,
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => unknown,
): void {
  ipcMain.handle(name, async (event, ...args) => {
    trusted(event);
    try {
      return await handler(event, ...args);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      throw new Error(message);
    }
  });
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function registerIpc(
  getStore: () => AppStore,
  files: AttachmentService,
  backup: BackupService,
): void {
  channel("settings:get", () => getStore().settings());
  channel("settings:name", (_event, name) =>
    getStore().saveRestaurantName(
      z.string().trim().min(1).max(160).parse(name),
    ),
  );
  channel("settings:language", (event, language) => {
    const locale = localeSchema.parse(language);
    const settings = getStore().saveLanguage(locale);
    BrowserWindow.fromWebContents(event.sender)?.setTitle(
      locale === "ar" ? "نظام المطعم" : "Restaurant System",
    );
    return settings;
  });
  channel("settings:catalog:add", (_event, kind, name) => {
    const value = catalogSchema.parse({ kind, name });
    return getStore().addCatalog(value.kind, value.name);
  });
  channel("settings:catalog:toggle", (_event, id, active) =>
    getStore().toggleCatalog(idSchema.parse(id), z.boolean().parse(active)),
  );

  channel("dashboard:get", (_event, range) =>
    getStore().dashboard(dateRangeSchema.parse(range)),
  );
  channel("work-days:list", (_event, range) =>
    getStore().workDays(range ? dateRangeSchema.parse(range) : undefined),
  );
  channel("work-days:get", (_event, date) =>
    getStore().workDayDetail(dateSchema.parse(date)),
  );

  channel("suppliers:list", (_event, includeInactive) =>
    getStore().listSuppliers(Boolean(includeInactive)),
  );
  channel("suppliers:get", (_event, id) =>
    getStore().supplierDetail(idSchema.parse(id)),
  );
  channel("suppliers:save", (_event, input) =>
    getStore().saveSupplier(supplierSchema.parse(input)),
  );
  channel("suppliers:trash", (_event, id) =>
    getStore().trash("supplier", idSchema.parse(id)),
  );

  channel("restaurant-expenses:list", (_event, range) =>
    getStore().listRestaurantExpenses(
      range ? dateRangeSchema.parse(range) : undefined,
    ),
  );
  channel("restaurant-expenses:get", (_event, id) =>
    getStore().restaurantExpense(idSchema.parse(id)),
  );
  channel("restaurant-expenses:save", (_event, raw) => {
    const input = restaurantExpenseSchema.parse(raw);
    const result = getStore().saveRestaurantExpense(input);
    files.commit(input.attachmentTokens, "restaurantExpense", result.value.id);
    return result;
  });
  channel("restaurant-expenses:trash", (_event, id) =>
    getStore().trash("restaurantExpense", idSchema.parse(id)),
  );

  channel("supplier-invoices:list", (_event, kind, range) =>
    getStore().listSupplierInvoices(
      kind
        ? (z.enum(["standard", "produce"]).parse(kind) as SupplierInvoiceKind)
        : undefined,
      range ? dateRangeSchema.parse(range) : undefined,
    ),
  );
  channel("supplier-invoices:get", (_event, id) =>
    getStore().supplierInvoice(idSchema.parse(id)),
  );
  channel("supplier-invoices:save", (_event, raw) => {
    const input = supplierInvoiceSchema.parse(raw);
    const result = getStore().saveSupplierInvoice(input);
    files.commit(input.attachmentTokens, "supplierInvoice", result.value.id);
    return result;
  });
  channel("supplier-invoices:trash", (_event, id) =>
    getStore().trash("supplierInvoice", idSchema.parse(id)),
  );

  channel("supplier-payments:list", (_event, range) =>
    getStore().listSupplierPayments(
      range ? dateRangeSchema.parse(range) : undefined,
    ),
  );
  channel("supplier-payments:get", (_event, id) =>
    getStore().supplierPayment(idSchema.parse(id)),
  );
  channel("supplier-payments:save", (_event, raw) => {
    const input = supplierPaymentSchema.parse(raw);
    const result = getStore().saveSupplierPayment(input);
    files.commit(input.attachmentTokens, "supplierPayment", result.value.id);
    return result;
  });
  channel("supplier-payments:trash", (_event, id) =>
    getStore().trash("supplierPayment", idSchema.parse(id)),
  );

  channel("supplier-adjustments:list", (_event, range) =>
    getStore().listSupplierAdjustments(
      range ? dateRangeSchema.parse(range) : undefined,
    ),
  );
  channel("supplier-adjustments:get", (_event, id) =>
    getStore().supplierAdjustment(idSchema.parse(id)),
  );
  channel("supplier-adjustments:save", (_event, raw) => {
    const input = supplierAdjustmentSchema.parse(raw);
    const result = getStore().saveSupplierAdjustment(input);
    files.commit(input.attachmentTokens, "supplierAdjustment", result.value.id);
    return result;
  });
  channel("supplier-adjustments:opening", (_event, raw) =>
    getStore().saveSupplierOpeningBalance(
      supplierOpeningBalanceSchema.parse(raw),
    ),
  );
  channel("supplier-adjustments:trash", (_event, id) =>
    getStore().trash("supplierAdjustment", idSchema.parse(id)),
  );

  channel("sales:list", (_event, range) =>
    getStore().listSales(range ? dateRangeSchema.parse(range) : undefined),
  );
  channel("sales:get", (_event, id) => getStore().sale(idSchema.parse(id)));
  channel("sales:save", (_event, raw) => {
    const input = saleSchema.parse(raw);
    const result = getStore().saveSale(input);
    files.commit(input.attachmentTokens, "sale", result.value.id);
    return result;
  });
  channel("sales:trash", (_event, id) =>
    getStore().trash("sale", idSchema.parse(id)),
  );

  channel("operating-expenses:list", (_event, range) =>
    getStore().listOperatingExpenses(
      range ? dateRangeSchema.parse(range) : undefined,
    ),
  );
  channel("operating-expenses:get", (_event, id) =>
    getStore().operatingExpense(idSchema.parse(id)),
  );
  channel("operating-expenses:save", (_event, raw) => {
    const input = operatingExpenseSchema.parse(raw);
    const result = getStore().saveOperatingExpense(input);
    files.commit(input.attachmentTokens, "operatingExpense", result.value.id);
    return result;
  });
  channel("operating-expenses:trash", (_event, id) =>
    getStore().trash("operatingExpense", idSchema.parse(id)),
  );

  channel("historical:validate-batch", (_event, raw) => {
    const result = historicalBatchSchema.safeParse(raw);
    if (result.success) return { valid: true, issues: [] };
    return {
      valid: false,
      issues: result.error.issues.map((issue) => ({
        row: typeof issue.path[0] === "number" ? issue.path[0] : 0,
        field: issue.path.slice(2).join(".") || undefined,
        message: issue.message,
      })),
    };
  });
  channel("historical:save-batch", (_event, raw) => {
    const entries = historicalBatchSchema.parse(raw) as HistoricalEntryInput[];
    if (
      entries.some(
        (entry) =>
          "attachmentTokens" in entry.value &&
          Boolean(entry.value.attachmentTokens?.length),
      )
    )
      throw new Error("المرفقات متاحة في الإدخال التفصيلي فقط");
    return getStore().saveHistoricalBatch(entries);
  });

  channel("reports:rows", (_event, filters) =>
    getStore().reportRows(reportFiltersSchema.parse(filters)),
  );
  channel("reports:csv", async (_event, raw) => {
    const filters = reportFiltersSchema.parse(raw) as ReportFilters;
    const rows = getStore().reportRows(filters);
    const english = getStore().settings().language === "en";
    const result = await dialog.showSaveDialog({
      title: english ? "Export report" : "تصدير التقرير",
      defaultPath: `${english ? "report" : "تقرير"}-${filters.from}-${filters.to}.csv`,
      filters: [
        {
          name: english ? "Excel-compatible CSV" : "CSV متوافق مع Excel",
          extensions: ["csv"],
        },
      ],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const headers = english
      ? [
          "Date",
          "Type",
          "Reference",
          "Party",
          "Category",
          "Amount",
          "Paid",
          "Remaining",
        ]
      : [
          "التاريخ",
          "النوع",
          "الرقم",
          "الجهة",
          "القسم",
          "المبلغ",
          "المدفوع",
          "المتبقي",
        ];
    const body = rows
      .map((row) =>
        [
          row.date,
          english
            ? ({
                "فاتورة مصروف": "Expense invoice",
                "فاتورة مورد": "Supplier invoice",
                "فاتورة مخضر": "Produce invoice",
                "دفعة مورد": "Supplier payment",
                "تسوية مورد": "Supplier adjustment",
                مبيعات: "Sales",
                "مصروف تشغيلي": "Operating expense",
              }[row.type] ?? row.type)
            : row.type,
          row.reference,
          english && row.party === "المطعم" ? "Restaurant" : row.party,
          english
            ? (defaultCatalogs.find((item) => item.ar === row.category)?.en ??
              {
                "مشتريات مورد": "Supplier purchases",
                "دفعات الموردين": "Supplier payments",
                مبيعات: "Sales",
                "تصحيح رصيد افتتاحي": "Opening balance correction",
              }[row.category] ??
              row.category)
            : row.category,
          row.amount,
          row.paid,
          row.remaining,
        ]
          .map(csvCell)
          .join(","),
      )
      .join("\r\n");
    writeFileSync(
      result.filePath,
      `\uFEFF${headers.map(csvCell).join(",")}\r\n${body}`,
      "utf8",
    );
    return { canceled: false, path: result.filePath };
  });

  channel("attachments:pick", () => files.pick());
  channel("attachments:list", (_event, type, id) =>
    files.list(entityTypeSchema.parse(type), idSchema.parse(id)),
  );
  channel("attachments:open", (_event, id) => files.open(idSchema.parse(id)));
  channel("attachments:discard", (_event, token) =>
    files.discard(idSchema.parse(token)),
  );

  channel("backup:create", () => backup.create());
  channel("backup:restore", () => backup.restore());

  channel("trash:list", () => getStore().trashList());
  channel("trash:restore", (_event, type, id) =>
    getStore().restore(trashTypeSchema.parse(type), idSchema.parse(id)),
  );
  channel("trash:remove", (_event, type, id) => {
    const parsedType = trashTypeSchema.parse(type) as TrashItem["type"];
    const parsedId = idSchema.parse(id);
    getStore().removePermanently(parsedType, parsedId);
    files.removeEntityFiles(parsedType, parsedId);
  });

  channel(
    "print:current",
    (event) =>
      new Promise<boolean>((resolve) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) return resolve(false);
        window.webContents.print({ printBackground: true }, (success) =>
          resolve(success),
        );
      }),
  );
}
