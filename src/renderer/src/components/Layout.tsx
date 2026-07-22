import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BadgeDollarSign,
  BanknoteArrowDown,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  PackageOpen,
  Plus,
  ReceiptText,
  Settings,
  ShoppingBasket,
  Store,
  Truck,
  Users,
} from "lucide-react";
import type { SettingsSnapshot } from "@shared/contracts";

const nav = [
  ["/", "الرئيسية", LayoutDashboard],
  ["/days", "أيام العمل", CalendarDays],
  ["/expenses", "فواتير مصاريف المطعم", ReceiptText],
  ["/suppliers", "الموردون", Users],
  ["/supplier-invoices", "فواتير الموردين", Truck],
  ["/produce-invoices", "فواتير المخضر", ShoppingBasket],
  ["/supplier-payments", "دفعات الموردين", BanknoteArrowDown],
  ["/sales", "المبيعات اليومية", BadgeDollarSign],
  ["/operating", "الإيجار والرواتب والمصاريف", Store],
  ["/reports", "التقارير", ChartNoAxesCombined],
  ["/settings", "الإعدادات والنسخ الاحتياطي", Settings],
] as const;

const quick = [
  ["/expenses", "فاتورة مصاريف المطعم"],
  ["/supplier-invoices", "فاتورة مورد"],
  ["/produce-invoices", "فاتورة مخضر"],
  ["/supplier-payments", "دفعة لمورد"],
  ["/sales", "مبيعات يومية"],
  ["/operating", "إيجار أو راتب أو مصروف"],
] as const;

export function Layout({
  settings,
  children,
}: {
  settings: SettingsSnapshot;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>
            <PackageOpen size={25} />
          </span>
          <div>
            <strong>{settings.restaurantName || "نظام المطعم"}</strong>
            <small>دفتر يومي محلي</small>
          </div>
        </div>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="offline-dot" /> يعمل محليًا دون إنترنت
        </div>
      </aside>
      <main className="workspace">
        <div className="topbar">
          <div>
            <ClipboardList size={18} />
            <span>
              {nav.find(([path]) => path === location.pathname)?.[1] ??
                "نظام المطعم"}
            </span>
          </div>
          <div className="quick-wrap">
            <button className="button primary" onClick={() => setOpen(!open)}>
              <Plus size={18} /> إنشاء فاتورة جديدة <ChevronDown size={15} />
            </button>
            {open && (
              <div className="quick-menu">
                {quick.map(([path, label]) => (
                  <NavLink
                    key={path}
                    to={`${path}?new=1`}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
