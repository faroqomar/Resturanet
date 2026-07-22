import { useState } from "react";
import { CalendarRange, ChevronLeft } from "lucide-react";
import type { DateRange, WorkDayDetail } from "@shared/contracts";
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

export function WorkDaysPage() {
  const [range, setRange] = useState<DateRange>(rangeFor("month"));
  const [selected, setSelected] = useState<string | null>(null);
  const { data, error } = useLoad(
    () => api.workDays.list(range),
    [range.from, range.to],
  );
  const detail = useLoad<WorkDayDetail>(
    () => (selected ? api.workDays.get(selected) : Promise.reject("")),
    [selected],
  );
  return (
    <div>
      <PageHeader eyebrow="كل العمليات مجمعة حسب التاريخ" title="أيام العمل" />
      <DateRangeBar value={range} onChange={setRange} />
      {error && <Notice kind="danger">{error}</Notice>}
      {selected && detail.data ? (
        <section className="day-detail">
          <button className="back-link" onClick={() => setSelected(null)}>
            العودة إلى الأيام
          </button>
          <div className="day-hero">
            <div>
              <CalendarRange />
              <span>
                <small>يوم العمل</small>
                <h2>{formatDate(detail.data.date)}</h2>
              </span>
            </div>
            <b>{detail.data.count} عملية</b>
          </div>
          <div className="day-summary">
            <span>
              المبيعات <Money value={detail.data.sales} />
            </span>
            <span>
              المصروفات{" "}
              <Money
                value={
                  detail.data.restaurantExpenses +
                  detail.data.supplierPurchases +
                  detail.data.operatingExpenses
                }
              />
            </span>
            <span>
              الأموال الخارجة <Money value={detail.data.cashOut} />
            </span>
            <span>
              النتيجة{" "}
              {detail.data.approximateResult === null ? (
                <b>غير متوفرة</b>
              ) : (
                <Money value={detail.data.approximateResult} />
              )}
            </span>
          </div>
          <DayGroups detail={detail.data} />
        </section>
      ) : !data ? (
        <Loading />
      ) : data.length === 0 ? (
        <EmptyState
          title="لا توجد أيام عمل في هذه الفترة"
          description="يُنشأ يوم العمل تلقائيًا عند تسجيل أول عملية في تاريخه."
        />
      ) : (
        <div className="day-list">
          {data.map((day) => (
            <button
              className="day-row"
              key={day.id}
              onClick={() => setSelected(day.date)}
            >
              <div className="day-date">
                <b>{formatDate(day.date)}</b>
                <span>{day.count} عملية</span>
              </div>
              <div>
                <small>المبيعات</small>
                <Money value={day.sales} />
              </div>
              <div>
                <small>المصاريف المسجلة</small>
                <Money
                  value={
                    day.restaurantExpenses +
                    day.supplierPurchases +
                    day.operatingExpenses
                  }
                />
              </div>
              <div>
                <small>الأموال الخارجة</small>
                <Money value={day.cashOut} />
              </div>
              <div>
                <small>النتيجة</small>
                {day.approximateResult === null ? (
                  <b className="unavailable">غير متوفرة</b>
                ) : (
                  <Money
                    value={day.approximateResult}
                    tone={day.approximateResult >= 0 ? "good" : "bad"}
                  />
                )}
              </div>
              <ChevronLeft />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DayGroups({ detail }: { detail: WorkDayDetail }) {
  const groups = [
    [
      "فواتير مصاريف المطعم",
      detail.restaurantExpenseInvoices.map((x) => [
        x.id,
        x.invoiceNumber,
        x.name,
        x.effectiveTotal,
      ]),
    ],
    [
      "فواتير الموردين والمخضر",
      detail.supplierInvoices.map((x) => [
        x.id,
        x.invoiceNumber,
        x.supplierName,
        x.total,
      ]),
    ],
    [
      "دفعات الموردين",
      detail.supplierPaymentsList.map((x) => [
        x.id,
        x.paymentNumber,
        x.supplierName,
        x.amount,
      ]),
    ],
    [
      "المبيعات اليومية",
      detail.salesRecords.map((x) => [
        x.id,
        x.recordNumber,
        x.completeness === "complete" ? "بيانات مكتملة" : "بيانات تقريبية",
        x.effectiveTotal,
      ]),
    ],
    [
      "الإيجار والرواتب والمصاريف",
      detail.operatingExpensesList.map((x) => [
        x.id,
        x.recordNumber,
        x.expenseTypeName,
        x.totalDue,
      ]),
    ],
  ] as Array<[string, Array<[string, string, string, number]>]>;
  return (
    <div className="day-groups">
      {groups.map(([title, items]) => (
        <section className="panel" key={title}>
          <div className="section-title">
            <div>
              <h3>{title}</h3>
            </div>
            <span className="count-pill">{items.length}</span>
          </div>
          {items.length ? (
            items.map(([id, ref, party, amount]) => (
              <div className="mini-row" key={id}>
                <span>
                  <b>{ref}</b>
                  <small>{party}</small>
                </span>
                <Money value={amount} />
              </div>
            ))
          ) : (
            <p className="muted">لا توجد سجلات من هذا النوع.</p>
          )}
        </section>
      ))}
    </div>
  );
}
