import { describe, expect, it } from "vitest";
import {
  approximateResult,
  effectiveTotal,
  paymentStatus,
  supplierBalance,
  weekRange,
} from "./finance";

describe("الحسابات المالية", () => {
  it("لا يكرر دفعات المورد داخل المشتريات", () => {
    expect(supplierBalance(100_000, 250_000, 80_000)).toBe(270_000);
  });

  it("يستخدم الإجمالي اليدوي عند وجوده", () => {
    expect(
      effectiveTotal([{ amount: 10_000 }, { amount: 20_000 }], 27_000),
    ).toBe(27_000);
    expect(effectiveTotal([{ amount: 10_000 }, { amount: 20_000 }])).toBe(
      30_000,
    );
  });

  it("يمنع النتيجة عند نقص بيانات المبيعات", () => {
    expect(approximateResult(500_000, 300_000, ["complete"])).toBe(200_000);
    expect(
      approximateResult(500_000, 300_000, ["complete", "missing"]),
    ).toBeNull();
    expect(approximateResult(500_000, 300_000, ["estimated"])).toBe(200_000);
  });

  it("يستنتج حالة دفع الالتزام", () => {
    expect(paymentStatus(100, 0)).toBe("unpaid");
    expect(paymentStatus(100, 40)).toBe("partial");
    expect(paymentStatus(100, 100)).toBe("paid");
  });

  it("يحسب الأسبوع من السبت إلى الجمعة", () => {
    expect(weekRange("2026-07-22")).toEqual({
      from: "2026-07-18",
      to: "2026-07-24",
    });
  });
});
