import { useCallback, useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import type { SettingsSnapshot } from "@shared/contracts";
import { api, errorMessage } from "./lib";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { WorkDaysPage } from "./pages/WorkDaysPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { RestaurantExpensesPage } from "./pages/RestaurantExpensesPage";
import { SupplierInvoicesPage } from "./pages/SupplierInvoicesPage";
import { SupplierPaymentsPage } from "./pages/SupplierPaymentsPage";
import { SalesPage } from "./pages/SalesPage";
import { OperatingExpensesPage } from "./pages/OperatingExpensesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HistoricalEntryPage } from "./pages/HistoricalEntryPage";
import { Loading, Notice } from "./components/Common";
import { I18nProvider, LanguageToggle, useI18n } from "./i18n";

function Setup({ onDone }: { onDone: (settings: SettingsSnapshot) => void }) {
  const { locale } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      onDone(await api.settings.saveRestaurantName(name));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="setup">
      <div className="setup-language">
        <LanguageToggle />
      </div>
      <div className="setup-art">
        <span>{locale === "ar" ? "ر" : "R"}</span>
        <p>
          كل رقم في مكانه.
          <br />
          كل يوم أوضح من قبله.
        </p>
      </div>
      <form onSubmit={submit}>
        <p className="eyebrow">مرحبًا بك</p>
        <h1>لنجهّز دفتر المطعم</h1>
        <p>اكتب اسم المطعم. يمكنك تغييره لاحقًا من الإعدادات.</p>
        {error && <Notice kind="danger">{error}</Notice>}
        <label className="field">
          <span>اسم المطعم *</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: مطعم النخيل"
          />
        </label>
        <button
          className="button primary wide"
          disabled={saving || !name.trim()}
        >
          {saving ? "جارٍ الحفظ…" : "ابدأ استخدام النظام"}
        </button>
        <small>تُحفظ البيانات على هذه الحاسبة فقط.</small>
      </form>
    </main>
  );
}

export function App() {
  const [settings, setSettings] = useState<SettingsSnapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.settings
      .get()
      .then(setSettings)
      .catch((reason) => setError(errorMessage(reason)));
  }, []);
  const changeLanguage = useCallback(async (language: "ar" | "en") => {
    setSettings(await api.settings.saveLanguage(language));
  }, []);
  if (error)
    return (
      <div className="fatal">
        <Notice kind="danger">{error}</Notice>
      </div>
    );
  if (!settings) return <Loading />;
  return (
    <I18nProvider locale={settings.language} onLocale={changeLanguage}>
      {!settings.restaurantName ? (
        <Setup onDone={setSettings} />
      ) : (
        <HashRouter>
          <Layout settings={settings}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/days" element={<WorkDaysPage />} />
              <Route
                path="/historical"
                element={<HistoricalEntryPage settings={settings} />}
              />
              <Route
                path="/expenses"
                element={<RestaurantExpensesPage settings={settings} />}
              />
              <Route
                path="/suppliers"
                element={<SuppliersPage settings={settings} />}
              />
              <Route
                path="/supplier-invoices"
                element={<SupplierInvoicesPage kind="standard" />}
              />
              <Route
                path="/produce-invoices"
                element={<SupplierInvoicesPage kind="produce" />}
              />
              <Route
                path="/supplier-payments"
                element={<SupplierPaymentsPage />}
              />
              <Route
                path="/sales"
                element={<SalesPage settings={settings} />}
              />
              <Route
                path="/operating"
                element={<OperatingExpensesPage settings={settings} />}
              />
              <Route path="/reports" element={<ReportsPage />} />
              <Route
                path="/settings"
                element={
                  <SettingsPage settings={settings} onSettings={setSettings} />
                }
              />
            </Routes>
          </Layout>
        </HashRouter>
      )}
    </I18nProvider>
  );
}
