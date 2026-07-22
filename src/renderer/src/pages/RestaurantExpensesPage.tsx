import { useEffect, useMemo, useState } from "react";
import { Calculator, Plus, PlusCircle, Trash2 } from "lucide-react";
import type {
  PendingAttachment,
  RestaurantExpenseInput,
  SettingsSnapshot,
} from "@shared/contracts";
import {
  AttachmentPicker,
  EmptyState,
  ExistingAttachments,
  Field,
  FormActions,
  Input,
  Loading,
  Money,
  Notice,
  PageHeader,
  PrintButton,
  TableActions,
  Textarea,
  saveWithConfirm,
  useLoad,
} from "../components/Common";
import { api, errorMessage, formatDate, numberValue, today } from "../lib";

const blank = (categoryId: string): RestaurantExpenseInput => ({
  date: today(),
  name: "",
  notes: "",
  manualTotal: null,
  lines: [{ categoryId, amount: 0, notes: "" }],
});

export function RestaurantExpensesPage({
  settings,
}: {
  settings: SettingsSnapshot;
}) {
  const categories = settings.catalogs.filter(
    (item) => item.kind === "restaurant_expense_category" && item.active,
  );
  const { data, error, reload } = useLoad(() => api.restaurantExpenses.list());
  const [form, setForm] = useState<RestaurantExpenseInput | null>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (new URLSearchParams(location.hash.split("?")[1]).get("new"))
      setForm(blank(categories[0]?.id ?? ""));
  }, []);
  const calculated = useMemo(
    () => form?.lines.reduce((sum, line) => sum + line.amount, 0) ?? 0,
    [form],
  );
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      await saveWithConfirm(
        { ...form, attachmentTokens: attachments.map((x) => x.token) },
        api.restaurantExpenses.save,
      );
      setMessage("تم حفظ فاتورة مصاريف المطعم");
      setForm(null);
      setAttachments([]);
      reload();
    } catch (reason) {
      setMessage(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };
  if (!data) return <Loading />;
  return (
    <div>
      <PageHeader
        eyebrow="المشتريات والمصاريف النقدية المباشرة"
        title="فواتير مصاريف المطعم"
        actions={
          <button
            className="button primary"
            onClick={() => setForm(blank(categories[0]?.id ?? ""))}
          >
            <Plus size={18} /> إنشاء فاتورة جديدة
          </button>
        }
      />
      {error && <Notice kind="danger">{error}</Notice>}
      {message && (
        <Notice kind={message.startsWith("تم") ? "success" : "danger"}>
          {message}
        </Notice>
      )}
      {form ? (
        <form className="document-form" onSubmit={save}>
          <div className="form-main">
            <div className="form-grid">
              <Field label="رقم الفاتورة" hint="اتركه فارغًا لتوليده تلقائيًا">
                <Input
                  value={form.invoiceNumber ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, invoiceNumber: e.target.value })
                  }
                />
              </Field>
              <Field label="التاريخ" required>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="اسم المحل أو الشخص" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
            </div>
            <div className="section-title form-section-title">
              <div>
                <Calculator size={20} />
                <h3>أقسام الفاتورة</h3>
              </div>
              <button
                className="button secondary small"
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    lines: [
                      ...form.lines,
                      {
                        categoryId: categories[0]?.id ?? "",
                        amount: 0,
                        notes: "",
                      },
                    ],
                  })
                }
              >
                <PlusCircle size={17} /> إضافة قسم
              </button>
            </div>
            <div className="line-list">
              {form.lines.map((line, index) => (
                <div className="line-row expense-line" key={line.id ?? index}>
                  <Field label="القسم">
                    <select
                      value={line.categoryId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((item, i) =>
                            i === index
                              ? { ...item, categoryId: e.target.value }
                              : item,
                          ),
                        })
                      }
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="المبلغ">
                    <Input
                      type="number"
                      min="0"
                      value={line.amount || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((item, i) =>
                            i === index
                              ? { ...item, amount: numberValue(e.target.value) }
                              : item,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="ملاحظة">
                    <Input
                      value={line.notes ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((item, i) =>
                            i === index
                              ? { ...item, notes: e.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </Field>
                  <button
                    className="icon-button danger"
                    type="button"
                    disabled={form.lines.length === 1}
                    onClick={() =>
                      setForm({
                        ...form,
                        lines: form.lines.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <details className="advanced">
              <summary>إدخال إجمالي يدوي لفاتورة قديمة</summary>
              <Field
                label="الإجمالي اليدوي"
                hint="اتركه فارغًا لاستخدام مجموع الأقسام"
              >
                <Input
                  type="number"
                  min="0"
                  value={form.manualTotal ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      manualTotal:
                        e.target.value === ""
                          ? null
                          : numberValue(e.target.value),
                    })
                  }
                />
              </Field>
            </details>
            <Field label="ملاحظات عامة">
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <AttachmentPicker value={attachments} onChange={setAttachments} />
            <ExistingAttachments type="restaurantExpense" id={form.id} />
          </div>
          <aside className="form-summary">
            <span className="summary-label">إجمالي الفاتورة</span>
            <Money value={form.manualTotal ?? calculated} />
            {form.manualTotal !== null && form.manualTotal !== undefined && (
              <em>معدّل يدويًا</em>
            )}
            <div className="summary-equation">
              <span>مجموع الأقسام</span>
              <Money value={calculated} />
            </div>
            <FormActions
              saving={saving}
              onCancel={() => {
                setForm(null);
                setAttachments([]);
              }}
              label="حفظ الفاتورة"
            />
            {form.id && <PrintButton />}
          </aside>
        </form>
      ) : data.length === 0 ? (
        <EmptyState
          title="لا توجد فواتير مصاريف"
          description="سجّل الفواتير النقدية اليومية مع توزيع مبالغها على الأقسام."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الرقم</th>
                <th>التاريخ</th>
                <th>الاسم</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.invoiceNumber}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.name}</td>
                  <td>
                    <Money value={item.effectiveTotal} />
                  </td>
                  <td>
                    {item.manualTotal !== null ? (
                      <span className="tag warning">معدّل يدويًا</span>
                    ) : (
                      <span className="tag">محسوب</span>
                    )}
                  </td>
                  <td>
                    <TableActions
                      onEdit={() => setForm({ ...item })}
                      onTrash={async () => {
                        await api.restaurantExpenses.trash(item.id);
                        reload();
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
