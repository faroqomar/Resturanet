import type { DateRange } from "@shared/contracts";
import { monthRange, todayBaghdad, weekRange } from "@shared/finance";

export const api = window.restaurantApi;
export const today = todayBaghdad;

export function rangeFor(kind: "today" | "week" | "month"): DateRange {
  const date = today();
  if (kind === "today") return { from: date, to: date };
  if (kind === "week") return weekRange(date);
  return monthRange(date);
}

export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^Error invoking remote method '[^']+': Error: /, "")
    .replace(/^Error: /, "");
}

export function formatDate(value: string): string {
  if (value === "0000-00-00") return "قبل بداية السجل";
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeZone: "Asia/Baghdad",
  }).format(new Date(`${value}T12:00:00+03:00`));
}

export function numberValue(value: string): number {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}
