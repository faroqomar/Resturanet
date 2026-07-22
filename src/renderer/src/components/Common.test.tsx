import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateRangeBar, Money, Notice } from "./Common";

describe("مكونات الواجهة العربية", () => {
  it("يعرض الدينار العراقي دون كسور", () => {
    const { container } = render(<Money value={1250000} />);
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
});
