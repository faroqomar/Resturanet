import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ClipboardPaste,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type {
  HistoricalEntryInput,
  PaymentMethod,
  PendingAttachment,
  SalesCompleteness,
  SettingsSnapshot,
  Supplier,
  SupplierAdjustmentDirection,
} from "@shared/contracts";
import {
  AttachmentPicker,
  Field,
  Input,
  Loading,
  Money,
  Notice,
  PageHeader,
  Select,
  Textarea,
  saveWithConfirm,
  useLoad,
} from "../components/Common";
import { api, errorMessage, numberValue, today } from "../lib";
import { useI18n } from "../i18n";

type EntryMode = "detailed" | "batch";
type HistoricalUiType =
  | "restaurantExpense"
  | "supplierInvoiceStandard"
  | "supplierInvoiceProduce"
  | "supplierPayment"
  | "supplierOpeningBalance"
  | "supplierAdjustment"
  | "sale"
  | "operatingExpense";

interface DraftLine {
  description: string;
  categoryId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

interface HistoricalDraft {
  date: string;
  reference: string;
  supplierId: string;
  party: string;
  categoryId: string;
  amount: number;
  paid: number;
  description: string;
  notes: string;
  direction: SupplierAdjustmentDirection;
  method: PaymentMethod;
  completeness: SalesCompleteness;
  lines: DraftLine[];
}

const types: Array<[HistoricalUiType, string]> = [
  ["restaurantExpense", "فاتورة مصاريف المطعم"],
  ["supplierInvoiceStandard", "فاتورة مورد"],
  ["supplierInvoiceProduce", "فاتورة مخضر"],
  ["supplierPayment", "دفعة مورد"],
  ["supplierOpeningBalance", "رصيد افتتاحي لمورد"],
  ["supplierAdjustment", "تسوية مورد"],
  ["sale", "مبيعات يومية"],
  ["operatingExpense", "إيجار أو راتب أو مصروف"],
];

const supplierTypes = new Set<HistoricalUiType>([
  "supplierInvoiceStandard",
  "supplierInvoiceProduce",
  "supplierPayment",
  "supplierOpeningBalance",
  "supplierAdjustment",
]);

const lineTypes = new Set<HistoricalUiType>([
  "restaurantExpense",
  "supplierInvoiceStandard",
  "supplierInvoiceProduce",
  "sale",
]);

function blankLine(categoryId = ""): DraftLine {
  return {
    description: "",
    categoryId,
    quantity: 1,
    unit: "",
    unitPrice: 0,
    amount: 0,
  };
}

function blankDraft(
  supplierId = "",
  categoryId = "",
  date = today(),
): HistoricalDraft {
  return {
    date,
    reference: "",
    supplierId,
    party: "",
    categoryId,
    amount: 0,
    paid: 0,
    description: "",
    notes: "",
    direction: "increase_debt",
    method: "cash",
    completeness: "complete",
    lines: [blankLine(categoryId)],
  };
}

function entryFromDraft(
  type: HistoricalUiType,
  draft: HistoricalDraft,
  attachmentTokens?: string[],
): HistoricalEntryInput {
  switch (type) {
    case "restaurantExpense":
      return {
        type: "restaurantExpense",
        value: {
          invoiceNumber: draft.reference || undefined,
          date: draft.date,
          name: draft.party,
          notes: draft.notes,
          manualTotal: null,
          lines: draft.lines.map((line) => ({
            categoryId: line.categoryId,
            amount: line.amount,
            notes: line.description,
          })),
          attachmentTokens,
        },
      };
    case "supplierInvoiceStandard":
    case "supplierInvoiceProduce":
      return {
        type: "supplierInvoice",
        value: {
          kind: type === "supplierInvoiceProduce" ? "produce" : "standard",
          invoiceNumber: draft.reference || undefined,
          date: draft.date,
          supplierId: draft.supplierId,
          paidNow: draft.paid,
          notes: draft.notes,
          lines: draft.lines.map((line) => ({
            name: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice || null,
            total: line.amount,
            notes: "",
          })),
          attachmentTokens,
        },
      };
    case "supplierPayment":
      return {
        type: "supplierPayment",
        value: {
          paymentNumber: draft.reference || undefined,
          date: draft.date,
          supplierId: draft.supplierId,
          amount: draft.amount,
          method: draft.method,
          notes: draft.notes,
          attachmentTokens,
        },
      };
    case "supplierOpeningBalance":
      return {
        type: "supplierOpeningBalance",
        value: {
          date: draft.date,
          supplierId: draft.supplierId,
          amount: draft.amount,
          notes: draft.notes,
        },
      };
    case "supplierAdjustment":
      return {
        type: "supplierAdjustment",
        value: {
          adjustmentNumber: draft.reference || undefined,
          date: draft.date,
          supplierId: draft.supplierId,
          direction: draft.direction,
          amount: draft.amount,
          reason: draft.description,
          notes: draft.notes,
          attachmentTokens,
        },
      };
    case "sale":
      return {
        type: "sale",
        value: {
          recordNumber: draft.reference || undefined,
          date: draft.date,
          completeness: draft.completeness,
          manualTotal: null,
          notes: draft.notes,
          lines: draft.lines.map((line) => ({
            categoryId: line.categoryId || null,
            name: line.description || "مبيعات",
            amount: line.amount,
          })),
          attachmentTokens,
        },
      };
    case "operatingExpense":
      return {
        type: "operatingExpense",
        value: {
          recordNumber: draft.reference || undefined,
          date: draft.date,
          expenseTypeId: draft.categoryId,
          recipient: draft.party,
          totalDue: draft.amount,
          notes: draft.notes,
          payments:
            draft.paid > 0
              ? [
                  {
                    date: draft.date,
                    amount: draft.paid,
                    method: draft.method,
                  },
                ]
              : [],
          attachmentTokens,
        },
      };
  }
}

async function saveDetailedEntry(entry: HistoricalEntryInput): Promise<void> {
  switch (entry.type) {
    case "restaurantExpense":
      return saveWithConfirm(entry.value, api.restaurantExpenses.save);
    case "supplierInvoice":
      return saveWithConfirm(entry.value, api.supplierInvoices.save);
    case "supplierPayment":
      return saveWithConfirm(entry.value, api.supplierPayments.save);
    case "supplierOpeningBalance":
      return saveWithConfirm(
        entry.value,
        api.supplierAdjustments.saveOpeningBalance,
      );
    case "supplierAdjustment":
      return saveWithConfirm(entry.value, api.supplierAdjustments.save);
    case "sale":
      return saveWithConfirm(entry.value, api.sales.save);
    case "operatingExpense":
      return saveWithConfirm(entry.value, api.operatingExpenses.save);
  }
}

function withBatchConfirm(
  entries: HistoricalEntryInput[],
  marker: string,
): HistoricalEntryInput[] {
  return entries.map((entry) => {
    if (
      marker === "DUPLICATE_CONFIRM_REQUIRED" &&
      "allowDuplicate" in entry.value
    )
      return { ...entry, value: { ...entry.value, allowDuplicate: true } };
    if (
      marker === "OVERPAYMENT_CONFIRM_REQUIRED" &&
      "confirmOverpayment" in entry.value
    )
      return { ...entry, value: { ...entry.value, confirmOverpayment: true } };
    if (
      marker === "OPENING_BALANCE_CONFIRM_REQUIRED" &&
      entry.type === "supplierOpeningBalance"
    )
      return { ...entry, value: { ...entry.value, confirmExisting: true } };
    return entry;
  }) as HistoricalEntryInput[];
}

export function HistoricalEntryPage({
  settings,
}: {
  settings: SettingsSnapshot;
}) {
  const { catalogName } = useI18n();
  const suppliers = useLoad(() => api.suppliers.list());
  const restaurantCategories = settings.catalogs.filter(
    (item) => item.kind === "restaurant_expense_category" && item.active,
  );
  const salesCategories = settings.catalogs.filter(
    (item) => item.kind === "sales_category" && item.active,
  );
  const operatingTypes = settings.catalogs.filter(
    (item) => item.kind === "expense_type" && item.active,
  );
  const [mode, setMode] = useState<EntryMode>("detailed");
  const [type, setType] = useState<HistoricalUiType>("restaurantExpense");
  const [draft, setDraft] = useState(() =>
    blankDraft("", restaurantCategories[0]?.id ?? ""),
  );
  const [rows, setRows] = useState<HistoricalDraft[]>(() => [
    blankDraft("", restaurantCategories[0]?.id ?? ""),
  ]);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [issues, setIssues] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const defaultCategory = (nextType: HistoricalUiType) => {
    if (nextType === "restaurantExpense")
      return restaurantCategories[0]?.id ?? "";
    if (nextType === "sale") return salesCategories[0]?.id ?? "";
    if (nextType === "operatingExpense") return operatingTypes[0]?.id ?? "";
    return "";
  };

  const changeType = (nextType: HistoricalUiType) => {
    const categoryId = defaultCategory(nextType);
    setType(nextType);
    setDraft((current) =>
      blankDraft(current.supplierId, categoryId, current.date),
    );
    setRows((current) => [
      blankDraft(current[0]?.supplierId ?? "", categoryId, current[0]?.date),
    ]);
    setAttachments([]);
    setIssues({});
    setMessage("");
  };

  const total = useMemo(
    () =>
      lineTypes.has(type)
        ? draft.lines.reduce((sum, line) => sum + line.amount, 0)
        : draft.amount,
    [draft, type],
  );

  const resetAfterSave = () => {
    setDraft((current) =>
      blankDraft(current.supplierId, defaultCategory(type), current.date),
    );
    setAttachments([]);
  };

  const saveOne = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const entry = entryFromDraft(
        type,
        draft,
        attachments.map((item) => item.token),
      );
      await saveDetailedEntry(entry);
      setMessage("تم حفظ السجل القديم ويمكنك إدخال السجل التالي");
      resetAfterSave();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const validateRows = async () => {
    const entries = rows.map((row) => entryFromDraft(type, row));
    const result = await api.historicalEntries.validateBatch(entries);
    const nextIssues: Record<number, string> = {};
    for (const issue of result.issues) nextIssues[issue.row] = issue.message;
    setIssues(nextIssues);
    return { result, entries };
  };

  const saveBatch = async () => {
    setSaving(true);
    setMessage("");
    try {
      const { result, entries } = await validateRows();
      if (!result.valid) {
        setMessage("راجع الصفوف التي تحتوي أخطاء قبل الحفظ");
        return;
      }
      let prepared = entries;
      try {
        await api.historicalEntries.saveBatch(prepared);
      } catch (error) {
        const text = errorMessage(error);
        const marker = [
          "DUPLICATE_CONFIRM_REQUIRED",
          "OVERPAYMENT_CONFIRM_REQUIRED",
          "OPENING_BALANCE_CONFIRM_REQUIRED",
        ].find((item) => text.includes(item));
        if (!marker || !window.confirm(text.replace(`${marker}:`, "").trim()))
          throw error;
        prepared = withBatchConfirm(prepared, marker);
        await api.historicalEntries.saveBatch(prepared);
      }
      setMessage(`تم حفظ ${rows.length} سجلًا قديمًا بنجاح`);
      setRows((current) => [
        blankDraft(
          current[0]?.supplierId ?? "",
          defaultCategory(type),
          current[0]?.date,
        ),
      ]);
      setIssues({});
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!suppliers.data) return <Loading />;
  const needsSupplier = supplierTypes.has(type);
  const categories =
    type === "restaurantExpense"
      ? restaurantCategories
      : type === "sale"
        ? salesCategories
        : operatingTypes;

  return (
    <div className="historical-page">
      <PageHeader
        eyebrow="ترحيل السجلات السابقة إلى نفس الدفتر المالي"
        title="الإدخال القديم"
      />
      <div className="historical-intro">
        <Archive size={28} />
        <div>
          <b>الإدخال التاريخي يؤثر مباشرة في التقارير والأرصدة.</b>
          <p>
            استخدم النموذج التفصيلي للمرفقات والبنود، أو الجدول لإدخال مجموعة من
            النوع نفسه.
          </p>
        </div>
      </div>
      <div className="historical-toolbar">
        <div className="segmented" role="tablist">
          <button
            className={mode === "detailed" ? "active" : ""}
            onClick={() => setMode("detailed")}
          >
            إدخال تفصيلي
          </button>
          <button
            className={mode === "batch" ? "active" : ""}
            onClick={() => setMode("batch")}
          >
            إدخال جماعي
          </button>
        </div>
        <Field label="نوع السجل">
          <Select
            value={type}
            onChange={(event) =>
              changeType(event.target.value as HistoricalUiType)
            }
          >
            {types.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {needsSupplier && suppliers.data.length === 0 && (
        <Notice>أضف موردًا أولًا قبل إدخال هذا النوع.</Notice>
      )}
      {message && (
        <Notice kind={message.startsWith("تم") ? "success" : "danger"}>
          {message}
        </Notice>
      )}
      {mode === "detailed" ? (
        <form className="document-form historical-form" onSubmit={saveOne}>
          <div className="form-main">
            <div className="form-grid">
              <Field label="التاريخ" required>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft({ ...draft, date: event.target.value })
                  }
                />
              </Field>
              {!["supplierOpeningBalance"].includes(type) && (
                <Field
                  label={
                    type === "supplierPayment"
                      ? "رقم الدفعة"
                      : type === "sale" || type === "operatingExpense"
                        ? "رقم السجل"
                        : "رقم الفاتورة"
                  }
                  hint="يولد تلقائيًا إذا تُرك فارغًا"
                >
                  <Input
                    value={draft.reference}
                    onChange={(event) =>
                      setDraft({ ...draft, reference: event.target.value })
                    }
                  />
                </Field>
              )}
              {needsSupplier && (
                <Field label="المورد" required>
                  <Select
                    value={draft.supplierId}
                    onChange={(event) =>
                      setDraft({ ...draft, supplierId: event.target.value })
                    }
                  >
                    <option value="">اختر المورد</option>
                    {suppliers.data.map((supplier) => (
                      <option value={supplier.id} key={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {["restaurantExpense", "operatingExpense"].includes(type) && (
                <Field
                  label={
                    type === "restaurantExpense"
                      ? "اسم المحل أو الشخص"
                      : "المستلم أو الجهة"
                  }
                  required={type === "restaurantExpense"}
                >
                  <Input
                    value={draft.party}
                    onChange={(event) =>
                      setDraft({ ...draft, party: event.target.value })
                    }
                  />
                </Field>
              )}
              {type === "operatingExpense" && (
                <CategoryField
                  value={draft.categoryId}
                  categories={categories}
                  catalogName={catalogName}
                  onChange={(categoryId) => setDraft({ ...draft, categoryId })}
                />
              )}
              {type === "supplierAdjustment" && (
                <>
                  <Field label="اتجاه التسوية" required>
                    <Select
                      value={draft.direction}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          direction: event.target
                            .value as SupplierAdjustmentDirection,
                        })
                      }
                    >
                      <option value="increase_debt">زيادة دين المورد</option>
                      <option value="decrease_debt">تخفيض دين المورد</option>
                    </Select>
                  </Field>
                  <Field label="سبب التسوية" required>
                    <Input
                      value={draft.description}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          description: event.target.value,
                        })
                      }
                    />
                  </Field>
                </>
              )}
              {type === "sale" && (
                <Field label="اكتمال البيانات">
                  <Select
                    value={draft.completeness}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        completeness: event.target.value as SalesCompleteness,
                      })
                    }
                  >
                    <option value="complete">مكتملة</option>
                    <option value="estimated">تقريبية</option>
                    <option value="unavailable">غير متوفرة</option>
                  </Select>
                </Field>
              )}
            </div>
            {lineTypes.has(type) ? (
              <LineEditor
                type={type}
                lines={draft.lines}
                categories={categories}
                catalogName={catalogName}
                onChange={(lines) => setDraft({ ...draft, lines })}
              />
            ) : (
              <div className="form-grid">
                <Field
                  label={
                    type === "supplierOpeningBalance"
                      ? "الرصيد الافتتاحي"
                      : "المبلغ"
                  }
                  required
                >
                  <Input
                    type="number"
                    min="0"
                    value={draft.amount || ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        amount: numberValue(event.target.value),
                      })
                    }
                  />
                </Field>
                {["supplierPayment", "operatingExpense"].includes(type) && (
                  <PaymentMethodField
                    value={draft.method}
                    onChange={(method) => setDraft({ ...draft, method })}
                  />
                )}
              </div>
            )}
            {["supplierInvoiceStandard", "supplierInvoiceProduce"].includes(
              type,
            ) && (
              <Field label="المبلغ المدفوع الآن">
                <Input
                  type="number"
                  min="0"
                  value={draft.paid || ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      paid: numberValue(event.target.value),
                    })
                  }
                />
              </Field>
            )}
            {type === "operatingExpense" && (
              <Field label="المدفوع">
                <Input
                  type="number"
                  min="0"
                  max={draft.amount || undefined}
                  value={draft.paid || ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      paid: numberValue(event.target.value),
                    })
                  }
                />
              </Field>
            )}
            <Field label="ملاحظات">
              <Textarea
                value={draft.notes}
                onChange={(event) =>
                  setDraft({ ...draft, notes: event.target.value })
                }
              />
            </Field>
            {type !== "supplierOpeningBalance" && (
              <AttachmentPicker value={attachments} onChange={setAttachments} />
            )}
          </div>
          <aside className="form-summary">
            <span className="summary-label">الإجمالي</span>
            <Money value={total} />
            <div className="summary-equation">
              <span>التاريخ</span>
              <bdi>{draft.date}</bdi>
              {draft.paid > 0 && (
                <>
                  <span>المدفوع</span>
                  <Money value={draft.paid} />
                </>
              )}
            </div>
            <button
              className="button primary wide"
              disabled={saving || (needsSupplier && !draft.supplierId)}
            >
              <Save size={18} />
              {saving ? "جارٍ الحفظ…" : "حفظ السجل"}
            </button>
          </aside>
        </form>
      ) : (
        <section className="batch-entry">
          <div className="batch-head">
            <div>
              <ClipboardPaste size={23} />
              <div>
                <h2>إدخال جماعي</h2>
                <p>
                  اختر نوعًا واحدًا وأدخل عدة سجلات. تُحفظ الدفعة كاملة أو لا
                  يُحفظ منها شيء.
                </p>
              </div>
            </div>
            <div className="batch-total">
              <small>الإجمالي</small>
              <Money
                value={rows.reduce(
                  (sum, row) => sum + row.amount + row.lines[0].amount,
                  0,
                )}
              />
            </div>
          </div>
          <div className="batch-table-wrap">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>التاريخ</th>
                  {needsSupplier && <th>المورد</th>}
                  {!["supplierOpeningBalance"].includes(type) && <th>الرقم</th>}
                  {["restaurantExpense", "operatingExpense"].includes(type) && (
                    <th>الجهة</th>
                  )}
                  {(lineTypes.has(type) || type === "operatingExpense") && (
                    <th>القسم أو الوصف</th>
                  )}
                  {type === "supplierAdjustment" && <th>سبب التسوية</th>}
                  <th>المبلغ</th>
                  {[
                    "supplierInvoiceStandard",
                    "supplierInvoiceProduce",
                    "operatingExpense",
                  ].includes(type) && <th>المدفوع</th>}
                  <th>ملاحظات</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <BatchRow
                    key={index}
                    index={index}
                    type={type}
                    row={row}
                    suppliers={suppliers.data!}
                    categories={categories}
                    catalogName={catalogName}
                    issue={issues[index]}
                    onChange={(next) =>
                      setRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? next : item,
                        ),
                      )
                    }
                    onRemove={() =>
                      setRows((current) =>
                        current.length === 1
                          ? current
                          : current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="batch-actions">
            <button
              className="button secondary"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  blankDraft(
                    current[0]?.supplierId ?? "",
                    defaultCategory(type),
                    current.at(-1)?.date,
                  ),
                ])
              }
            >
              <Plus size={17} /> إضافة صف
            </button>
            <button
              className="button ghost"
              onClick={() => void validateRows()}
            >
              <CheckCircle2 size={17} /> التحقق من إدخال البيانات
            </button>
            <button
              className="button primary"
              disabled={saving}
              onClick={() => void saveBatch()}
            >
              <Save size={17} />
              {saving ? "جارٍ الحفظ…" : "حفظ الدفعة"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryField({
  value,
  categories,
  catalogName,
  onChange,
}: {
  value: string;
  categories: SettingsSnapshot["catalogs"];
  catalogName: (item: SettingsSnapshot["catalogs"][number]) => string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="القسم" required>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {categories.map((category) => (
          <option value={category.id} key={category.id}>
            {catalogName(category)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function PaymentMethodField({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}) {
  return (
    <Field label="طريقة الدفع">
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value as PaymentMethod)}
      >
        <option value="cash">نقدي</option>
        <option value="transfer">تحويل</option>
        <option value="other">أخرى</option>
      </Select>
    </Field>
  );
}

function LineEditor({
  type,
  lines,
  categories,
  catalogName,
  onChange,
}: {
  type: HistoricalUiType;
  lines: DraftLine[];
  categories: SettingsSnapshot["catalogs"];
  catalogName: (item: SettingsSnapshot["catalogs"][number]) => string;
  onChange: (lines: DraftLine[]) => void;
}) {
  const invoice = [
    "supplierInvoiceStandard",
    "supplierInvoiceProduce",
  ].includes(type);
  return (
    <section className="historical-lines">
      <div className="section-title">
        <div>
          <h3>{invoice ? "أصناف الفاتورة" : "التفاصيل"}</h3>
        </div>
        <button
          type="button"
          className="button secondary small"
          onClick={() => onChange([...lines, blankLine(categories[0]?.id)])}
        >
          <Plus size={16} /> إضافة صنف
        </button>
      </div>
      <div className="line-list">
        {lines.map((line, index) => (
          <div className="historical-line" key={index}>
            {!invoice && (
              <CategoryField
                value={line.categoryId}
                categories={categories}
                catalogName={catalogName}
                onChange={(categoryId) =>
                  onChange(
                    lines.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, categoryId } : item,
                    ),
                  )
                }
              />
            )}
            <Field label={invoice ? "الصنف" : "الوصف"}>
              <Input
                value={line.description}
                onChange={(event) =>
                  onChange(
                    lines.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, description: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </Field>
            {invoice && (
              <>
                <Field label="الكمية">
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={line.quantity}
                    onChange={(event) => {
                      const quantity = Number(event.target.value);
                      onChange(
                        lines.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                quantity,
                                amount: item.unitPrice
                                  ? Math.round(quantity * item.unitPrice)
                                  : item.amount,
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                </Field>
                <Field label="الوحدة">
                  <Input
                    value={line.unit}
                    onChange={(event) =>
                      onChange(
                        lines.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, unit: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="سعر الوحدة">
                  <Input
                    type="number"
                    min="0"
                    value={line.unitPrice || ""}
                    onChange={(event) => {
                      const unitPrice = numberValue(event.target.value);
                      onChange(
                        lines.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                unitPrice,
                                amount: unitPrice
                                  ? Math.round(item.quantity * unitPrice)
                                  : item.amount,
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                </Field>
              </>
            )}
            <Field label="المبلغ" required>
              <Input
                type="number"
                min="0"
                value={line.amount || ""}
                onChange={(event) =>
                  onChange(
                    lines.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, amount: numberValue(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </Field>
            <button
              type="button"
              className="icon-button danger"
              disabled={lines.length === 1}
              onClick={() =>
                onChange(lines.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function BatchRow({
  index,
  type,
  row,
  suppliers,
  categories,
  catalogName,
  issue,
  onChange,
  onRemove,
}: {
  index: number;
  type: HistoricalUiType;
  row: HistoricalDraft;
  suppliers: Supplier[];
  categories: SettingsSnapshot["catalogs"];
  catalogName: (item: SettingsSnapshot["catalogs"][number]) => string;
  issue?: string;
  onChange: (row: HistoricalDraft) => void;
  onRemove: () => void;
}) {
  const amount = lineTypes.has(type) ? row.lines[0].amount : row.amount;
  const setAmount = (value: number) =>
    lineTypes.has(type)
      ? onChange({
          ...row,
          lines: [{ ...row.lines[0], amount: value }],
        })
      : onChange({ ...row, amount: value });
  const showCategory = type === "restaurantExpense" || type === "sale";
  return (
    <>
      <tr className={issue ? "row-error" : ""}>
        <td>{index + 1}</td>
        <td>
          <Input
            type="date"
            value={row.date}
            onChange={(event) => onChange({ ...row, date: event.target.value })}
          />
        </td>
        {supplierTypes.has(type) && (
          <td>
            <Select
              value={row.supplierId}
              onChange={(event) =>
                onChange({ ...row, supplierId: event.target.value })
              }
            >
              <option value="">اختر المورد</option>
              {suppliers.map((supplier) => (
                <option value={supplier.id} key={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </td>
        )}
        {type !== "supplierOpeningBalance" && (
          <td>
            <Input
              value={row.reference}
              onChange={(event) =>
                onChange({ ...row, reference: event.target.value })
              }
            />
          </td>
        )}
        {["restaurantExpense", "operatingExpense"].includes(type) && (
          <td>
            <Input
              value={row.party}
              onChange={(event) =>
                onChange({ ...row, party: event.target.value })
              }
            />
          </td>
        )}
        {(lineTypes.has(type) || type === "operatingExpense") && (
          <td>
            {showCategory || type === "operatingExpense" ? (
              <Select
                value={
                  type === "operatingExpense"
                    ? row.categoryId
                    : row.lines[0].categoryId
                }
                onChange={(event) =>
                  type === "operatingExpense"
                    ? onChange({ ...row, categoryId: event.target.value })
                    : onChange({
                        ...row,
                        lines: [
                          {
                            ...row.lines[0],
                            categoryId: event.target.value,
                          },
                        ],
                      })
                }
              >
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {catalogName(category)}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={row.lines[0].description}
                onChange={(event) =>
                  onChange({
                    ...row,
                    lines: [
                      {
                        ...row.lines[0],
                        description: event.target.value,
                      },
                    ],
                  })
                }
              />
            )}
          </td>
        )}
        {type === "supplierAdjustment" && (
          <td>
            <div className="batch-adjustment">
              <Select
                value={row.direction}
                onChange={(event) =>
                  onChange({
                    ...row,
                    direction: event.target
                      .value as SupplierAdjustmentDirection,
                  })
                }
              >
                <option value="increase_debt">زيادة</option>
                <option value="decrease_debt">تخفيض</option>
              </Select>
              <Input
                value={row.description}
                onChange={(event) =>
                  onChange({ ...row, description: event.target.value })
                }
              />
            </div>
          </td>
        )}
        <td>
          <Input
            type="number"
            min="0"
            value={amount || ""}
            onChange={(event) => setAmount(numberValue(event.target.value))}
          />
        </td>
        {[
          "supplierInvoiceStandard",
          "supplierInvoiceProduce",
          "operatingExpense",
        ].includes(type) && (
          <td>
            <Input
              type="number"
              min="0"
              value={row.paid || ""}
              onChange={(event) =>
                onChange({ ...row, paid: numberValue(event.target.value) })
              }
            />
          </td>
        )}
        <td>
          <Input
            value={row.notes}
            onChange={(event) =>
              onChange({ ...row, notes: event.target.value })
            }
          />
        </td>
        <td>
          <button
            className="icon-button danger"
            onClick={onRemove}
            aria-label="حذف"
          >
            <Trash2 size={16} />
          </button>
        </td>
      </tr>
      {issue && (
        <tr className="batch-issue">
          <td colSpan={10}>{issue}</td>
        </tr>
      )}
    </>
  );
}
