import { useEffect, useMemo, useState } from "react";
import { Plus, PlusCircle, ReceiptIndianRupee, Trash2 } from "lucide-react";
import type {
  PendingAttachment,
  Supplier,
  SupplierInvoiceInput,
  SupplierInvoiceKind,
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

const blank = (
  kind: SupplierInvoiceKind,
  supplierId = "",
): SupplierInvoiceInput => ({
  kind,
  date: today(),
  supplierId,
  paidNow: 0,
  previousBalanceOverride: null,
  notes: "",
  lines: [
    {
      name: "",
      quantity: 1,
      unit: kind === "produce" ? "كيلو" : "",
      unitPrice: null,
      total: 0,
      notes: "",
    },
  ],
});

export function SupplierInvoicesPage({ kind }: { kind: SupplierInvoiceKind }) {
  const suppliers = useLoad(() => api.suppliers.list());
  const { data, error, reload } = useLoad(
    () => api.supplierInvoices.list(kind),
    [kind],
  );
  const [form, setForm] = useState<SupplierInvoiceInput | null>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setForm(null);
    if (new URLSearchParams(location.hash.split("?")[1]).get("new"))
      setForm(blank(kind, suppliers.data?.[0]?.id));
  }, [kind, suppliers.data]);
  const total = useMemo(
    () => form?.lines.reduce((sum, line) => sum + line.total, 0) ?? 0,
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
        api.supplierInvoices.save,
      );
      setMessage("تم حفظ فاتورة المورد وتحديث حسابه");
      setForm(null);
      setAttachments([]);
      reload();
    } catch (reason) {
      setMessage(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };
  if (!data || !suppliers.data) return <Loading />;
  const title = kind === "produce" ? "فواتير المخضر" : "فواتير الموردين";
  return (
    <div>
      <PageHeader
        eyebrow={
          kind === "produce"
            ? "الكمية بالكيلو والسعر والمجموع"
            : "المشتريات التي تزيد رصيد المورد"
        }
        title={title}
        actions={
          <button
            className="button primary"
            onClick={() => setForm(blank(kind, suppliers.data?.[0]?.id))}
          >
            <Plus size={18} /> إنشاء فاتورة جديدة
          </button>
        }
      />
      {error && <Notice kind="danger">{error}</Notice>}
      {suppliers.data.length === 0 && (
        <Notice>أضف موردًا أولًا قبل إنشاء فاتورة.</Notice>
      )}
      {message && (
        <Notice kind={message.startsWith("تم") ? "success" : "danger"}>
          {message}
        </Notice>
      )}
      {form ? (
        <form className="document-form" onSubmit={save}>
          <div className="form-main">
            <div className="form-grid">
              <Field label="رقم الفاتورة" hint="يولد تلقائيًا إذا تُرك فارغًا">
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
              <Field label="المورد" required>
                <Select
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm({ ...form, supplierId: e.target.value })
                  }
                >
                  {suppliers.data.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="section-title form-section-title">
              <div>
                <ReceiptIndianRupee size={20} />
                <h3>أصناف الفاتورة</h3>
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
                        name: "",
                        quantity: 1,
                        unit: kind === "produce" ? "كيلو" : "",
                        unitPrice: null,
                        total: 0,
                        notes: "",
                      },
                    ],
                  })
                }
              >
                <PlusCircle size={17} /> إضافة صنف
              </button>
            </div>
            <div className="line-list">
              {form.lines.map((line, index) => (
                <div className="line-row invoice-line" key={line.id ?? index}>
                  <Field
                    label={kind === "produce" ? "الصنف أو الخضار" : "الصنف"}
                  >
                    <Input
                      value={line.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((item, i) =>
                            i === index
                              ? { ...item, name: e.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="الكمية">
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={line.quantity}
                      onChange={(e) => {
                        const quantity = Math.max(0, Number(e.target.value));
                        setForm({
                          ...form,
                          lines: form.lines.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  quantity,
                                  total: item.unitPrice
                                    ? Math.round(quantity * item.unitPrice)
                                    : item.total,
                                }
                              : item,
                          ),
                        });
                      }}
                    />
                  </Field>
                  <Field label="الوحدة">
                    <Input
                      value={line.unit ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((item, i) =>
                            i === index
                              ? { ...item, unit: e.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field
                    label={kind === "produce" ? "سعر الكيلو" : "سعر الوحدة"}
                  >
                    <Input
                      type="number"
                      min="0"
                      value={line.unitPrice ?? ""}
                      onChange={(e) => {
                        const unitPrice =
                          e.target.value === ""
                            ? null
                            : numberValue(e.target.value);
                        setForm({
                          ...form,
                          lines: form.lines.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  unitPrice,
                                  total: unitPrice
                                    ? Math.round(item.quantity * unitPrice)
                                    : item.total,
                                }
                              : item,
                          ),
                        });
                      }}
                    />
                  </Field>
                  <Field label="السعر الكلي">
                    <Input
                      type="number"
                      min="0"
                      value={line.total || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((item, i) =>
                            i === index
                              ? { ...item, total: numberValue(e.target.value) }
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
            <div className="form-grid">
              <Field
                label="الرصيد السابق"
                hint="اتركه فارغًا ليظهر من حساب المورد"
              >
                <Input
                  type="number"
                  min="0"
                  value={form.previousBalanceOverride ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      previousBalanceOverride:
                        e.target.value === ""
                          ? null
                          : numberValue(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="المبلغ المدفوع الآن">
                <Input
                  type="number"
                  min="0"
                  value={form.paidNow || ""}
                  onChange={(e) =>
                    setForm({ ...form, paidNow: numberValue(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Field label="ملاحظات">
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <AttachmentPicker value={attachments} onChange={setAttachments} />
            <ExistingAttachments type="supplierInvoice" id={form.id} />
          </div>
          <aside className="form-summary">
            <span className="summary-label">مجموع القائمة</span>
            <Money value={total} />
            <div className="summary-equation">
              <span>المدفوع الآن</span>
              <Money value={form.paidNow ?? 0} />
              <span>زيادة الدين من الفاتورة</span>
              <Money value={Math.max(0, total - (form.paidNow ?? 0))} />
            </div>
            <FormActions
              saving={saving}
              onCancel={() => {
                setForm(null);
                setAttachments([]);
              }}
              label="حفظ وتحديث حساب المورد"
            />
            {form.id && <PrintButton />}
          </aside>
        </form>
      ) : data.length === 0 ? (
        <EmptyState
          title={`لا توجد ${title}`}
          description="أنشئ فاتورة لعرض المشتريات والرصيد المتبقي هنا."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الرقم</th>
                <th>التاريخ</th>
                <th>المورد</th>
                <th>مجموع القائمة</th>
                <th>المدفوع الآن</th>
                <th>المتبقي بعد الفاتورة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.invoiceNumber}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.supplierName}</td>
                  <td>
                    <Money value={item.total} />
                  </td>
                  <td>
                    <Money value={item.paidNow ?? 0} />
                  </td>
                  <td>
                    <Money
                      value={item.remainingBalance}
                      tone={item.remainingBalance > 0 ? "bad" : "good"}
                    />
                  </td>
                  <td>
                    <TableActions
                      onEdit={() => setForm({ ...item })}
                      onTrash={async () => {
                        await api.supplierInvoices.trash(item.id);
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
