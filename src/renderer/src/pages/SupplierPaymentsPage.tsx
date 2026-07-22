import { useEffect, useState } from "react";
import { BanknoteArrowDown, Plus } from "lucide-react";
import type {
  PendingAttachment,
  SupplierPaymentInput,
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

const blank = (supplierId = ""): SupplierPaymentInput => ({
  date: today(),
  supplierId,
  amount: 0,
  method: "cash",
  notes: "",
});
export function SupplierPaymentsPage() {
  const suppliers = useLoad(() => api.suppliers.list());
  const { data, error, reload } = useLoad(() => api.supplierPayments.list());
  const [form, setForm] = useState<SupplierPaymentInput | null>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (new URLSearchParams(location.hash.split("?")[1]).get("new"))
      setForm(blank(suppliers.data?.[0]?.id));
  }, [suppliers.data]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      await saveWithConfirm(
        { ...form, attachmentTokens: attachments.map((x) => x.token) },
        api.supplierPayments.save,
      );
      setMessage("تم تسجيل الدفعة وتحديث حساب المورد");
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
  return (
    <div>
      <PageHeader
        eyebrow="دفعة مستقلة من دون فاتورة شراء"
        title="دفعات الموردين"
        actions={
          <button
            className="button primary"
            onClick={() => setForm(blank(suppliers.data?.[0]?.id))}
          >
            <Plus size={18} /> تسجيل دفعة
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
              <Field label="رقم الدفعة" hint="يولد تلقائيًا">
                <Input
                  value={form.paymentNumber ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, paymentNumber: e.target.value })
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
                  {suppliers.data.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} —{" "}
                      {Math.max(0, s.balance ?? 0).toLocaleString("ar-IQ")} د.ع
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="مبلغ الدفعة" required>
                <Input
                  autoFocus
                  type="number"
                  min="1"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({ ...form, amount: numberValue(e.target.value) })
                  }
                />
              </Field>
              <Field label="طريقة الدفع">
                <Select
                  value={form.method}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      method: e.target.value as SupplierPaymentInput["method"],
                    })
                  }
                >
                  <option value="cash">نقدي</option>
                  <option value="transfer">تحويل</option>
                  <option value="other">أخرى</option>
                </Select>
              </Field>
            </div>
            <Field label="ملاحظات">
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <AttachmentPicker value={attachments} onChange={setAttachments} />
            <ExistingAttachments type="supplierPayment" id={form.id} />
          </div>
          <aside className="form-summary">
            <BanknoteArrowDown />
            <span className="summary-label">مبلغ الدفعة</span>
            <Money value={form.amount} />
            <p className="summary-note">
              تقلل هذه الدفعة رصيد المورد وتظهر ضمن الأموال الخارجة.
            </p>
            <FormActions
              saving={saving}
              onCancel={() => {
                setForm(null);
                setAttachments([]);
              }}
              label="تسجيل الدفعة"
            />
            {form.id && <PrintButton />}
          </aside>
        </form>
      ) : data.length === 0 ? (
        <EmptyState
          title="لا توجد دفعات مستقلة"
          description="الدفعات المسجلة داخل فاتورة المورد تظهر هنا أيضًا."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم الدفعة</th>
                <th>التاريخ</th>
                <th>المورد</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
                <th>المصدر</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.paymentNumber}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.supplierName}</td>
                  <td>
                    <Money value={item.amount} />
                  </td>
                  <td>
                    {
                      { cash: "نقدي", transfer: "تحويل", other: "أخرى" }[
                        item.method ?? "cash"
                      ]
                    }
                  </td>
                  <td>
                    {item.invoiceId ? (
                      <span className="tag">مع فاتورة</span>
                    ) : (
                      "دفعة مستقلة"
                    )}
                  </td>
                  <td>
                    {item.invoiceId ? null : (
                      <TableActions
                        onEdit={() => setForm({ ...item })}
                        onTrash={async () => {
                          await api.supplierPayments.trash(item.id);
                          reload();
                        }}
                      />
                    )}
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
