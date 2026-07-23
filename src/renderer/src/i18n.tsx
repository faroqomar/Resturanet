import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { AppLocale, CatalogItem } from "@shared/contracts";
import { defaultCatalogName } from "@shared/catalogs";

const english = {
  "نظام المطعم": "Restaurant System",
  "دفتر يومي محلي": "Local daily ledger",
  الرئيسية: "Dashboard",
  "أيام العمل": "Work days",
  "فواتير مصاريف المطعم": "Restaurant expense invoices",
  الموردون: "Suppliers",
  "فواتير الموردين": "Supplier invoices",
  "فواتير المخضر": "Produce invoices",
  "دفعات الموردين": "Supplier payments",
  "المبيعات اليومية": "Daily sales",
  "الإيجار والرواتب والمصاريف": "Rent, salaries and expenses",
  التقارير: "Reports",
  "الإعدادات والنسخ الاحتياطي": "Settings and backup",
  "الإدخال القديم": "Historical entry",
  "يعمل محليًا دون إنترنت": "Works locally without internet",
  "إنشاء فاتورة جديدة": "Create a new record",
  "فاتورة مصاريف المطعم": "Restaurant expense invoice",
  "فاتورة مورد": "Supplier invoice",
  "فاتورة مخضر": "Produce invoice",
  "دفعة لمورد": "Supplier payment",
  "مبيعات يومية": "Daily sales",
  "إيجار أو راتب أو مصروف": "Rent, salary or expense",
  "تسوية مورد": "Supplier adjustment",
  "مرحبًا بك": "Welcome",
  "لنجهّز دفتر المطعم": "Let's set up your restaurant ledger",
  "اكتب اسم المطعم. يمكنك تغييره لاحقًا من الإعدادات.":
    "Enter the restaurant name. You can change it later in Settings.",
  "اسم المطعم": "Restaurant name",
  "اسم المطعم *": "Restaurant name *",
  "مثال: مطعم النخيل": "Example: Palm Restaurant",
  "ابدأ استخدام النظام": "Start using Resturanet",
  "تُحفظ البيانات على هذه الحاسبة فقط.":
    "Your data is stored only on this computer.",
  "كل رقم في مكانه.": "Every number in its place.",
  "كل يوم أوضح من قبله.": "Every day becomes clearer.",
  "جارٍ تحميل البيانات…": "Loading data…",
  "جارٍ الحفظ…": "Saving…",
  "حفظ السجل": "Save record",
  إلغاء: "Cancel",
  تعديل: "Edit",
  حذف: "Delete",
  طباعة: "Print",
  مطلوب: "Required",
  اليوم: "Today",
  "هذا الأسبوع": "This week",
  "هذا الشهر": "This month",
  "فترة مخصصة": "Custom range",
  "اختيار الفترة": "Choose date range",
  إلى: "to",
  المرفقات: "Attachments",
  "إضافة صورة أو PDF": "Add image or PDF",
  "معاينة المرفق": "Attachment preview",
  "إزالة المرفق": "Remove attachment",
  "هل تريد نقل هذا السجل إلى سلة المحذوفات؟": "Move this record to the trash?",
  "إدارة التطبيق والبيانات المحلية": "Manage the application and local data",
  "بيانات المطعم": "Restaurant details",
  العملة: "Currency",
  "الدينار العراقي (IQD)": "Iraqi dinar (IQD)",
  "حفظ التغييرات": "Save changes",
  "حماية البيانات": "Data protection",
  "تتضمن النسخة قاعدة SQLite وكل صور الفواتير وملفات PDF.":
    "The backup includes SQLite, invoice images and PDF files.",
  "إنشاء نسخة احتياطية": "Create backup",
  "استرجاع نسخة": "Restore backup",
  "قبل الاسترجاع ينشئ التطبيق نسخة أمان تلقائية.":
    "Resturanet creates a safety backup before restoring.",
  "الأنواع والأقسام": "Types and categories",
  "أنواع الموردين": "Supplier types",
  "أنواع المصاريف": "Expense types",
  "أقسام المبيعات": "Sales categories",
  "أقسام فاتورة مصاريف المطعم": "Restaurant expense categories",
  "اسم جديد": "New name",
  نشط: "Active",
  "غير نشط": "Inactive",
  "سلة المحذوفات": "Trash",
  تحديث: "Refresh",
  "سلة المحذوفات فارغة.": "The trash is empty.",
  استرجاع: "Restore",
  "حذف نهائي": "Delete permanently",
  "هذا حذف نهائي ولا يمكن التراجع عنه. هل أنت متأكد؟":
    "This deletion is permanent and cannot be undone. Continue?",
  "سيتم استبدال البيانات الحالية بالنسخة المختارة، مع إنشاء نسخة أمان تلقائية. هل تريد المتابعة؟":
    "The selected backup will replace current data after a safety backup is created. Continue?",
  "صورة الوضع المالي": "Financial overview",
  "إجمالي المبيعات المسجلة": "Recorded sales",
  "مصاريف المطعم": "Restaurant expenses",
  "مشتريات الموردين": "Supplier purchases",
  "الأموال الخارجة فعليًا": "Actual cash out",
  "النتيجة التقريبية": "Estimated result",
  "عدد الفواتير والعمليات": "Invoices and records",
  "ديون الموردين المتبقية": "Outstanding supplier debt",
  "آخر العمليات": "Recent activity",
  "المبيعات مقابل المصاريف": "Sales versus expenses",
  "توزيع المصاريف": "Expense distribution",
  "بيانات المبيعات غير مكتملة": "Sales data is incomplete",
  "لا يعرض نتيجة عند غياب المبيعات":
    "No result is shown when sales data is missing",
  "ابدأ بإضافة مبيعات أو فاتورة وستظهر المقارنة هنا.":
    "Add sales or an invoice to see the comparison.",
  "أضف الفواتير أو غيّر الفترة لرؤية توزيع الأقسام.":
    "Add invoices or change the range to see category distribution.",
  "ستظهر أرصدة الموردين هنا بعد إضافة فواتيرهم.":
    "Supplier balances will appear after invoices are added.",
  "كل العمليات مجمعة حسب التاريخ": "All records grouped by date",
  "لا توجد أيام عمل في هذه الفترة": "No work days in this period",
  "يُنشأ يوم العمل تلقائيًا عند تسجيل أول عملية في تاريخه.":
    "A work day is created automatically with its first record.",
  المبيعات: "Sales",
  المصاريف: "Expenses",
  "المال الخارج": "Cash out",
  "حالة بيانات المبيعات": "Sales data status",
  "بيانات مكتملة": "Complete data",
  "بيانات تقريبية": "Estimated data",
  "بيانات غير متوفرة": "Unavailable data",
  مكتملة: "Complete",
  تقريبية: "Estimated",
  "غير متوفرة": "Unavailable",
  "لا توجد حركة في هذه الفترة": "No activity in this period",
  "المشتريات والمصاريف النقدية المباشرة": "Direct purchases and cash expenses",
  "رقم الفاتورة": "Invoice number",
  "اتركه فارغًا لتوليده تلقائيًا": "Leave blank to generate automatically",
  التاريخ: "Date",
  "اسم المحل أو الشخص": "Store or person",
  "أقسام الفاتورة": "Invoice categories",
  "إضافة قسم": "Add category",
  القسم: "Category",
  المبلغ: "Amount",
  ملاحظة: "Note",
  "إدخال إجمالي يدوي لفاتورة قديمة":
    "Enter a manual total for a historical invoice",
  "الإجمالي اليدوي": "Manual total",
  "اتركه فارغًا لاستخدام مجموع الأقسام":
    "Leave blank to use the category total",
  "ملاحظات عامة": "General notes",
  "إجمالي الفاتورة": "Invoice total",
  "معدّل يدويًا": "Manually adjusted",
  "مجموع الأقسام": "Category total",
  "حفظ الفاتورة": "Save invoice",
  "لا توجد فواتير مصاريف": "No expense invoices",
  "سجّل الفواتير النقدية اليومية مع توزيع مبالغها على الأقسام.":
    "Record daily cash invoices and distribute their amounts by category.",
  الرقم: "Number",
  الاسم: "Name",
  الإجمالي: "Total",
  الحالة: "Status",
  محسوب: "Calculated",
  "حساب مستقل لكل مورد": "A separate account for each supplier",
  "إضافة مورد": "Add supplier",
  "اسم المورد": "Supplier name",
  "نوع المورد": "Supplier type",
  "رقم الهاتف": "Phone number",
  العنوان: "Address",
  "تاريخ الرصيد الافتتاحي": "Opening balance date",
  ملاحظات: "Notes",
  "حفظ المورد": "Save supplier",
  "لا يوجد موردون": "No suppliers",
  "أضف أول مورد لتسجيل فواتيره ودفعاته.":
    "Add your first supplier to record invoices and payments.",
  المشتريات: "Purchases",
  الدفعات: "Payments",
  الرصيد: "Balance",
  "كشف الحساب": "Statement",
  "الدين القديم على المطعم": "Previous debt owed by the restaurant",
  "المشتريات التي تزيد رصيد المورد": "Purchases that increase supplier debt",
  "الكمية بالكيلو والسعر والمجموع": "Quantity by kilogram, price and total",
  "أضف موردًا أولًا قبل إنشاء فاتورة.":
    "Add a supplier before creating an invoice.",
  المورد: "Supplier",
  "أصناف الفاتورة": "Invoice items",
  "إضافة صنف": "Add item",
  الصنف: "Item",
  "الصنف أو الخضار": "Item or produce",
  الكمية: "Quantity",
  الوحدة: "Unit",
  "سعر الوحدة": "Unit price",
  "سعر الكيلو": "Price per kilogram",
  "السعر الكلي": "Line total",
  "الرصيد السابق": "Previous balance",
  "اتركه فارغًا ليظهر من حساب المورد":
    "Leave blank to use the supplier account",
  "المبلغ المدفوع الآن": "Amount paid now",
  "مجموع القائمة": "Items total",
  "المدفوع الآن": "Paid now",
  "زيادة الدين من الفاتورة": "Debt increase from invoice",
  "حفظ وتحديث حساب المورد": "Save and update supplier account",
  "أنشئ فاتورة لعرض المشتريات والرصيد المتبقي هنا.":
    "Create an invoice to show purchases and the remaining balance.",
  "المتبقي بعد الفاتورة": "Balance after invoice",
  "دفعة مستقلة من دون فاتورة شراء":
    "A standalone payment without a purchase invoice",
  "تسجيل دفعة": "Record payment",
  "رقم الدفعة": "Payment number",
  "يولد تلقائيًا إذا تُرك فارغًا": "Generated automatically when left blank",
  "مبلغ الدفعة": "Payment amount",
  "طريقة الدفع": "Payment method",
  نقدي: "Cash",
  تحويل: "Transfer",
  أخرى: "Other",
  "تسجيل الدفعة": "Save payment",
  "لا توجد دفعات مستقلة": "No standalone payments",
  "الدفعات المسجلة داخل فاتورة المورد تظهر هنا أيضًا.":
    "Payments recorded inside supplier invoices also appear here.",
  "إجمالي بسيط مع تفاصيل اختيارية": "One total with optional details",
  "أدخل إجماليًا واحدًا لليوم، ويمكنك إضافة التفاصيل عند توفرها.":
    "Enter one daily total and add details when available.",
  "رقم السجل": "Record number",
  "اكتمال البيانات": "Data completeness",
  "تفاصيل المبيعات": "Sales details",
  "إضافة قسم مبيعات": "Add sales category",
  "حفظ المبيعات": "Save sales",
  "لا توجد مبيعات مسجلة": "No recorded sales",
  "إجمالي المبيعات": "Sales total",
  "التزامات مستقلة ودفعات جزئية":
    "Independent liabilities and partial payments",
  "إضافة مصروف": "Add expense",
  "نوع المصروف": "Expense type",
  "المستلم أو الجهة": "Recipient or party",
  "إجمالي المبلغ المستحق": "Total amount due",
  "الدفعات الجزئية": "Partial payments",
  "إضافة دفعة": "Add payment",
  "حفظ المصروف": "Save expense",
  "لا توجد مصاريف تشغيلية": "No operating expenses",
  "سجّل الإيجار أو الراتب أو المصروف، ثم أضف دفعاته الكاملة أو الجزئية.":
    "Record rent, salary or another expense, then add full or partial payments.",
  مدفوع: "Paid",
  "مدفوع جزئيًا": "Partially paid",
  "غير مدفوع": "Unpaid",
  المتبقي: "Remaining",
  "التقرير المالي": "Financial report",
  "يومي وأسبوعي وشهري وفترة مخصصة": "Daily, weekly, monthly and custom ranges",
  "تصدير CSV": "Export CSV",
  "بحث وفلاتر": "Search and filters",
  "ابحث بالرقم أو الاسم أو القسم": "Search by number, name or category",
  "كل الأنواع": "All types",
  النوع: "Type",
  الجهة: "Party",
  المدفوع: "Paid",
  "لا توجد نتائج": "No results",
  "غيّر الفترة أو الفلاتر، أو أضف سجلات جديدة أولًا.":
    "Change the range or filters, or add records first.",
  "المصاريف حسب القسم": "Expenses by category",
  "ديون الموردين": "Supplier debts",
  "سجل الفواتير": "Invoice register",
  "التحقق من إدخال البيانات": "Validate entries",
  "إدخال تفصيلي": "Detailed entry",
  "إدخال جماعي": "Batch entry",
  "نوع السجل": "Record type",
  "رصيد افتتاحي لمورد": "Supplier opening balance",
  "زيادة دين المورد": "Increase supplier debt",
  "تخفيض دين المورد": "Decrease supplier debt",
  "سبب التسوية": "Adjustment reason",
  "حفظ التسوية": "Save adjustment",
  "إضافة صف": "Add row",
  "حفظ الدفعة": "Save batch",
  "مسح الصفوف": "Clear rows",
  "عدد السجلات": "Record count",
  "الإدخال التاريخي يؤثر مباشرة في التقارير والأرصدة.":
    "Historical entries immediately affect reports and balances.",
  "اختر نوعًا واحدًا وأدخل عدة سجلات. تُحفظ الدفعة كاملة أو لا يُحفظ منها شيء.":
    "Choose one type and enter multiple records. The whole batch is saved atomically.",
  "المرفقات متاحة في الإدخال التفصيلي فقط":
    "Attachments are available in detailed entry only",
  "سبب التسوية مطلوب": "Adjustment reason is required",
  "اسم المورد مطلوب": "Supplier name is required",
  "اسم المطعم مطلوب": "Restaurant name is required",
  "الاسم مطلوب": "Name is required",
  "اسم الصنف مطلوب": "Item name is required",
  "أدخل مبلغًا أكبر من صفر": "Enter an amount greater than zero",
  "المبلغ لا يمكن أن يكون سالبًا": "Amount cannot be negative",
  "التاريخ غير صحيح": "Invalid date",
  "تاريخ البداية يجب أن يسبق تاريخ النهاية":
    "The start date must be before the end date",
  "أدخل إجمالي المبيعات": "Enter the sales total",
  "مجموع الدفعات لا يمكن أن يتجاوز المبلغ المستحق":
    "Payments cannot exceed the amount due",
  "أضف سجلًا واحدًا على الأقل": "Add at least one record",
  "أضف صنفًا واحدًا على الأقل": "Add at least one item",
  "أضف قسمًا واحدًا على الأقل": "Add at least one category",
  "يجب أن تكون جميع صفوف الدفعة من النوع نفسه":
    "All batch rows must have the same type",
  "الحد الأقصى 250 سجلًا في الدفعة": "A batch can contain at most 250 records",
  "حدث خطأ غير متوقع": "An unexpected error occurred",
  "مصدر الطلب غير موثوق": "Untrusted request source",
  "المورد غير موجود": "Supplier not found",
  "الفاتورة غير موجودة": "Invoice not found",
  "فاتورة المورد غير موجودة": "Supplier invoice not found",
  "الدفعة غير موجودة": "Payment not found",
  "التسوية غير موجودة": "Adjustment not found",
  "سجل المبيعات غير موجود": "Sales record not found",
  "المصروف غير موجود": "Expense not found",
  "يوم العمل غير موجود": "Work day not found",
  "السجل غير موجود": "Record not found",
  "المرفق غير موجود": "Attachment not found",
  "نوع الملف غير مدعوم": "Unsupported file type",
  "حجم الملف أكبر من 25 ميغابايت": "The file is larger than 25 MB",
  "انتهت صلاحية أحد المرفقات، اختره مرة أخرى":
    "An attachment has expired. Choose it again.",
  "نوع المستند غير صالح": "Invalid document type",
  "هذا النوع موجود مسبقًا": "This type already exists",
  "النوع غير موجود": "Type not found",
  "تعذر حفظ المورد": "Could not save supplier",
  "تعذر حفظ الرصيد الافتتاحي": "Could not save opening balance",
  "تم تحديث اسم المطعم": "Restaurant name updated",
  "تمت إضافة النوع": "Type added",
  "تم حفظ فاتورة مصاريف المطعم": "Restaurant expense invoice saved",
  "تم حفظ فاتورة المورد وتحديث حسابه":
    "Supplier invoice saved and account updated",
  "تم تسجيل الدفعة وتحديث حساب المورد":
    "Payment saved and supplier account updated",
  "تم حفظ المبيعات اليومية": "Daily sales saved",
  "تم حفظ المصروف ودفعاته": "Expense and payments saved",
  "تم تسجيل التسوية": "Adjustment saved",
  "تم حفظ الرصيد الافتتاحي": "Opening balance saved",
  "تم استرجاع النسخة الاحتياطية بنجاح": "Backup restored successfully",
  "الرصيد مطابق ولا يحتاج إلى تسوية":
    "The balance already matches; no adjustment is needed",
  "DUPLICATE_CONFIRM_REQUIRED: يوجد مستند آخر بالرقم نفسه. راجع السجل ثم أكد الحفظ إذا كان التكرار صحيحًا.":
    "DUPLICATE_CONFIRM_REQUIRED: Another document has the same number. Review it and confirm if the duplicate is intentional.",
  "OVERPAYMENT_CONFIRM_REQUIRED: الدفعة أكبر من دين المورد. أكد الحفظ لإنشاء رصيد لصالح المطعم.":
    "OVERPAYMENT_CONFIRM_REQUIRED: The payment is greater than the supplier debt. Confirm to create a credit for the restaurant.",
  "OPENING_BALANCE_CONFIRM_REQUIRED: لدى المورد رصيد أو حركات سابقة. سيُحفظ الفرق كتسوية مؤرخة بدل تغيير السجل بصمت.":
    "OPENING_BALANCE_CONFIRM_REQUIRED: This supplier already has a balance or activity. The difference will be saved as a dated adjustment.",
  "الرصيد الافتتاحي": "Opening balance",
  "فاتورة مصروف": "Expense invoice",
  "مشتريات مورد": "Supplier purchases",
  "دفعة مورد": "Supplier payment",
  مبيعات: "Sales",
  المطعم: "Restaurant",
  "مصروف تشغيلي": "Operating expense",
  "تصحيح رصيد افتتاحي": "Opening balance correction",
  "صالة المطعم": "Dine-in",
  سفري: "Takeaway",
  توصيل: "Delivery",
  الإيجار: "Rent",
  الرواتب: "Salaries",
  "يوميات العمال": "Daily labor",
  كهرباء: "Electricity",
  ماء: "Water",
  إنترنت: "Internet",
  صيانة: "Maintenance",
  "مواد تنظيف": "Cleaning supplies",
  نقل: "Transport",
  غاز: "Gas",
  "فلين أو تغليف": "Packaging",
  "مصروف متنوع": "Miscellaneous expense",
  "نوع مخصص": "Custom type",
  صمون: "Samoon bread",
  مخضر: "Produce",
  لحم: "Meat",
  خبز: "Bread",
  "لحوم + ألبان": "Meat and dairy",
  غذائية: "Groceries",
  "مشروبات غازية": "Soft drinks",
  "أسواق إبراهيم": "Ibrahim Market",
  "الدجاج المصروف": "Chicken used",
  "الدجاج المتبقي": "Chicken remaining",
  الفلافل: "Falafel",
  مشتريات: "Purchases",
  "— الإجمالي اليدوي مختلف عن التفاصيل.":
    "— The manual total differs from the details.",
  "اتجاه التسوية": "Adjustment direction",
  "استخدم زر إنشاء فاتورة جديدة لبدء التسجيل.":
    "Use Create a new record to get started.",
  "الإيجار والرواتب والمصاريف الأخرى": "Rent, salaries and other expenses",
  التفاصيل: "Details",
  "الدفتر فارغ": "The ledger is empty",
  الطريقة: "Method",
  الوصف: "Description",
  "ترحيل السجلات السابقة إلى نفس الدفتر المالي":
    "Bring previous records into the same financial ledger",
  "تسويات الموردين": "Supplier adjustments",
  "تعديل المورد": "Edit supplier",
  تم: "Done",
  "تم الاسترجاع": "Restore completed",
  "تم حفظ السجل القديم ويمكنك إدخال السجل التالي":
    "Historical record saved. You can enter the next record.",
  "د.ع": "IQD",
  "دفعة مستقلة": "Standalone payment",
  "راجع الصفوف التي تحتوي أخطاء قبل الحفظ":
    "Review rows with errors before saving",
  "ستظهر هنا الديون أو الأرصدة الدائنة عند تسجيل الحركات.":
    "Debts and supplier credits will appear here after activity is recorded.",
  "سيظهر توزيع الأقسام عند إضافة الفواتير.":
    "Category distribution will appear after invoices are added.",
  "فواتير الموردين والمخضر": "Supplier and produce invoices",
  "قبل بداية السجل": "Before the ledger started",
  كيلو: "Kilogram",
  "لا توجد أرصدة موردين": "No supplier balances",
  "لا توجد ديون مسجلة": "No recorded debts",
  "لا توجد مصروفات": "No expenses",
  "لا توجد مصروفات في الفترة": "No expenses in this period",
  "لغة التطبيق": "Application language",
  "مورد جديد": "New supplier",
  "يمكن إدخاله مباشرةً": "Can be entered directly",
  "يولد تلقائيًا": "Generated automatically",
  "تم حفظ": "Saved",
  "سجلًا قديمًا بنجاح": "historical records successfully",
  "تم حفظ النسخة الاحتياطية في": "Backup saved to",
  "لا توجد": "No",
  "اسم الملف غير صالح": "Invalid file name",
  "الكمية يجب أن تكون أكبر من صفر": "Quantity must be greater than zero",
  "النسخة تحتوي مسارات أو ملفات غير متوقعة":
    "The backup contains unexpected paths or files",
  "تُعدّل هذه الدفعة من داخل فاتورة المورد المرتبطة بها":
    "Edit this payment from its linked supplier invoice",
  "تم تحديث التسوية": "Adjustment updated",
  "تم تحديث الدفعة": "Payment updated",
  "تم تحديث المبيعات": "Sales updated",
  "تم تحديث المصروف": "Expense updated",
  "تم تحديث المورد": "Supplier updated",
  "تم تحديث فاتورة المصروف": "Expense invoice updated",
  "تم تحديث فاتورة المورد": "Supplier invoice updated",
  "تم تسجيل الدفعة": "Payment recorded",
  "تم تسجيل المبيعات": "Sales recorded",
  "تم تسجيل المصروف": "Expense recorded",
  "تم حفظ فاتورة المصروف": "Expense invoice saved",
  "تم حفظ فاتورة المورد": "Supplier invoice saved",
  "تمت إضافة المورد": "Supplier added",
  "دفعة مع الفاتورة": "Payment recorded with invoice",
  "لا يمكن الحذف النهائي قبل نقل السجل إلى السلة":
    "Move the record to the trash before deleting it permanently",
  "مسار المرفق غير صالح": "Invalid attachment path",
  "مسار الملف خارج مجلد التطبيق":
    "The file path is outside the application data directory",
  "ملف النسخة الاحتياطية ناقص": "The backup package is incomplete",
  "نسخة احتياطية غير متوافقة": "Incompatible backup",
  "بيانات المبيعات غير مكتملة، لا يمكن حساب الربح أو الخسارة بدقة.":
    "Sales data is incomplete, so profit or loss cannot be calculated accurately.",
  للفترة: "for the period",
  "ناقص المصروفات المسجلة، ولا تمثل ربحًا محاسبيًا نهائيًا":
    "minus recorded expenses; this is not final accounting profit",
  "المبيعات مقابل المصروفات": "Sales versus expenses",
  "الموردون ذوو المبالغ المتبقية": "Suppliers with outstanding balances",
  "آخر الفواتير والعمليات": "Latest invoices and records",
  "توزيع المصروفات": "Expense distribution",
  "استخدم النموذج التفصيلي للمرفقات والبنود، أو الجدول لإدخال مجموعة من النوع نفسه.":
    "Use detailed entry for attachments and line items, or the table for multiple records of the same type.",
  "القسم أو الوصف": "Category or description",
  "النتيجة التقريبية للفترة": "Estimated result for the period",
  "المبيعات ناقص المصروفات المسجلة، ولا تمثل ربحًا محاسبيًا نهائيًا":
    "Sales minus recorded expenses; this is not final accounting profit",
  "تقلل هذه الدفعة رصيد المورد وتظهر ضمن الأموال الخارجة.":
    "This payment reduces the supplier balance and appears in actual cash out.",
  المصدر: "Source",
  "مع فاتورة": "With invoice",
  أ: "K",
  "تسجيل مبيعات يومية": "Record daily sales",
  "مكتملة لهذا اليوم": "Complete for this day",
  "سيظهر الربح أو الخسارة غير متوفرين لهذا اليوم والفترات التي تحتويه.":
    "Profit or loss will be unavailable for this day and any period containing it.",
  "تفاصيل المبيعات الاختيارية": "Optional sales details",
  "مجموع التفاصيل:": "Details total:",
  "إجمالي اليوم": "Daily total",
  "حالة البيانات": "Data status",
  قسم: "Category",
  "العودة إلى الأيام": "Back to work days",
  "يوم العمل": "Work day",
  عملية: "records",
  المصروفات: "Expenses",
  "الأموال الخارجة": "Actual cash out",
  النتيجة: "Result",
  "المصاريف المسجلة": "Recorded expenses",
  "لا توجد سجلات من هذا النوع.": "No records of this type.",
  "أضف موردًا أولًا قبل إدخال هذا النوع.":
    "Add a supplier before entering this record type.",
  "اختر المورد": "Choose a supplier",
  زيادة: "Increase",
  تخفيض: "Decrease",
  "تسجيل مصروف": "Record expense",
  "إضافة دفعة جزئية": "Add partial payment",
  "مجموع الدفعات أكبر من المبلغ المستحق.":
    "Total payments exceed the amount due.",
  "المبلغ المستحق": "Amount due",
  المستحق: "Due",
  "لا توجد فترة سابقة للمقارنة": "No previous period to compare",
  "% عن الفترة السابقة": "% from the previous period",
  "كل أنواع السجلات": "All record types",
  "كل الموردين": "All suppliers",
  "المبيعات المسجلة": "Recorded sales",
  "المصروفات المسجلة": "Recorded expenses",
  "تظهر فقط عند اكتمال بيانات المبيعات":
    "Shown only when sales data is complete",
  "الرصيد الحالي": "Current balance",
  "آخر تعامل": "Last activity",
  "إجمالي المبلغ": "Total amount",
  "عدد الفواتير": "Invoice count",
  "النسبة من المصروفات": "Share of expenses",
  "إجمالي المبالغ": "Total amounts",
  "المدفوع ضمن السجلات": "Paid within records",
  "عدد النتائج": "Result count",
  العربية: "Arabic",
  "الرصيد المتبقي": "Outstanding balance",
  "العودة إلى الموردين": "Back to suppliers",
  "إجمالي المشتريات": "Total purchases",
  "إجمالي الدفعات": "Total payments",
  البيان: "Description",
  عليه: "Debit",
  "له / مدفوع": "Credit / paid",
  ر: "R",
} as const;

export type TranslationKey = keyof typeof english;

const reverse = new Map<string, string>(
  Object.entries(english).map(([arabic, value]) => [value, arabic]),
);

let activeLocale: AppLocale = "ar";

export function setActiveLocale(locale: AppLocale): void {
  activeLocale = locale;
}

export function getActiveLocale(): AppLocale {
  return activeLocale;
}

export function translateRaw(value: string, locale = activeLocale): string {
  if (!value) return value;
  const direct =
    locale === "en" ? english[value as TranslationKey] : reverse.get(value);
  if (direct) return direct;
  if (locale === "en") {
    const digits = value
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/([0-9]+)أ\b/g, "$1K");
    const savedBatch = digits.match(/^تم حفظ ([0-9]+) سجلًا قديمًا بنجاح$/);
    if (savedBatch)
      return `Saved ${savedBatch[1]} historical records successfully`;
    if (digits.startsWith("تم حفظ النسخة الاحتياطية في "))
      return digits.replace("تم حفظ النسخة الاحتياطية في ", "Backup saved to ");
    if (digits.startsWith("لا توجد ")) {
      const remainder = digits.slice("لا توجد ".length);
      return `No ${english[remainder as TranslationKey] ?? remainder}`;
    }
    return digits;
  }
  const restored = value
    .replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)])
    .replace(/([٠-٩]+)K\b/g, "$1أ");
  const savedBatch = value.match(
    /^Saved ([0-9]+) historical records successfully$/,
  );
  if (savedBatch) return `تم حفظ ${savedBatch[1]} سجلًا قديمًا بنجاح`;
  if (value.startsWith("Backup saved to "))
    return value.replace("Backup saved to ", "تم حفظ النسخة الاحتياطية في ");
  return restored;
}

interface I18nValue {
  locale: AppLocale;
  direction: "rtl" | "ltr";
  t: (key: TranslationKey) => string;
  catalogName: (item: CatalogItem) => string;
  setLocale: (locale: AppLocale) => Promise<void>;
}

const defaultI18n: I18nValue = {
  locale: "ar",
  direction: "rtl",
  t: (key) => key,
  catalogName: (item) => item.name,
  setLocale: async () => {},
};

const I18nContext = createContext<I18nValue>(defaultI18n);

const translatedAttributes = [
  "placeholder",
  "title",
  "aria-label",
  "alt",
] as const;

function translateDom(root: Node, locale: AppLocale): void {
  const documentRef = root.ownerDocument ?? document;
  const walker = documentRef.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) nodes.push(root as Text);
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    if (["SCRIPT", "STYLE"].includes(node.parentElement?.tagName ?? ""))
      continue;
    const original = node.data;
    const trimmed = original.trim();
    if (!trimmed) continue;
    const translated = translateRaw(trimmed, locale);
    if (translated !== trimmed)
      node.data = original.replace(trimmed, translated);
  }
  const elements: Element[] = [];
  if (root instanceof Element) elements.push(root);
  if (
    root instanceof Element ||
    root instanceof Document ||
    root instanceof DocumentFragment
  )
    elements.push(...Array.from(root.querySelectorAll("*")));
  for (const element of elements)
    for (const attribute of translatedAttributes) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const translated = translateRaw(value, locale);
      if (translated !== value) element.setAttribute(attribute, translated);
    }
}

export function I18nProvider({
  locale,
  onLocale,
  children,
}: {
  locale: AppLocale;
  onLocale: (locale: AppLocale) => Promise<void>;
  children: ReactNode;
}) {
  setActiveLocale(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.title = locale === "ar" ? "نظام المطعم" : "Restaurant System";
    translateDom(document.body, locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" || mutation.type === "attributes")
          translateDom(mutation.target, getActiveLocale());
        for (const node of mutation.addedNodes)
          translateDom(node, getActiveLocale());
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...translatedAttributes],
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [locale]);
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      direction: locale === "ar" ? "rtl" : "ltr",
      t: (key) => (locale === "ar" ? key : english[key]),
      catalogName: (item) =>
        defaultCatalogName(item.translationKey, locale, item.name),
      setLocale: onLocale,
    }),
    [locale, onLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  return (
    <button
      type="button"
      className={`language-toggle ${compact ? "compact" : ""}`}
      aria-label={
        locale === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic"
      }
      onClick={() => void setLocale(locale === "ar" ? "en" : "ar")}
    >
      <span className={locale === "ar" ? "active" : ""}>AR</span>
      <span className={locale === "en" ? "active" : ""}>EN</span>
    </button>
  );
}
