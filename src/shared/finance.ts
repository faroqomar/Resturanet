import type { SalesCompleteness } from "./contracts";

export function sumMoney(values: Array<number | null | undefined>): number {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function effectiveTotal(
  lines: Array<{ amount?: number; total?: number }>,
  manualTotal?: number | null,
): number {
  return (
    manualTotal ??
    lines.reduce((sum, line) => sum + (line.amount ?? line.total ?? 0), 0)
  );
}

export function supplierBalance(
  opening: number,
  purchases: number,
  payments: number,
  adjustments = 0,
): number {
  return opening + purchases - payments + adjustments;
}

export function paymentStatus(
  totalDue: number,
  paid: number,
): "paid" | "partial" | "unpaid" {
  if (paid >= totalDue) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

export function approximateResult(
  sales: number,
  expenses: number,
  states: Array<SalesCompleteness | "missing">,
): number | null {
  if (
    states.length === 0 ||
    states.some((state) => state === "missing" || state === "unavailable")
  )
    return null;
  return sales - expenses;
}

export function formatIqd(amount: number): string {
  return `${new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(amount)} د.ع`;
}

export function todayBaghdad(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function monthRange(date = todayBaghdad()): {
  from: string;
  to: string;
} {
  const [year, month] = date.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${last}`,
  };
}

export function weekRange(date = todayBaghdad()): { from: string; to: string } {
  const noon = new Date(`${date}T12:00:00+03:00`);
  const daysSinceSaturday = (noon.getUTCDay() + 1) % 7;
  const start = new Date(noon);
  start.setUTCDate(noon.getUTCDate() - daysSinceSaturday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (value: Date) => value.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(end) };
}
