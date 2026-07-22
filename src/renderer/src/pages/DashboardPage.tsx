import { useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  HandCoins,
  Landmark,
  Receipt,
  Scale,
  ShoppingCart,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DateRange } from "@shared/contracts";
import {
  DateRangeBar,
  EmptyState,
  Loading,
  Money,
  Notice,
  PageHeader,
  useLoad,
} from "../components/Common";
import { api, formatDate, rangeFor } from "../lib";

export function DashboardPage() {
  const [range, setRange] = useState<DateRange>(rangeFor("month"));
  const { data, error } = useLoad(
    () => api.dashboard.get(range),
    [range.from, range.to],
  );
  if (!data && !error) return <Loading />;
  if (error) return <Notice kind="danger">{error}</Notice>;
  if (!data) return null;
  const metrics = [
    ["إجمالي المبيعات المسجلة", data.sales, "good", ArrowUpRight],
    ["مصاريف المطعم", data.restaurantExpenses, "", Receipt],
    ["مشتريات الموردين", data.supplierPurchases, "", ShoppingCart],
    ["دفعات الموردين", data.supplierPayments, "", HandCoins],
    ["الإيجار والرواتب والمصاريف", data.operatingExpenses, "", Landmark],
    ["الأموال الخارجة فعليًا", data.cashOut, "bad", ArrowDownLeft],
    ["ديون الموردين المتبقية", data.supplierDebt, "bad", Scale],
    ["عدد الفواتير والعمليات", data.documentCount, "count", FileText],
  ] as const;
  return (
    <div className="dashboard">
      <PageHeader eyebrow="صورة الوضع المالي" title="الرئيسية" />
      <DateRangeBar value={range} onChange={setRange} />
      {!data.salesComplete && (
        <Notice>
          بيانات المبيعات غير مكتملة، لا يمكن حساب الربح أو الخسارة بدقة.
        </Notice>
      )}
      <section className="metrics">
        {metrics.map(([label, value, tone, Icon], index) => (
          <article className={`metric metric-${index}`} key={label}>
            <div>
              <span>{label}</span>
              <Icon size={21} />
            </div>
            {tone === "count" ? (
              <strong>{value.toLocaleString("ar-IQ")}</strong>
            ) : (
              <Money value={value} tone={tone as "good" | "bad" | undefined} />
            )}
          </article>
        ))}
      </section>
      <section
        className={`result-strip ${data.approximateResult === null ? "unknown" : data.approximateResult >= 0 ? "positive" : "negative"}`}
      >
        <div>
          <span>النتيجة التقريبية للفترة</span>
          <small>
            المبيعات ناقص المصروفات المسجلة، ولا تمثل ربحًا محاسبيًا نهائيًا
          </small>
        </div>
        {data.approximateResult === null ? (
          <b>
            <AlertCircle size={20} /> غير متوفرة
          </b>
        ) : (
          <Money
            value={data.approximateResult}
            tone={data.approximateResult >= 0 ? "good" : "bad"}
          />
        )}
      </section>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="section-title">
            <div>
              <h2>المبيعات مقابل المصروفات</h2>
            </div>
          </div>
          {data.dailyChart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.dailyChart}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#687947" stopOpacity={0.38} />
                    <stop offset="1" stopColor="#687947" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#a84c3e" stopOpacity={0.28} />
                    <stop offset="1" stopColor="#a84c3e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#ded6c8"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => v.slice(5)}
                  reversed
                />
                <YAxis
                  orientation="right"
                  tickFormatter={(v) => `${Math.round(v / 1000)}أ`}
                />
                <Tooltip
                  formatter={(value) => Number(value).toLocaleString("ar-IQ")}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="المبيعات"
                  stroke="#687947"
                  fill="url(#sales)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="المصاريف"
                  stroke="#a84c3e"
                  fill="url(#expense)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="لا توجد حركة في هذه الفترة"
              description="ابدأ بإضافة مبيعات أو فاتورة وستظهر المقارنة هنا."
            />
          )}
        </section>
        <section className="panel">
          <div className="section-title">
            <div>
              <Users size={20} />
              <h2>الموردون ذوو المبالغ المتبقية</h2>
            </div>
            <span className="count-pill">{data.suppliersWithDebt}</span>
          </div>
          {data.supplierDebts.length ? (
            <div className="debt-list">
              {data.supplierDebts.map((supplier) => (
                <div key={supplier.id}>
                  <span>{supplier.name}</span>
                  <Money value={supplier.balance} tone="bad" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="لا توجد ديون مسجلة"
              description="ستظهر أرصدة الموردين هنا بعد إضافة فواتيرهم."
            />
          )}
        </section>
        <section className="panel">
          <div className="section-title">
            <div>
              <FileText size={20} />
              <h2>آخر الفواتير والعمليات</h2>
            </div>
          </div>
          {data.recent.length ? (
            <div className="activity-list">
              {data.recent.map((item) => (
                <div key={`${item.type}-${item.id}-${item.title}`}>
                  <span>
                    <b>{item.title}</b>
                    <small>{formatDate(item.date)}</small>
                  </span>
                  <Money value={item.amount} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="الدفتر فارغ"
              description="استخدم زر إنشاء فاتورة جديدة لبدء التسجيل."
            />
          )}
        </section>
        <section className="panel">
          <div className="section-title">
            <div>
              <Scale size={20} />
              <h2>توزيع المصروفات</h2>
            </div>
          </div>
          {data.expenseBreakdown.length ? (
            <div className="breakdown">
              {data.expenseBreakdown.map((item) => (
                <div key={item.name}>
                  <div>
                    <span>{item.name}</span>
                    <b>{item.percentage}%</b>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${item.percentage}%` }} />
                  </div>
                  <Money value={item.amount} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="لا توجد مصروفات"
              description="سيظهر توزيع الأقسام عند إضافة الفواتير."
            />
          )}
        </section>
      </div>
    </div>
  );
}
