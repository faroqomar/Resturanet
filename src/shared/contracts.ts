export type ID = string;
export type ISODate = string;
export type Money = number;
export type AppLocale = "ar" | "en";

export type EntityType =
  | "restaurantExpense"
  | "supplierInvoice"
  | "supplierPayment"
  | "supplierAdjustment"
  | "sale"
  | "operatingExpense";

export type CatalogKind =
  | "supplier_type"
  | "expense_type"
  | "sales_category"
  | "restaurant_expense_category";

export type SalesCompleteness = "complete" | "estimated" | "unavailable";
export type SupplierInvoiceKind = "standard" | "produce";
export type PaymentMethod = "cash" | "transfer" | "other";

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

export interface CatalogItem {
  id: ID;
  kind: CatalogKind;
  name: string;
  translationKey?: string | null;
  active: boolean;
  builtIn: boolean;
}

export interface Supplier {
  id: ID;
  name: string;
  typeId: ID;
  typeName?: string;
  phone?: string;
  address?: string;
  notes?: string;
  openingBalance: Money;
  openingBalanceDate?: ISODate | null;
  active: boolean;
  purchases?: Money;
  payments?: Money;
  balance?: Money;
  lastActivity?: ISODate | null;
  deletedAt?: string | null;
}

export interface ExpenseLineInput {
  id?: ID;
  categoryId: ID;
  categoryName?: string;
  amount: Money;
  notes?: string;
}

export interface RestaurantExpenseInput {
  id?: ID;
  invoiceNumber?: string;
  date: ISODate;
  name: string;
  notes?: string;
  manualTotal?: Money | null;
  lines: ExpenseLineInput[];
  attachmentTokens?: string[];
  allowDuplicate?: boolean;
}

export interface RestaurantExpense extends RestaurantExpenseInput {
  id: ID;
  invoiceNumber: string;
  calculatedTotal: Money;
  effectiveTotal: Money;
  manualTotal: Money | null;
  deletedAt?: string | null;
}

export interface SupplierInvoiceLineInput {
  id?: ID;
  name: string;
  quantity: number;
  unit?: string;
  unitPrice?: Money | null;
  total: Money;
  notes?: string;
}

export interface SupplierInvoiceInput {
  id?: ID;
  kind: SupplierInvoiceKind;
  invoiceNumber?: string;
  date: ISODate;
  supplierId: ID;
  previousBalanceOverride?: Money | null;
  paidNow?: Money;
  notes?: string;
  lines: SupplierInvoiceLineInput[];
  attachmentTokens?: string[];
  allowDuplicate?: boolean;
  confirmOverpayment?: boolean;
}

export interface SupplierInvoice extends SupplierInvoiceInput {
  id: ID;
  invoiceNumber: string;
  supplierName: string;
  total: Money;
  previousBalance: Money;
  remainingBalance: Money;
  deletedAt?: string | null;
}

export interface SupplierPaymentInput {
  id?: ID;
  paymentNumber?: string;
  date: ISODate;
  supplierId: ID;
  amount: Money;
  method?: PaymentMethod;
  notes?: string;
  attachmentTokens?: string[];
  allowDuplicate?: boolean;
  confirmOverpayment?: boolean;
}

export interface SupplierPayment extends SupplierPaymentInput {
  id: ID;
  paymentNumber: string;
  supplierName: string;
  invoiceId?: ID | null;
  deletedAt?: string | null;
}

export type SupplierAdjustmentDirection = "increase_debt" | "decrease_debt";

export interface SupplierAdjustmentInput {
  id?: ID;
  adjustmentNumber?: string;
  date: ISODate;
  supplierId: ID;
  direction: SupplierAdjustmentDirection;
  amount: Money;
  reason: string;
  notes?: string;
  attachmentTokens?: string[];
  allowDuplicate?: boolean;
}

export interface SupplierAdjustment extends SupplierAdjustmentInput {
  id: ID;
  adjustmentNumber: string;
  supplierName: string;
  signedAmount: Money;
  deletedAt?: string | null;
}

export interface SupplierOpeningBalanceInput {
  date: ISODate;
  supplierId: ID;
  amount: Money;
  notes?: string;
  confirmExisting?: boolean;
}

export interface SaleLineInput {
  id?: ID;
  categoryId?: ID | null;
  name: string;
  amount: Money;
}

export interface SaleInput {
  id?: ID;
  recordNumber?: string;
  date: ISODate;
  completeness: SalesCompleteness;
  manualTotal?: Money | null;
  notes?: string;
  lines: SaleLineInput[];
  attachmentTokens?: string[];
  allowDuplicate?: boolean;
}

export interface Sale extends SaleInput {
  id: ID;
  recordNumber: string;
  calculatedTotal: Money;
  effectiveTotal: Money;
  manualTotal: Money | null;
  deletedAt?: string | null;
}

export interface OperatingPaymentInput {
  id?: ID;
  paymentNumber?: string;
  date: ISODate;
  amount: Money;
  method?: PaymentMethod;
  notes?: string;
}

export interface OperatingExpenseInput {
  id?: ID;
  recordNumber?: string;
  date: ISODate;
  expenseTypeId: ID;
  recipient?: string;
  totalDue: Money;
  notes?: string;
  payments: OperatingPaymentInput[];
  attachmentTokens?: string[];
  allowDuplicate?: boolean;
}

export interface OperatingExpense extends OperatingExpenseInput {
  id: ID;
  recordNumber: string;
  expenseTypeName: string;
  paid: Money;
  remaining: Money;
  paymentStatus: "paid" | "partial" | "unpaid";
  deletedAt?: string | null;
}

export interface Attachment {
  id: ID;
  entityType?: EntityType | null;
  entityId?: ID | null;
  originalName: string;
  mimeType: string;
  size: number;
  previewUrl?: string | null;
}

export interface PendingAttachment {
  token: string;
  originalName: string;
  mimeType: string;
  size: number;
  previewUrl?: string | null;
}

export interface LedgerEntry {
  id: ID;
  date: ISODate;
  kind: "opening" | "purchase" | "payment" | "adjustment";
  reference: string;
  debit: Money;
  credit: Money;
  runningBalance: Money;
  entityId?: ID;
}

export interface WorkDaySummary {
  id: ID;
  date: ISODate;
  sales: Money;
  restaurantExpenses: Money;
  supplierPurchases: Money;
  supplierPayments: Money;
  operatingExpenses: Money;
  cashOut: Money;
  approximateResult: Money | null;
  salesState: SalesCompleteness | "missing";
  count: number;
}

export interface WorkDayDetail extends WorkDaySummary {
  restaurantExpenseInvoices: RestaurantExpense[];
  supplierInvoices: SupplierInvoice[];
  supplierPaymentsList: SupplierPayment[];
  supplierAdjustmentsList: SupplierAdjustment[];
  salesRecords: Sale[];
  operatingExpensesList: OperatingExpense[];
}

export interface DashboardSummary {
  range: DateRange;
  sales: Money;
  restaurantExpenses: Money;
  supplierPurchases: Money;
  supplierPayments: Money;
  operatingExpenses: Money;
  recordedExpenses: Money;
  cashOut: Money;
  supplierDebt: Money;
  approximateResult: Money | null;
  salesComplete: boolean;
  documentCount: number;
  suppliersWithDebt: number;
  recent: Array<{
    id: ID;
    type: EntityType;
    date: ISODate;
    title: string;
    amount: Money;
  }>;
  supplierDebts: Array<{ id: ID; name: string; balance: Money }>;
  dailyChart: Array<{ date: ISODate; sales: Money; expenses: Money }>;
  expenseBreakdown: Array<{ name: string; amount: Money; percentage: number }>;
}

export interface TrashItem {
  id: ID;
  type: EntityType | "supplier";
  title: string;
  deletedAt: string;
}

export interface SettingsSnapshot {
  restaurantName: string;
  currency: "IQD";
  language: AppLocale;
  catalogs: CatalogItem[];
}

export interface ReportFilters extends DateRange {
  supplierId?: ID;
  categoryId?: ID;
  entityType?: EntityType;
  search?: string;
}

export interface ReportRow {
  id: ID;
  entityType: EntityType;
  date: ISODate;
  type: string;
  reference: string;
  party: string;
  category: string;
  amount: Money;
  paid: Money;
  remaining: Money;
}

export type HistoricalEntryInput =
  | { type: "restaurantExpense"; value: RestaurantExpenseInput }
  | { type: "supplierInvoice"; value: SupplierInvoiceInput }
  | { type: "supplierPayment"; value: SupplierPaymentInput }
  | { type: "supplierOpeningBalance"; value: SupplierOpeningBalanceInput }
  | { type: "supplierAdjustment"; value: SupplierAdjustmentInput }
  | { type: "sale"; value: SaleInput }
  | { type: "operatingExpense"; value: OperatingExpenseInput };

export interface HistoricalBatchIssue {
  row: number;
  field?: string;
  message: string;
}

export interface HistoricalBatchValidation {
  valid: boolean;
  issues: HistoricalBatchIssue[];
}

export interface DuplicateWarning {
  duplicate: boolean;
  message?: string;
}

export interface SaveResult<T> {
  value: T;
  message: string;
}

export interface RestaurantApi {
  settings: {
    get(): Promise<SettingsSnapshot>;
    saveRestaurantName(name: string): Promise<SettingsSnapshot>;
    saveLanguage(language: AppLocale): Promise<SettingsSnapshot>;
    addCatalog(kind: CatalogKind, name: string): Promise<CatalogItem>;
    toggleCatalog(id: ID, active: boolean): Promise<CatalogItem>;
  };
  dashboard: { get(range: DateRange): Promise<DashboardSummary> };
  workDays: {
    list(range?: DateRange): Promise<WorkDaySummary[]>;
    get(date: ISODate): Promise<WorkDayDetail>;
  };
  suppliers: {
    list(includeInactive?: boolean): Promise<Supplier[]>;
    get(id: ID): Promise<{
      supplier: Supplier;
      ledger: LedgerEntry[];
      invoices: SupplierInvoice[];
      payments: SupplierPayment[];
      adjustments: SupplierAdjustment[];
    }>;
    save(
      input: Omit<Supplier, "id"> & { id?: ID },
    ): Promise<SaveResult<Supplier>>;
    trash(id: ID): Promise<void>;
  };
  restaurantExpenses: {
    list(range?: DateRange): Promise<RestaurantExpense[]>;
    get(id: ID): Promise<RestaurantExpense>;
    save(input: RestaurantExpenseInput): Promise<SaveResult<RestaurantExpense>>;
    trash(id: ID): Promise<void>;
  };
  supplierInvoices: {
    list(
      kind?: SupplierInvoiceKind,
      range?: DateRange,
    ): Promise<SupplierInvoice[]>;
    get(id: ID): Promise<SupplierInvoice>;
    save(input: SupplierInvoiceInput): Promise<SaveResult<SupplierInvoice>>;
    trash(id: ID): Promise<void>;
  };
  supplierPayments: {
    list(range?: DateRange): Promise<SupplierPayment[]>;
    get(id: ID): Promise<SupplierPayment>;
    save(input: SupplierPaymentInput): Promise<SaveResult<SupplierPayment>>;
    trash(id: ID): Promise<void>;
  };
  supplierAdjustments: {
    list(range?: DateRange): Promise<SupplierAdjustment[]>;
    get(id: ID): Promise<SupplierAdjustment>;
    save(
      input: SupplierAdjustmentInput,
    ): Promise<SaveResult<SupplierAdjustment>>;
    saveOpeningBalance(
      input: SupplierOpeningBalanceInput,
    ): Promise<SaveResult<Supplier | SupplierAdjustment>>;
    trash(id: ID): Promise<void>;
  };
  sales: {
    list(range?: DateRange): Promise<Sale[]>;
    get(id: ID): Promise<Sale>;
    save(input: SaleInput): Promise<SaveResult<Sale>>;
    trash(id: ID): Promise<void>;
  };
  operatingExpenses: {
    list(range?: DateRange): Promise<OperatingExpense[]>;
    get(id: ID): Promise<OperatingExpense>;
    save(input: OperatingExpenseInput): Promise<SaveResult<OperatingExpense>>;
    trash(id: ID): Promise<void>;
  };
  historicalEntries: {
    validateBatch(
      entries: HistoricalEntryInput[],
    ): Promise<HistoricalBatchValidation>;
    saveBatch(entries: HistoricalEntryInput[]): Promise<{ saved: number }>;
  };
  reports: {
    rows(filters: ReportFilters): Promise<ReportRow[]>;
    exportCsv(
      filters: ReportFilters,
    ): Promise<{ canceled: boolean; path?: string }>;
  };
  attachments: {
    pick(): Promise<PendingAttachment[]>;
    list(entityType: EntityType, entityId: ID): Promise<Attachment[]>;
    open(id: ID): Promise<void>;
    discard(token: string): Promise<void>;
  };
  backup: {
    create(): Promise<{ canceled: boolean; path?: string }>;
    restore(): Promise<{
      canceled: boolean;
      restored: boolean;
      message?: string;
    }>;
  };
  trash: {
    list(): Promise<TrashItem[]>;
    restore(type: TrashItem["type"], id: ID): Promise<void>;
    removePermanently(type: TrashItem["type"], id: ID): Promise<void>;
  };
  print: { current(): Promise<boolean> };
}

declare global {
  interface Window {
    restaurantApi: RestaurantApi;
  }
}
