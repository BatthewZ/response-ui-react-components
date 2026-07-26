import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { startOfDay } from "../../util/date";
import { CalendarBase } from "./CalendarBase";

const JUNE_2026 = new Date(2026, 5, 15);

const noop = () => {};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function pickerCells(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".calendar-picker-cell"));
}

/**
 * The props React handed the host element. `Omit` is compile-time only, and
 * `onChange` on a `<div>` renders no attribute and fires only for a descendant
 * form control (the calendar has none) — so this is the only place a key that
 * slipped through a `{...props}` spread is observable.
 */
function hostProps(el: Element): Record<string, unknown> {
  const key = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
  if (!key) throw new Error("element is not React-rendered");
  return (el as unknown as Record<string, Record<string, unknown>>)[key];
}

/**
 * A caller's bag arriving from a carrier TypeScript cannot see — plain JS, or
 * props forwarded through `any`. `onChange?: never` makes the *typed* spread of
 * the same object a compile error; the runtime destructure is what covers this
 * half, and it is the half a published package cannot assume away.
 */
function untypedProps(bag: Record<string, unknown>): Record<string, never> {
  return bag as Record<string, never>;
}

// CalendarBase is internal — it has no barrel export, so Calendar and
// RangeCalendar are its only consumers. They strip `onChange` themselves, which
// makes this guard unobservable through them; it is asserted here instead.
describe("CalendarBase", () => {
  it("a field()-shaped bag's onChange never reaches the calendar root", () => {
    // The real `field<Date>()` shape. A one-key `{ onChange }` bag is rejected by
    // TS2559 ("no properties in common") and would give a false green.
    const bag = { name: "due", value: JUNE_2026, onChange: vi.fn(), onBlur: vi.fn() };

    const { container } = render(
      <CalendarBase
        defaultMonth={JUNE_2026}
        getDayStatus={() => ({})}
        onDaySelect={vi.fn()}
        {...untypedProps(bag)}
      />,
    );
    const root = container.querySelector(".calendar");

    expect(hostProps(root!)).not.toHaveProperty("onChange");
    expect(hostProps(root!).onBlur).toBe(bag.onBlur);
  });

  // #312
  it("the Today button emits the same instant a day cell emits", async () => {
    const user = userEvent.setup();
    const onTodayClick = vi.fn();
    const onDaySelect = vi.fn();
    const today = startOfDay(new Date());

    render(
      <CalendarBase
        showToday
        getDayStatus={() => ({})}
        onDaySelect={onDaySelect}
        onTodayClick={onTodayClick}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.click(document.querySelector<HTMLButtonElement>(`[data-day="${dayKey(today)}"]`)!);

    const fromToday = onTodayClick.mock.calls[0][0] as Date;
    const fromGrid = onDaySelect.mock.calls[0][0] as Date;
    expect(fromToday.getTime()).toBe(fromGrid.getTime());
  });

  // #313 / #452
  describe("month/year quick-nav", () => {
    async function openMonths(user: ReturnType<typeof userEvent.setup>) {
      render(<CalendarBase defaultMonth={JUNE_2026} getDayStatus={() => ({})} onDaySelect={noop} />);
      await user.click(screen.getByRole("button", { name: "June 2026" }));
    }

    it("claims no grid role and no rowless gridcells", async () => {
      await openMonths(userEvent.setup());
      expect(screen.queryAllByRole("grid")).toHaveLength(0);
      expect(screen.queryAllByRole("gridcell")).toHaveLength(0);
      expect(screen.getByRole("group", { name: "2026" })).toBeInTheDocument();
    });

    it("marks the displayed month with aria-current, never aria-selected", async () => {
      await openMonths(userEvent.setup());
      const cells = pickerCells();
      expect(cells.some((c) => c.hasAttribute("aria-selected"))).toBe(false);
      expect(cells.filter((c) => c.getAttribute("aria-current") === "true")).toHaveLength(1);
      expect(cells[5]).toHaveAttribute("aria-current", "true");
    });

    it("is a single tab stop with 2-D arrow-key movement", async () => {
      const user = userEvent.setup();
      await openMonths(user);
      const cells = pickerCells();
      expect(cells.filter((c) => c.getAttribute("tabindex") === "0")).toHaveLength(1);

      // Focus starts on the caption button that opened the view; the next stop
      // is the header's "Next year", and the one after is the whole grid.
      await user.tab();
      await user.tab();
      expect(cells[5]).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(cells[6]).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(cells[9]).toHaveFocus();
      await user.keyboard("{Home}");
      expect(cells[0]).toHaveFocus();
    });
  });

  // #317
  it("keeps the live caption and quick-nav in a multi-month day view", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CalendarBase
        numberOfMonths={2}
        defaultMonth={JUNE_2026}
        getDayStatus={() => ({})}
        onDaySelect={noop}
      />,
    );

    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "June 2026 – July 2026" }));
    expect(screen.getByRole("group", { name: "2026" })).toBeInTheDocument();
  });

  // #318
  it("keeps focus on the day after a padding-day click pages the view", async () => {
    const user = userEvent.setup();
    // July 1 2026 renders as a trailing padding day inside the June grid.
    const julyFirst = new Date(2026, 6, 1);
    render(<CalendarBase defaultMonth={JUNE_2026} getDayStatus={() => ({})} onDaySelect={noop} />);

    await user.click(
      document.querySelector<HTMLButtonElement>(`[data-day="${dayKey(julyFirst)}"][data-outside]`)!,
    );

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toHaveAttribute("data-day", dayKey(julyFirst));
  });

  // #327
  it("takes its chrome strings from `labels`", () => {
    render(
      <CalendarBase
        defaultMonth={JUNE_2026}
        labels={{ previousMonth: "Mois précédent", nextMonth: "Mois suivant" }}
        getDayStatus={() => ({})}
        onDaySelect={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Mois précédent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mois suivant" })).toBeInTheDocument();
  });

  // #315
  it("names range membership instead of leaving it to a tint", () => {
    render(
      <CalendarBase
        defaultMonth={JUNE_2026}
        getDayStatus={(d) => ({ inRange: d.getDate() === 11, preview: d.getDate() === 12 })}
        onDaySelect={noop}
      />,
    );
    expect(
      document.querySelector(`[data-day="${dayKey(new Date(2026, 5, 11))}"]`),
    ).toHaveAccessibleName("June 11, 2026, in selected range");
    expect(
      document.querySelector(`[data-day="${dayKey(new Date(2026, 5, 12))}"]`),
    ).toHaveAccessibleName("June 12, 2026, in previewed range");
  });
});
