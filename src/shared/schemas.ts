import { z } from "zod";

export const idSchema = z.string().uuid();
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ غير صحيح");
export const moneySchema = z
  .number()
  .int()
  .min(0, "المبلغ لا يمكن أن يكون سالبًا")
  .max(Number.MAX_SAFE_INTEGER);
export const positiveMoneySchema = moneySchema.min(
  1,
  "أدخل مبلغًا أكبر من صفر",
);
const optionalText = z.string().trim().max(1000).optional().default("");
const attachmentTokens = z.array(z.string().uuid()).max(10).optional();

export const dateRangeSchema = z
  .object({ from: dateSchema, to: dateSchema })
  .refine((v) => v.from <= v.to, {
    message: "تاريخ البداية يجب أن يسبق تاريخ النهاية",
  });

export const supplierSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1, "اسم المورد مطلوب").max(120),
  typeId: idSchema,
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(240).optional().default(""),
  notes: optionalText,
  openingBalance: moneySchema.default(0),
  active: z.boolean().default(true),
});

export const restaurantExpenseSchema = z.object({
  id: idSchema.optional(),
  invoiceNumber: z.string().trim().max(80).optional(),
  date: dateSchema,
  name: z.string().trim().min(1, "الاسم مطلوب").max(160),
  notes: optionalText,
  manualTotal: moneySchema.nullable().optional(),
  lines: z
    .array(
      z.object({
        id: idSchema.optional(),
        categoryId: idSchema,
        amount: positiveMoneySchema,
        notes: optionalText,
      }),
    )
    .min(1, "أضف قسمًا واحدًا على الأقل"),
  attachmentTokens,
  allowDuplicate: z.boolean().optional(),
});

export const supplierInvoiceSchema = z.object({
  id: idSchema.optional(),
  kind: z.enum(["standard", "produce"]),
  invoiceNumber: z.string().trim().max(80).optional(),
  date: dateSchema,
  supplierId: idSchema,
  previousBalanceOverride: moneySchema.nullable().optional(),
  paidNow: moneySchema.optional().default(0),
  notes: optionalText,
  lines: z
    .array(
      z.object({
        id: idSchema.optional(),
        name: z.string().trim().min(1, "اسم الصنف مطلوب").max(160),
        quantity: z
          .number()
          .positive("الكمية يجب أن تكون أكبر من صفر")
          .max(1_000_000),
        unit: z.string().trim().max(40).optional().default(""),
        unitPrice: moneySchema.nullable().optional(),
        total: positiveMoneySchema,
        notes: optionalText,
      }),
    )
    .min(1, "أضف صنفًا واحدًا على الأقل"),
  attachmentTokens,
  allowDuplicate: z.boolean().optional(),
  confirmOverpayment: z.boolean().optional(),
});

export const supplierPaymentSchema = z.object({
  id: idSchema.optional(),
  paymentNumber: z.string().trim().max(80).optional(),
  date: dateSchema,
  supplierId: idSchema,
  amount: positiveMoneySchema,
  method: z.enum(["cash", "transfer", "other"]).optional().default("cash"),
  notes: optionalText,
  attachmentTokens,
  allowDuplicate: z.boolean().optional(),
  confirmOverpayment: z.boolean().optional(),
});

export const saleSchema = z
  .object({
    id: idSchema.optional(),
    recordNumber: z.string().trim().max(80).optional(),
    date: dateSchema,
    completeness: z.enum(["complete", "estimated", "unavailable"]),
    manualTotal: moneySchema.nullable().optional(),
    notes: optionalText,
    lines: z
      .array(
        z.object({
          id: idSchema.optional(),
          categoryId: idSchema.nullable().optional(),
          name: z.string().trim().min(1).max(120),
          amount: moneySchema,
        }),
      )
      .max(100),
    attachmentTokens,
    allowDuplicate: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.completeness === "unavailable" ||
      (v.manualTotal ?? v.lines.reduce((s, x) => s + x.amount, 0)) >= 0,
    {
      message: "أدخل إجمالي المبيعات",
    },
  );

export const operatingExpenseSchema = z
  .object({
    id: idSchema.optional(),
    recordNumber: z.string().trim().max(80).optional(),
    date: dateSchema,
    expenseTypeId: idSchema,
    recipient: z.string().trim().max(160).optional().default(""),
    totalDue: positiveMoneySchema,
    notes: optionalText,
    payments: z
      .array(
        z.object({
          id: idSchema.optional(),
          paymentNumber: z.string().trim().max(80).optional(),
          date: dateSchema,
          amount: positiveMoneySchema,
          method: z
            .enum(["cash", "transfer", "other"])
            .optional()
            .default("cash"),
          notes: optionalText,
        }),
      )
      .max(100),
    attachmentTokens,
    allowDuplicate: z.boolean().optional(),
  })
  .refine((v) => v.payments.reduce((s, p) => s + p.amount, 0) <= v.totalDue, {
    message: "مجموع الدفعات لا يمكن أن يتجاوز المبلغ المستحق",
  });

export const catalogSchema = z.object({
  kind: z.enum([
    "supplier_type",
    "expense_type",
    "sales_category",
    "restaurant_expense_category",
  ]),
  name: z.string().trim().min(1, "الاسم مطلوب").max(100),
});

export const reportFiltersSchema = dateRangeSchema.extend({
  supplierId: idSchema.optional(),
  categoryId: idSchema.optional(),
  entityType: z
    .enum([
      "restaurantExpense",
      "supplierInvoice",
      "supplierPayment",
      "sale",
      "operatingExpense",
    ])
    .optional(),
  search: z.string().trim().max(160).optional(),
});
