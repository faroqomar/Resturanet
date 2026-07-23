import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Plus, PlusCircle, Trash2 } from "lucide-react";
import type {
  PendingAttachment,
  SaleInput,
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
const blank = (): SaleInput => ({
  date: today(),
  completeness: "complete",
  manualTotal: null,
  notes: "",
  lines: [],
});
export function SalesPage({ settings }: { settings: SettingsSnapshot }) {
  const { catalogName } = useI18n();
  const categories = settings.catalogs.filter(
    (x) => x.kind === "sales_category" && x.active,
  );
  const { data, error, reload } = useLoad(() => api.sales.list());
  const [form, setForm] = useState<SaleInput | null>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (new URLSearchParams(location.hash.split("?")[1]).get("new"))
      setForm(blank());
  }, []);
  const calculated = useMemo(
    () => form?.lines.reduce((s, x) => s + x.amount, 0) ?? 0,
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
        api.sales.save,
      );
      setMessage("تم حفظ المبيعات اليومية");
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
        eyebrow="إجمالي بسيط مع تفاصيل اختيارية"
        title="المبيعات اليومية"
        actions={
          <button className="button primary" onClick={() => setForm(blank())}>
            <Plus size={18} /> تسجيل مبيعات يومية
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
              <Field label="حالة بيانات المبيعات" required>
                <Select
                  value={form.completeness}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      completeness: e.target.value as SaleInput["completeness"],
                    })
                  }
                >
                  <option value="complete">مكتملة لهذا اليوم</option>
                  <option value="estimated">تقريبية</option>
                  <option value="unavailable">غير متوفرة</option>
                </Select>
              </Field>
              <Field
                label="إجمالي المبيعات"
                required
                hint="يمكن إدخاله مباشرةً"
              >
                <Input
                  type="number"
                  min="0"
                  disabled={form.completeness === "unavailable"}
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
            </div>
            {form.completeness === "unavailable" && (
              <Notice>
                سيظهر الربح أو الخسارة غير متوفرين لهذا اليوم والفترات التي
                تحتويه.
              </Notice>
            )}
            <div className="section-title form-section-title">
              <div>
                <h3>تفاصيل المبيعات الاختيارية</h3>
              </div>
              <button
                type="button"
                className="button secondary small"
                onClick={() =>
                  setForm({
                    ...form,
                    lines: [
                      ...form.lines,
                      {
                        categoryId: categories[0]?.id,
                        name: categories[0]?.name ?? "",
                        amount: 0,
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
                <div className="line-row sales-line" key={line.id ?? index}>
                  <Field label="القسم">
                    <Select
                      value={line.categoryId ?? ""}
                      onChange={(e) => {
                        const category = categories.find(
                          (x) => x.id === e.target.value,
                        );
                        setForm({
                          ...form,
                          lines: form.lines.map((x, i) =>
                            i === index
                              ? {
                                  ...x,
                                  categoryId: e.target.value,
                                  name: category?.name ?? x.name,
                                }
                              : x,
                          ),
                        });
                      }}
                    >
                      {categories.map((x) => (
                        <option key={x.id} value={x.id}>
                          {catalogName(x)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="المبلغ">
                    <Input
                      type="number"
                      min="0"
                      value={line.amount || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((x, i) =>
                            i === index
                              ? { ...x, amount: numberValue(e.target.value) }
                              : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  <button
                    className="icon-button danger"
                    type="button"
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
            {form.lines.length > 0 && (
              <Notice
                kind={
                  form.manualTotal !== null && form.manualTotal !== calculated
                    ? "warning"
                    : "success"
                }
              >
                مجموع التفاصيل: <Money value={calculated} />{" "}
                {form.manualTotal !== null && form.manualTotal !== calculated
                  ? "— الإجمالي اليدوي مختلف عن التفاصيل."
                  : ""}
              </Notice>
            )}
            <Field label="ملاحظات">
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <AttachmentPicker value={attachments} onChange={setAttachments} />
            <ExistingAttachments type="sale" id={form.id} />
          </div>
          <aside className="form-summary">
            <BadgeDollarSign />
            <span className="summary-label">إجمالي اليوم</span>
            <Money
              value={
                form.completeness === "unavailable"
                  ? 0
                  : (form.manualTotal ?? calculated)
              }
            />
            <em>
              {
                {
                  complete: "بيانات مكتملة",
                  estimated: "بيانات تقريبية",
                  unavailable: "بيانات غير متوفرة",
                }[form.completeness]
              }
            </em>
            <FormActions
              saving={saving}
              onCancel={() => {
                setForm(null);
                setAttachments([]);
              }}
              label="حفظ المبيعات"
            />
            {form.id && <PrintButton />}
          </aside>
        </form>
      ) : data.length === 0 ? (
        <EmptyState
          title="لا توجد مبيعات مسجلة"
          description="أدخل إجماليًا واحدًا لليوم، ويمكنك إضافة التفاصيل عند توفرها."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الرقم</th>
                <th>التاريخ</th>
                <th>الإجمالي</th>
                <th>حالة البيانات</th>
                <th>التفاصيل</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.recordNumber}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>
                    <Money value={item.effectiveTotal} />
                  </td>
                  <td>
                    <span
                      className={`tag ${item.completeness === "unavailable" ? "danger" : item.completeness === "estimated" ? "warning" : ""}`}
                    >
                      {
                        {
                          complete: "مكتملة",
                          estimated: "تقريبية",
                          unavailable: "غير متوفرة",
                        }[item.completeness]
                      }
                    </span>
                  </td>
                  <td>{item.lines.length} قسم</td>
                  <td>
                    <TableActions
                      onEdit={() => setForm({ ...item })}
                      onTrash={async () => {
                        await api.sales.trash(item.id);
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
