import { useEffect, useMemo, useState } from "react";
import { Landmark, Plus, PlusCircle, Trash2 } from "lucide-react";
import type {
  OperatingExpenseInput,
  PendingAttachment,
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
  Select,
  TableActions,
  Textarea,
  saveWithConfirm,
  useLoad,
} from "../components/Common";
import { api, errorMessage, formatDate, numberValue, today } from "../lib";
import { useI18n } from "../i18n";
const blank = (expenseTypeId = ""): OperatingExpenseInput => ({
  date: today(),
  expenseTypeId,
  recipient: "",
  totalDue: 0,
  notes: "",
  payments: [],
});
export function OperatingExpensesPage({
  settings,
}: {
  settings: SettingsSnapshot;
}) {
  const { catalogName } = useI18n();
  const types = settings.catalogs.filter(
    (x) => x.kind === "expense_type" && x.active,
  );
  const { data, error, reload } = useLoad(() => api.operatingExpenses.list());
  const [form, setForm] = useState<OperatingExpenseInput | null>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (new URLSearchParams(location.hash.split("?")[1]).get("new"))
      setForm(blank(types[0]?.id));
  }, []);
  const paid = useMemo(
    () => form?.payments.reduce((s, x) => s + x.amount, 0) ?? 0,
    [form],
  );
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      await saveWithConfirm(
        { ...form, attachmentTokens: attachments.map((x) => x.token) },
        api.operatingExpenses.save,
      );
      setMessage("تم حفظ المصروف ودفعاته");
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
        eyebrow="التزامات مستقلة ودفعات جزئية"
        title="الإيجار والرواتب والمصاريف الأخرى"
        actions={
          <button
            className="button primary"
            onClick={() => setForm(blank(types[0]?.id))}
          >
            <Plus size={18} /> تسجيل مصروف
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
              <Field label="رقم السجل" hint="يولد تلقائيًا">
                <Input
                  value={form.recordNumber ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, recordNumber: e.target.value })
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
              <Field label="نوع المصروف" required>
                <Select
                  value={form.expenseTypeId}
                  onChange={(e) =>
                    setForm({ ...form, expenseTypeId: e.target.value })
                  }
                >
                  {types.map((x) => (
                    <option key={x.id} value={x.id}>
                      {catalogName(x)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="المستلم أو الجهة">
                <Input
                  value={form.recipient ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, recipient: e.target.value })
                  }
                />
              </Field>
              <Field label="إجمالي المبلغ المستحق" required>
                <Input
                  type="number"
                  min="1"
                  value={form.totalDue || ""}
                  onChange={(e) =>
                    setForm({ ...form, totalDue: numberValue(e.target.value) })
                  }
                />
              </Field>
            </div>
            <div className="section-title form-section-title">
              <div>
                <h3>الدفعات</h3>
              </div>
              <button
                type="button"
                className="button secondary small"
                onClick={() =>
                  setForm({
                    ...form,
                    payments: [
                      ...form.payments,
                      { date: form.date, amount: 0, method: "cash", notes: "" },
                    ],
                  })
                }
              >
                <PlusCircle size={17} /> إضافة دفعة جزئية
              </button>
            </div>
            <div className="line-list">
              {form.payments.map((payment, index) => (
                <div
                  className="line-row operating-line"
                  key={payment.id ?? index}
                >
                  <Field label="التاريخ">
                    <Input
                      type="date"
                      value={payment.date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          payments: form.payments.map((x, i) =>
                            i === index ? { ...x, date: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="المبلغ">
                    <Input
                      type="number"
                      min="1"
                      value={payment.amount || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          payments: form.payments.map((x, i) =>
                            i === index
                              ? { ...x, amount: numberValue(e.target.value) }
                              : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="الطريقة">
                    <Select
                      value={payment.method}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          payments: form.payments.map((x, i) =>
                            i === index
                              ? {
                                  ...x,
                                  method: e.target
                                    .value as typeof payment.method,
                                }
                              : x,
                          ),
                        })
                      }
                    >
                      <option value="cash">نقدي</option>
                      <option value="transfer">تحويل</option>
                      <option value="other">أخرى</option>
                    </Select>
                  </Field>
                  <Field label="ملاحظة">
                    <Input
                      value={payment.notes ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          payments: form.payments.map((x, i) =>
                            i === index ? { ...x, notes: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() =>
                      setForm({
                        ...form,
                        payments: form.payments.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            {paid > form.totalDue && (
              <Notice kind="danger">
                مجموع الدفعات أكبر من المبلغ المستحق.
              </Notice>
            )}
            <Field label="ملاحظات">
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <AttachmentPicker value={attachments} onChange={setAttachments} />
            <ExistingAttachments type="operatingExpense" id={form.id} />
          </div>
          <aside className="form-summary">
            <Landmark />
            <span className="summary-label">المبلغ المستحق</span>
            <Money value={form.totalDue} />
            <div className="summary-equation">
              <span>المدفوع</span>
              <Money value={paid} />
              <span>المتبقي</span>
              <Money value={Math.max(0, form.totalDue - paid)} />
            </div>
            <FormActions
              saving={saving}
              onCancel={() => {
                setForm(null);
                setAttachments([]);
              }}
              label="حفظ المصروف"
            />
            {form.id && <PrintButton />}
          </aside>
        </form>
      ) : data.length === 0 ? (
        <EmptyState
          title="لا توجد مصاريف تشغيلية"
          description="سجّل الإيجار أو الراتب أو المصروف، ثم أضف دفعاته الكاملة أو الجزئية."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الرقم</th>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>الجهة</th>
                <th>المستحق</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.recordNumber}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>
                    {catalogName(
                      settings.catalogs.find(
                        (entry) => entry.id === item.expenseTypeId,
                      ) ?? {
                        id: item.expenseTypeId,
                        kind: "expense_type",
                        name: item.expenseTypeName,
                        active: true,
                        builtIn: false,
                      },
                    )}
                  </td>
                  <td>{item.recipient || "—"}</td>
                  <td>
                    <Money value={item.totalDue} />
                  </td>
                  <td>
                    <Money value={item.paid} />
                  </td>
                  <td>
                    <Money
                      value={item.remaining}
                      tone={item.remaining > 0 ? "bad" : "good"}
                    />
                  </td>
                  <td>
                    <span
                      className={`tag ${item.paymentStatus === "partial" ? "warning" : item.paymentStatus === "unpaid" ? "danger" : ""}`}
                    >
                      {
                        {
                          paid: "مدفوع",
                          partial: "مدفوع جزئيًا",
                          unpaid: "غير مدفوع",
                        }[item.paymentStatus]
                      }
                    </span>
                  </td>
                  <td>
                    <TableActions
                      onEdit={() => setForm({ ...item })}
                      onTrash={async () => {
                        await api.operatingExpenses.trash(item.id);
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
