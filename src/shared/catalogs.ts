import type { AppLocale, CatalogKind } from "./contracts";

export interface DefaultCatalogDefinition {
  key: string;
  kind: CatalogKind;
  ar: string;
  en: string;
}

export const defaultCatalogs: DefaultCatalogDefinition[] = [
  ["supplier.chicken", "supplier_type", "مورد دجاج", "Chicken supplier"],
  ["supplier.grocery", "supplier_type", "مورد غذائية", "Grocery supplier"],
  ["supplier.produce", "supplier_type", "مورد مخضر", "Produce supplier"],
  [
    "supplier.packaging",
    "supplier_type",
    "مورد فلين أو تغليف",
    "Packaging supplier",
  ],
  ["supplier.gas", "supplier_type", "مورد غاز", "Gas supplier"],
  ["supplier.fuel", "supplier_type", "مورد كاز", "Fuel supplier"],
  ["supplier.meat", "supplier_type", "مورد لحوم", "Meat supplier"],
  ["supplier.dairy", "supplier_type", "مورد ألبان", "Dairy supplier"],
  [
    "supplier.soft_drinks",
    "supplier_type",
    "مورد مشروبات غازية",
    "Soft drinks supplier",
  ],
  ["supplier.other", "supplier_type", "مورد آخر", "Other supplier"],
  ["expense.rent", "expense_type", "الإيجار", "Rent"],
  ["expense.salaries", "expense_type", "الرواتب", "Salaries"],
  ["expense.daily_labor", "expense_type", "يوميات العمال", "Daily labor"],
  ["expense.electricity", "expense_type", "كهرباء", "Electricity"],
  ["expense.water", "expense_type", "ماء", "Water"],
  ["expense.internet", "expense_type", "إنترنت", "Internet"],
  ["expense.maintenance", "expense_type", "صيانة", "Maintenance"],
  ["expense.cleaning", "expense_type", "مواد تنظيف", "Cleaning supplies"],
  ["expense.transport", "expense_type", "نقل", "Transport"],
  ["expense.gas", "expense_type", "غاز", "Gas"],
  ["expense.packaging", "expense_type", "فلين أو تغليف", "Packaging"],
  ["expense.misc", "expense_type", "مصروف متنوع", "Miscellaneous expense"],
  ["expense.custom", "expense_type", "نوع مخصص", "Custom type"],
  ["sales.dine_in", "sales_category", "صالة المطعم", "Dine-in"],
  ["sales.takeaway", "sales_category", "سفري", "Takeaway"],
  ["sales.delivery", "sales_category", "توصيل", "Delivery"],
  ["sales.other", "sales_category", "أخرى", "Other"],
  ["restaurant.samoon", "restaurant_expense_category", "صمون", "Samoon bread"],
  ["restaurant.produce", "restaurant_expense_category", "مخضر", "Produce"],
  ["restaurant.meat", "restaurant_expense_category", "لحم", "Meat"],
  ["restaurant.bread", "restaurant_expense_category", "خبز", "Bread"],
  ["restaurant.gas", "restaurant_expense_category", "غاز", "Gas"],
  [
    "restaurant.meat_dairy",
    "restaurant_expense_category",
    "لحوم + ألبان",
    "Meat and dairy",
  ],
  ["restaurant.grocery", "restaurant_expense_category", "غذائية", "Groceries"],
  [
    "restaurant.soft_drinks",
    "restaurant_expense_category",
    "مشروبات غازية",
    "Soft drinks",
  ],
  [
    "restaurant.ibrahim_market",
    "restaurant_expense_category",
    "أسواق إبراهيم",
    "Ibrahim Market",
  ],
  [
    "restaurant.chicken_used",
    "restaurant_expense_category",
    "الدجاج المصروف",
    "Chicken used",
  ],
  [
    "restaurant.chicken_remaining",
    "restaurant_expense_category",
    "الدجاج المتبقي",
    "Chicken remaining",
  ],
  ["restaurant.falafel", "restaurant_expense_category", "الفلافل", "Falafel"],
  [
    "restaurant.purchases",
    "restaurant_expense_category",
    "مشتريات",
    "Purchases",
  ],
  [
    "restaurant.daily_labor",
    "restaurant_expense_category",
    "يوميات العمال",
    "Daily labor",
  ],
].map(([key, kind, ar, en]) => ({ key, kind: kind as CatalogKind, ar, en }));

const byKey = new Map(defaultCatalogs.map((item) => [item.key, item]));

export function defaultCatalogName(
  key: string | null | undefined,
  locale: AppLocale,
  fallback: string,
): string {
  if (!key) return fallback;
  const item = byKey.get(key);
  return item?.[locale] ?? fallback;
}
