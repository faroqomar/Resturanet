import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  Paperclip,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import type {
  DateRange,
  EntityType,
  PendingAttachment,
} from "@shared/contracts";
import { api, errorMessage, rangeFor } from "../lib";

export function PageHeader({
  title,
  eyebrow,
  actions,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      <div className="page-actions">{actions}</div>
    </header>
  );
}

export function Money({
  value,
  tone,
}: {
  value: number;
  tone?: "good" | "bad" | "muted";
}) {
  return (
    <span className={`money ${tone ?? ""}`}>
      <bdi dir="ltr">
        {new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(
          value,
        )}
      </bdi>{" "}
      <span dir="rtl">د.ع</span>
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">ر</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Notice({
  children,
  kind = "warning",
}: {
  children: ReactNode;
  kind?: "warning" | "success" | "danger";
}) {
  const Icon = kind === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`notice ${kind}`} role="status">
      <Icon size={21} />
      <span>{children}</span>
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b aria-label="مطلوب"> *</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} />;
}

export function DateRangeBar({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [mode, setMode] = useState<"today" | "week" | "month" | "custom">(
    "month",
  );
  const choose = (next: typeof mode) => {
    setMode(next);
    if (next !== "custom") onChange(rangeFor(next));
  };
  return (
    <div className="range-bar" aria-label="اختيار الفترة">
      <div className="segmented">
        {(["today", "week", "month", "custom"] as const).map((item) => (
          <button
            key={item}
            className={mode === item ? "active" : ""}
            onClick={() => choose(item)}
          >
            {
              {
                today: "اليوم",
                week: "هذا الأسبوع",
                month: "هذا الشهر",
                custom: "فترة مخصصة",
              }[item]
            }
          </button>
        ))}
      </div>
      {mode === "custom" && (
        <div className="custom-range">
          <Input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
          <span>إلى</span>
          <Input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export function AttachmentPicker({
  value,
  onChange,
}: {
  value: PendingAttachment[];
  onChange: (files: PendingAttachment[]) => void;
}) {
  const pick = async () => {
    try {
      onChange([...value, ...(await api.attachments.pick())]);
    } catch (error) {
      window.alert(errorMessage(error));
    }
  };
  const remove = async (file: PendingAttachment) => {
    await api.attachments.discard(file.token);
    onChange(value.filter((item) => item.token !== file.token));
  };
  return (
    <section className="attachments">
      <div className="section-title">
        <div>
          <Paperclip size={20} />
          <h3>المرفقات</h3>
        </div>
        <button className="button secondary small" type="button" onClick={pick}>
          <FilePlus2 size={17} /> إضافة صورة أو PDF
        </button>
      </div>
      {value.length > 0 && (
        <div className="attachment-grid">
          {value.map((file) => (
            <div className="attachment" key={file.token}>
              {file.previewUrl ? (
                <img src={file.previewUrl} alt="معاينة المرفق" />
              ) : (
                <div className="pdf-badge">PDF</div>
              )}
              <span title={file.originalName}>{file.originalName}</span>
              <button
                type="button"
                aria-label="إزالة المرفق"
                onClick={() => remove(file)}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function FormActions({
  saving,
  onCancel,
  label = "حفظ السجل",
}: {
  saving: boolean;
  onCancel: () => void;
  label?: string;
}) {
  return (
    <div className="form-actions">
      <button className="button primary" disabled={saving} type="submit">
        {saving ? "جارٍ الحفظ…" : label}
      </button>
      <button className="button ghost" type="button" onClick={onCancel}>
        إلغاء
      </button>
    </div>
  );
}

export function TableActions({
  onEdit,
  onTrash,
}: {
  onEdit: () => void;
  onTrash: () => Promise<void> | void;
}) {
  return (
    <div className="table-actions">
      <button onClick={onEdit}>تعديل</button>
      <button
        className="danger-link"
        onClick={() => {
          if (window.confirm("هل تريد نقل هذا السجل إلى سلة المحذوفات؟"))
            void onTrash();
        }}
      >
        <Trash2 size={15} /> حذف
      </button>
    </div>
  );
}

export function PrintButton() {
  return (
    <button className="button secondary" onClick={() => api.print.current()}>
      <Printer size={17} /> طباعة
    </button>
  );
}

export function Loading() {
  return (
    <div className="loading">
      <span />
      <p>جارٍ تحميل البيانات…</p>
    </div>
  );
}

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    loader()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [...deps, tick]);
  return { data, error, reload: () => setTick((value) => value + 1), setData };
}

export async function saveWithConfirm<
  T extends { allowDuplicate?: boolean; confirmOverpayment?: boolean },
>(input: T, saver: (value: T) => Promise<unknown>): Promise<void> {
  try {
    await saver(input);
  } catch (error) {
    const message = errorMessage(error);
    if (
      message.includes("DUPLICATE_CONFIRM_REQUIRED") &&
      window.confirm(message.replace("DUPLICATE_CONFIRM_REQUIRED:", ""))
    )
      return void (await saver({ ...input, allowDuplicate: true }));
    if (
      message.includes("OVERPAYMENT_CONFIRM_REQUIRED") &&
      window.confirm(message.replace("OVERPAYMENT_CONFIRM_REQUIRED:", ""))
    )
      return void (await saver({ ...input, confirmOverpayment: true }));
    throw error;
  }
}

export function ExistingAttachments({
  type,
  id,
}: {
  type: EntityType;
  id?: string;
}) {
  const { data, reload } = useLoad(
    () => (id ? api.attachments.list(type, id) : Promise.resolve([])),
    [id],
  );
  if (!data?.length) return null;
  return (
    <div className="existing-attachments">
      {data.map((file) => (
        <button
          key={file.id}
          type="button"
          onClick={async () => {
            await api.attachments.open(file.id);
            reload();
          }}
        >
          {file.previewUrl ? (
            <img src={file.previewUrl} alt="" />
          ) : (
            <span>PDF</span>
          )}
          <b>{file.originalName}</b>
        </button>
      ))}
    </div>
  );
}
