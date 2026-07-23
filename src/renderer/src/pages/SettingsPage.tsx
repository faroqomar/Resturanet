import { useState } from "react";
import {
  ArchiveRestore,
  DatabaseBackup,
  HardDriveDownload,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import type { CatalogKind, SettingsSnapshot } from "@shared/contracts";
import {
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  Select,
  useLoad,
} from "../components/Common";
import { api, errorMessage } from "../lib";
import { useI18n } from "../i18n";

const catalogLabels: Record<CatalogKind, string> = {
  supplier_type: "أنواع الموردين",
  expense_type: "أنواع المصاريف",
  sales_category: "أقسام المبيعات",
  restaurant_expense_category: "أقسام فاتورة مصاريف المطعم",
};
export function SettingsPage({
  settings,
  onSettings,
}: {
  settings: SettingsSnapshot;
  onSettings: (value: SettingsSnapshot) => void;
}) {
  const { locale, setLocale, catalogName } = useI18n();
  const [name, setName] = useState(settings.restaurantName);
  const [newNames, setNewNames] = useState<
    Partial<Record<CatalogKind, string>>
  >({});
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "danger">(
    "success",
  );
  const [busy, setBusy] = useState(false);
  const trash = useLoad(() => api.trash.list());
  const refresh = async () => onSettings(await api.settings.get());
  const saveName = async () => {
    setBusy(true);
    try {
      onSettings(await api.settings.saveRestaurantName(name));
      setMessage("تم تحديث اسم المطعم");
      setMessageKind("success");
    } catch (e) {
      setMessage(errorMessage(e));
      setMessageKind("danger");
    } finally {
      setBusy(false);
    }
  };
  const add = async (kind: CatalogKind) => {
    const value = newNames[kind]?.trim();
    if (!value) return;
    try {
      await api.settings.addCatalog(kind, value);
      setNewNames({ ...newNames, [kind]: "" });
      await refresh();
      setMessage("تمت إضافة النوع");
      setMessageKind("success");
    } catch (e) {
      setMessage(errorMessage(e));
      setMessageKind("danger");
    }
  };
  const createBackup = async () => {
    setBusy(true);
    try {
      const result = await api.backup.create();
      if (!result.canceled)
        setMessage(`تم حفظ النسخة الاحتياطية في ${result.path}`);
      setMessageKind("success");
    } catch (e) {
      setMessage(errorMessage(e));
      setMessageKind("danger");
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    if (
      !window.confirm(
        "سيتم استبدال البيانات الحالية بالنسخة المختارة، مع إنشاء نسخة أمان تلقائية. هل تريد المتابعة؟",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await api.backup.restore();
      if (result.restored) {
        const restoredSettings = await api.settings.get();
        onSettings(restoredSettings);
        setName(restoredSettings.restaurantName);
        trash.reload();
        setMessage(result.message ?? "تم الاسترجاع");
        setMessageKind("success");
      }
    } catch (e) {
      setMessage(errorMessage(e));
      setMessageKind("danger");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <PageHeader
        eyebrow="إدارة التطبيق والبيانات المحلية"
        title="الإعدادات والنسخ الاحتياطي"
      />
      {message && <Notice kind={messageKind}>{message}</Notice>}
      <div className="settings-grid">
        <section className="panel">
          <div className="section-title">
            <div>
              <h2>بيانات المطعم</h2>
            </div>
          </div>
          <Field label="اسم المطعم">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="العملة">
            <Input
              value={
                locale === "ar" ? "الدينار العراقي (IQD)" : "Iraqi dinar (IQD)"
              }
              disabled
            />
          </Field>
          <Field label="لغة التطبيق">
            <Select
              value={locale}
              onChange={(event) =>
                void setLocale(event.target.value as "ar" | "en")
              }
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <button className="button primary" disabled={busy} onClick={saveName}>
            حفظ التغييرات
          </button>
        </section>
        <section className="panel backup-panel">
          <div className="section-title">
            <div>
              <DatabaseBackup />
              <h2>حماية البيانات</h2>
            </div>
          </div>
          <p>تتضمن النسخة قاعدة SQLite وكل صور الفواتير وملفات PDF.</p>
          <button
            className="button primary"
            disabled={busy}
            onClick={createBackup}
          >
            <HardDriveDownload size={18} /> إنشاء نسخة احتياطية
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={restore}
          >
            <ArchiveRestore size={18} /> استرجاع نسخة
          </button>
          <small>قبل الاسترجاع ينشئ التطبيق نسخة أمان تلقائية.</small>
        </section>
      </div>
      <section className="settings-catalogs">
        <div className="section-title">
          <div>
            <h2>الأنواع والأقسام</h2>
          </div>
        </div>
        <div className="catalog-grid">
          {(Object.keys(catalogLabels) as CatalogKind[]).map((kind) => (
            <article className="catalog" key={kind}>
              <h3>{catalogLabels[kind]}</h3>
              <div className="catalog-list">
                {settings.catalogs
                  .filter((x) => x.kind === kind)
                  .map((item) => (
                    <button
                      key={item.id}
                      className={!item.active ? "inactive" : ""}
                      onClick={async () => {
                        await api.settings.toggleCatalog(item.id, !item.active);
                        await refresh();
                      }}
                    >
                      <span>{catalogName(item)}</span>
                      <small>{item.active ? "نشط" : "غير نشط"}</small>
                    </button>
                  ))}
              </div>
              <div className="catalog-add">
                <Input
                  placeholder="اسم جديد"
                  value={newNames[kind] ?? ""}
                  onChange={(e) =>
                    setNewNames({ ...newNames, [kind]: e.target.value })
                  }
                />
                <button className="icon-button" onClick={() => add(kind)}>
                  <Plus />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel trash-panel">
        <div className="section-title">
          <div>
            <Trash2 />
            <h2>سلة المحذوفات</h2>
          </div>
          <button className="button ghost small" onClick={trash.reload}>
            <RefreshCcw size={16} /> تحديث
          </button>
        </div>
        {!trash.data ? (
          <Loading />
        ) : trash.data.length === 0 ? (
          <p className="muted">سلة المحذوفات فارغة.</p>
        ) : (
          <div className="trash-list">
            {trash.data.map((item) => (
              <div key={`${item.type}-${item.id}`}>
                <span>
                  <b>{item.title}</b>
                  <small>
                    {new Date(item.deletedAt).toLocaleString(
                      locale === "ar" ? "ar-IQ" : "en-IQ",
                    )}
                  </small>
                </span>
                <div>
                  <button
                    onClick={async () => {
                      await api.trash.restore(item.type, item.id);
                      trash.reload();
                    }}
                  >
                    <ArchiveRestore size={16} /> استرجاع
                  </button>
                  <button
                    className="danger-link"
                    onClick={async () => {
                      if (
                        window.confirm(
                          "هذا حذف نهائي ولا يمكن التراجع عنه. هل أنت متأكد؟",
                        )
                      ) {
                        await api.trash.removePermanently(item.type, item.id);
                        trash.reload();
                      }
                    }}
                  >
                    <Trash2 size={16} /> حذف نهائي
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
