import { useMemo, useState } from "react";
import {
  Download,
  FileSearch,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DateRange, EntityType, ReportFilters } from "@shared/contracts";
import {
  DateRangeBar,
  EmptyState,
  Input,
  Loading,
  Money,
  Notice,
  PageHeader,
  PrintButton,
  Select,
  useLoad,
} from "../components/Common";
import { api, formatDate, rangeFor } from "../lib";

type ReportView = "summary" | "supplierDebt" | "categories" | "invoices";

function previousRange(range: DateRange): DateRange {
  const from = new Date(`${range.from}T12:00:00Z`);
  const to = new Date(`${range.to}T12:00:00Z`);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const previousTo = new Date(from);
  previousTo.setUTCDate(from.getUTCDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setUTCDate(previousTo.getUTCDate() - days + 1);
  return {
    from: previousFrom.toISOString().slice(0, 10),
    to: previousTo.toISOString().slice(0, 10),
  };
}

function Change({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <small>لا توجد فترة سابقة للمقارنة</small>;
  const percentage =
    Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  return (
    <small className={percentage >= 0 ? "change-up" : "change-down"}>
      {percentage >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{" "}
      {Math.abs(percentage)}% عن الفترة السابقة
    </small>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState<DateRange>(rangeFor("month"));
  const [view, setView] = useState<ReportView>("summary");
  const [entityType, setEntityType] = useState<EntityType | "">("");
  const [supplierId, setSupplierId] = useState("");
  const [search, setSearch] = useState("");
  const suppliers = useLoad(() => api.suppliers.list(true));
  const filters: ReportFilters = {
    ...range,
    entityType: entityType || undefined,
    supplierId: supplierId || undefined,
    search: search || undefined,
  };
  const { data, error } = useLoad(
    () => api.reports.rows(filters),
    [range.from, range.to, entityType, supplierId, search],
  );
  const current = useLoad(
    () => api.dashboard.get(range),
    [range.from, range.to],
  );
  const previous = useLoad(
    () => api.dashboard.get(previousRange(range)),
    [range.from, range.to],
  );
  const totals = useMemo(
    () => ({
      amount: data?.reduce((s, x) => s + x.amount, 0) ?? 0,
      paid: data?.reduce((s, x) => s + x.paid, 0) ?? 0,
      remaining: data?.reduce((s, x) => s + x.remaining, 0) ?? 0,
    }),
    [data],
  );
  const categories = useMemo(() => {
    const map = new Map<string, { amount: number; count: Set<string> }>();
    for (const row of data ?? []) {
      if (row.type === "مبيعات" || row.type === "دفعة مورد") continue;
      const value = map.get(row.category) ?? {
        amount: 0,
        count: new Set<string>(),
      };
      value.amount += row.amount;
      value.count.add(row.id);
      map.set(row.category, value);
    }
    const total = [...map.values()].reduce((sum, x) => sum + x.amount, 0);
    return [...map.entries()]
      .map(([name, value]) => ({
        name,
        amount: value.amount,
        count: value.count.size,
        percentage: total ? Math.round((value.amount / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [data]);
  const views: Array<[ReportView, string]> = [
    ["summary", "التقرير المالي"],
    ["supplierDebt", "ديون الموردين"],
    ["categories", "المصاريف حسب القسم"],
    ["invoices", "سجل الفواتير"],
  ];
  return (
    <div className="report-page">
      <PageHeader
        eyebrow="يومي وأسبوعي وشهري وفترة مخصصة"
        title="التقارير"
        actions={
          <>
            <PrintButton />
            <button
              className="button primary"
              onClick={() => api.reports.exportCsv(filters)}
            >
              <Download size={17} /> تصدير CSV
            </button>
          </>
        }
      />
      <DateRangeBar value={range} onChange={setRange} />
      <div className="report-tabs">
        {views.map(([key, label]) => (
          <button
            key={key}
            className={view === key ? "active" : ""}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="report-filters">
        <label>
          <Search size={17} />
          <Input
            placeholder="ابحث بالرقم أو الاسم أو القسم"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as EntityType | "")}
        >
          <option value="">كل أنواع السجلات</option>
          <option value="restaurantExpense">فواتير مصاريف المطعم</option>
          <option value="supplierInvoice">فواتير الموردين</option>
          <option value="supplierPayment">دفعات الموردين</option>
          <option value="sale">المبيعات</option>
          <option value="operatingExpense">الإيجار والرواتب والمصاريف</option>
        </Select>
        <Select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">كل الموردين</option>
          {suppliers.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      {error && <Notice kind="danger">{error}</Notice>}
      {view === "summary" && (
        <>
          {!current.data || !previous.data ? (
            <Loading />
          ) : (
            <>
              <section className="comparison-grid">
                <article>
                  <small>المبيعات المسجلة</small>
                  <Money value={current.data.sales} />
                  <Change
                    current={current.data.sales}
                    previous={previous.data.sales}
                  />
                </article>
                <article>
                  <small>المصروفات المسجلة</small>
                  <Money value={current.data.recordedExpenses} />
                  <Change
                    current={current.data.recordedExpenses}
                    previous={previous.data.recordedExpenses}
                  />
                </article>
                <article>
                  <small>الأموال الخارجة</small>
                  <Money value={current.data.cashOut} />
                  <Change
                    current={current.data.cashOut}
                    previous={previous.data.cashOut}
                  />
                </article>
                <article>
                  <small>النتيجة التقريبية</small>
                  {current.data.approximateResult === null ? (
                    <b>غير متوفرة</b>
                  ) : (
                    <Money
                      value={current.data.approximateResult}
                      tone={
                        current.data.approximateResult >= 0 ? "good" : "bad"
                      }
                    />
                  )}
                  <small>تظهر فقط عند اكتمال بيانات المبيعات</small>
                </article>
              </section>
              {!current.data.salesComplete && (
                <Notice>
                  بيانات المبيعات غير مكتملة، لا يمكن حساب الربح أو الخسارة
                  بدقة.
                </Notice>
              )}
              <section className="report-summary">
                <div>
                  <small>مشتريات الموردين</small>
                  <Money value={current.data.supplierPurchases} />
                </div>
                <div>
                  <small>دفعات الموردين</small>
                  <Money value={current.data.supplierPayments} />
                </div>
                <div>
                  <small>الإيجار والرواتب والمصاريف</small>
                  <Money value={current.data.operatingExpenses} />
                </div>
                <div>
                  <small>عدد السجلات</small>
                  <b>{current.data.documentCount}</b>
                </div>
              </section>
            </>
          )}
        </>
      )}
      {view === "supplierDebt" &&
        (!suppliers.data ? (
          <Loading />
        ) : suppliers.data.filter((s) => (s.balance ?? 0) !== 0).length ===
          0 ? (
          <EmptyState
            title="لا توجد أرصدة موردين"
            description="ستظهر هنا الديون أو الأرصدة الدائنة عند تسجيل الحركات."
          />
        ) : (
          <div className="table-wrap printable">
            <table>
              <thead>
                <tr>
                  <th>المورد</th>
                  <th>النوع</th>
                  <th>الرصيد الافتتاحي</th>
                  <th>المشتريات</th>
                  <th>الدفعات</th>
                  <th>الرصيد الحالي</th>
                  <th>آخر تعامل</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.data
                  .filter((s) => (s.balance ?? 0) !== 0)
                  .map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.typeName}</td>
                      <td>
                        <Money value={s.openingBalance} />
                      </td>
                      <td>
                        <Money value={s.purchases ?? 0} />
                      </td>
                      <td>
                        <Money value={s.payments ?? 0} />
                      </td>
                      <td>
                        <Money
                          value={s.balance ?? 0}
                          tone={(s.balance ?? 0) > 0 ? "bad" : "good"}
                        />
                      </td>
                      <td>
                        {s.lastActivity ? formatDate(s.lastActivity) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      {view === "categories" &&
        (categories.length === 0 ? (
          <EmptyState
            title="لا توجد مصروفات في الفترة"
            description="أضف الفواتير أو غيّر الفترة لرؤية توزيع الأقسام."
          />
        ) : (
          <div className="table-wrap printable">
            <table>
              <thead>
                <tr>
                  <th>القسم</th>
                  <th>إجمالي المبلغ</th>
                  <th>عدد الفواتير</th>
                  <th>النسبة من المصروفات</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>
                      <Money value={item.amount} />
                    </td>
                    <td>{item.count}</td>
                    <td>
                      <b>{item.percentage}%</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {view === "invoices" &&
        (!data ? (
          <Loading />
        ) : data.length === 0 ? (
          <EmptyState
            title="لا توجد نتائج"
            description="غيّر الفترة أو الفلاتر، أو أضف سجلات جديدة أولًا."
            action={<FileSearch />}
          />
        ) : (
          <>
            <section className="report-summary">
              <div>
                <small>إجمالي المبالغ</small>
                <Money value={totals.amount} />
              </div>
              <div>
                <small>المدفوع ضمن السجلات</small>
                <Money value={totals.paid} />
              </div>
              <div>
                <small>المتبقي</small>
                <Money
                  value={totals.remaining}
                  tone={totals.remaining > 0 ? "bad" : undefined}
                />
              </div>
              <div>
                <small>عدد النتائج</small>
                <b>{data.length}</b>
              </div>
            </section>
            <div className="table-wrap printable">
              <table>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>الرقم</th>
                    <th>الجهة</th>
                    <th>القسم</th>
                    <th>المبلغ</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={`${row.id}-${row.category}-${index}`}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.type}</td>
                      <td>{row.reference}</td>
                      <td>{row.party || "—"}</td>
                      <td>{row.category}</td>
                      <td>
                        <Money value={row.amount} />
                      </td>
                      <td>
                        <Money value={row.paid} />
                      </td>
                      <td>
                        <Money
                          value={row.remaining}
                          tone={row.remaining > 0 ? "bad" : undefined}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}
    </div>
  );
}
