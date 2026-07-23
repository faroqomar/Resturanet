import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateRangeBar, Money, Notice } from "./Common";
import { I18nProvider } from "../i18n";

describe("مكونات الواجهة العربية", () => {
  it("يعرض الدينار العراقي دون كسور", () => {
    const { container } = render(
      <I18nProvider locale="ar" onLocale={vi.fn()}>
        <Money value={1250000} />
      </I18nProvider>,
    );
    expect(container.firstChild).toHaveTextContent("١٬٢٥٠٬٠٠٠ د.ع");
  });

  it("يغير الفترة إلى أسبوع السبت حتى الجمعة", async () => {
    const onChange = vi.fn();
    render(
      <DateRangeBar
        value={{ from: "2026-07-01", to: "2026-07-31" }}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "هذا الأسبوع" }));
    expect(onChange).toHaveBeenCalledOnce();
    const value = onChange.mock.calls[0][0];
    expect(new Date(`${value.from}T12:00:00Z`).getUTCDay()).toBe(6);
    expect(new Date(`${value.to}T12:00:00Z`).getUTCDay()).toBe(5);
  });

  it("يعطي التنبيه دور حالة يمكن لقارئ الشاشة الوصول إليه", () => {
    render(<Notice>بيانات المبيعات غير مكتملة</Notice>);
    expect(screen.getByRole("status")).toHaveTextContent(
      "بيانات المبيعات غير مكتملة",
    );
  });

  it("يعرض الإنجليزية واتجاه LTR عند اختيارها", async () => {
    const { container } = render(
      <I18nProvider locale="en" onLocale={vi.fn()}>
        <div>
          <span>الرئيسية</span>
          <Money value={1250000} />
        </div>
      </I18nProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("Dashboard")).toBeInTheDocument(),
    );
    expect(container).toHaveTextContent("1,250,000 IQD");
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
  });

  it("يترجم النص والسمات عند إعادة استخدام عناصر الصفحة", async () => {
    const { container, rerender } = render(
      <I18nProvider locale="en" onLocale={vi.fn()}>
        <div>
          <span>الرئيسية</span>
          <img alt="معاينة المرفق" />
        </div>
      </I18nProvider>,
    );
    await waitFor(() =>
      expect(within(container).getByText("Dashboard")).toBeInTheDocument(),
    );
    expect(
      within(container).getByAltText("Attachment preview"),
    ).toBeInTheDocument();

    rerender(
      <I18nProvider locale="en" onLocale={vi.fn()}>
        <div>
          <span>الرصيد المتبقي</span>
          <img alt="إزالة المرفق" />
        </div>
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(
        within(container).getByText("Outstanding balance"),
      ).toBeInTheDocument(),
    );
    expect(
      within(container).getByAltText("Remove attachment"),
    ).toBeInTheDocument();
  });
});
