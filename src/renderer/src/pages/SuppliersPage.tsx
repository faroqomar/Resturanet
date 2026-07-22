import { useEffect, useState } from "react";
import { Plus, UserRound, WalletCards } from "lucide-react";
import type { SettingsSnapshot, Supplier } from "@shared/contracts";
import {
  EmptyState,
  Field,
  FormActions,
  Input,
  Loading,
  Money,
  Notice,
  PageHeader,
  Select,
  TableActions,
  Textarea,
  useLoad,
} from "../components/Common";
import { api, errorMessage, formatDate, numberValue } from "../lib";

const blank = (typeId = ""): Omit<Supplier, "id"> & { id?: string } => ({
  name: "",
  typeId,
  phone: "",
  address: "",
  notes: "",
  openingBalance: 0,
  active: true,
});

export function SuppliersPage({ settings }: { settings: SettingsSnapshot }) {
  const types = settings.catalogs.filter(
    (item) => item.kind === "supplier_type" && item.active,
  );
  const { data, error, reload } = useLoad(() => api.suppliers.list(true));
  const [form, setForm] = useState<ReturnType<typeof blank> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const detail = useLoad(
    () => (selected ? api.suppliers.get(selected) : Promise.reject("")),
    [selected],
  );
  useEffect(() => {
    if (new URLSearchParams(location.hash.split("?")[1]).get("new"))
      setForm(blank(types[0]?.id));
  }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await api.suppliers.save(form);
      setMessage(result.message);
      setForm(null);
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
        eyebrow="حساب مستقل لكل مورد"
        title="الموردون"
        actions={
          <button
            className="button primary"
            onClick={() => setForm(blank(types[0]?.id))}
          >
            <Plus size={18} /> إضافة مورد
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
              <Field label="اسم المورد" required>
                <Input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="نوع المورد" required>
                <Select
                  value={form.typeId}
                  onChange={(e) => setForm({ ...form, typeId: e.target.value })}
                >
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="رقم الهاتف">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="الرصيد الافتتاحي" hint="الدين القديم على المطعم">
                <Input
                  type="number"
                  min="0"
                  value={form.openingBalance || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      openingBalance: numberValue(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="العنوان">
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </Field>
              <Field label="الحالة">
                <Select
                  value={form.active ? "1" : "0"}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.value === "1" })
                  }
                >
                  <option value="1">نشط</option>
                  <option value="0">غير نشط</option>
                </Select>
              </Field>
            </div>
            <Field label="ملاحظات">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          <aside className="form-summary">
            <UserRound />
            <h3>{form.id ? "تعديل المورد" : "مورد جديد"}</h3>
            <Money value={form.openingBalance} />
            <FormActions
              saving={saving}
              onCancel={() => setForm(null)}
              label="حفظ المورد"
            />
          </aside>
        </form>
      ) : selected && detail.data ? (
        <SupplierDetail detail={detail.data} onBack={() => setSelected(null)} />
      ) : data.length === 0 ? (
        <EmptyState
          title="لا يوجد موردون"
          description="أضف أول مورد لتسجيل فواتيره ودفعاته."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المورد</th>
                <th>النوع</th>
                <th>المشتريات</th>
                <th>الدفعات</th>
                <th>الرصيد المتبقي</th>
                <th>آخر تعامل</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((supplier) => (
                <tr
                  key={supplier.id}
                  className={!supplier.active ? "inactive" : ""}
                >
                  <td>
                    <button
                      className="name-link"
                      onClick={() => setSelected(supplier.id)}
                    >
                      {supplier.name}
                    </button>
                  </td>
                  <td>{supplier.typeName}</td>
                  <td>
                    <Money value={supplier.purchases ?? 0} />
                  </td>
                  <td>
                    <Money value={supplier.payments ?? 0} />
                  </td>
                  <td>
                    <Money
                      value={supplier.balance ?? 0}
                      tone={(supplier.balance ?? 0) > 0 ? "bad" : "good"}
                    />
                  </td>
                  <td>
                    {supplier.lastActivity
                      ? formatDate(supplier.lastActivity)
                      : "—"}
                  </td>
                  <td>
                    <TableActions
                      onEdit={() => setForm({ ...supplier })}
                      onTrash={async () => {
                        await api.suppliers.trash(supplier.id);
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

function SupplierDetail({
  detail,
  onBack,
}: {
  detail: Awaited<ReturnType<typeof api.suppliers.get>>;
  onBack: () => void;
}) {
  return (
    <div>
      <button className="back-link" onClick={onBack}>
        العودة إلى الموردين
      </button>
      <section className="supplier-hero">
        <div>
          <WalletCards />
          <span>
            <small>{detail.supplier.typeName}</small>
            <h2>{detail.supplier.name}</h2>
          </span>
        </div>
        <div>
          <small>الرصيد الحالي</small>
          <Money
            value={detail.supplier.balance ?? 0}
            tone={(detail.supplier.balance ?? 0) > 0 ? "bad" : "good"}
          />
        </div>
      </section>
      <div className="supplier-stats">
        <span>
          الرصيد الافتتاحي <Money value={detail.supplier.openingBalance} />
        </span>
        <span>
          إجمالي المشتريات <Money value={detail.supplier.purchases ?? 0} />
        </span>
        <span>
          إجمالي الدفعات <Money value={detail.supplier.payments ?? 0} />
        </span>
      </div>
      <section className="panel">
        <div className="section-title">
          <div>
            <h2>كشف الحساب</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>عليه</th>
                <th>له / مدفوع</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {detail.ledger.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.reference}</td>
                  <td>
                    <Money value={entry.debit} />
                  </td>
                  <td>
                    <Money value={entry.credit} />
                  </td>
                  <td>
                    <Money
                      value={entry.runningBalance}
                      tone={entry.runningBalance > 0 ? "bad" : "good"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
