import { describe, expect, it } from "vitest";
import { operatingExpenseSchema, supplierInvoiceSchema } from "./schemas";

describe("التحقق من إدخال البيانات", () => {
  it("يرفض الكمية الصفرية والمبالغ السالبة", () => {
    const result = supplierInvoiceSchema.safeParse({
      kind: "standard",
      date: "2026-07-22",
      supplierId: crypto.randomUUID(),
      paidNow: 0,
      lines: [{ name: "صنف", quantity: 0, total: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("يرفض دفعات المصروف التي تتجاوز المستحق", () => {
    const result = operatingExpenseSchema.safeParse({
      date: "2026-07-22",
      expenseTypeId: crypto.randomUUID(),
      totalDue: 10_000,
      payments: [{ date: "2026-07-22", amount: 12_000 }],
    });
    expect(result.success).toBe(false);
  });
});
