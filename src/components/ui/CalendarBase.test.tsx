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

  describe("autoFocus", () => {
    it("lands on the roving day rather than the chrome", () => {
      render(
        <CalendarBase
          autoFocus
          defaultMonth={JUNE_2026}
          focusAnchor={JUNE_2026}
          getDayStatus={() => ({})}
          onDaySelect={noop}
        />,
      );
      expect(document.activeElement).toHaveAttribute("data-day", dayKey(JUNE_2026));
    });

    /**
     * The popover this opens inside has no position yet — Floating UI computes it
     * asynchronously, so the portalled calendar is still at the document's top-left
     * when this focus runs, and a scrolling focus takes the whole page to the top
     * with it. jsdom implements no scrolling at all, so the option passed is the
     * only place the guarantee is observable here.
     */
    it("does not scroll the day into view", () => {
      const focus = vi.spyOn(HTMLElement.prototype, "focus");
      render(
        <CalendarBase
          autoFocus
          defaultMonth={JUNE_2026}
          focusAnchor={JUNE_2026}
          getDayStatus={() => ({})}
          onDaySelect={noop}
        />,
      );
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      focus.mockRestore();
    });
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

  /* ---------------------------------------------------------------- */
  /*  classNames                                                       */
  /* ---------------------------------------------------------------- */

  describe("classNames", () => {
    /**
     * Every internal `CalendarBase` renders, and the base class each slot must
     * be appended to. Two of them — `.calendar-picker-cell` and `.calendar-day`
     * — are also `querySelector` targets driving focus, which is why the
     * base-class half of each row is asserted rather than assumed.
     */
    const SLOTS = [
      { key: "header", base: "calendar-header", view: "days" },
      { key: "labelButton", base: "calendar-label-button", view: "days" },
      { key: "months", base: "calendar-months", view: "days" },
      { key: "footer", base: "calendar-footer", view: "days" },
      { key: "todayButton", base: "calendar-today-button", view: "days" },
      { key: "month", base: "calendar-month", view: "days" },
      { key: "caption", base: "calendar-month-caption", view: "days" },
      { key: "grid", base: "calendar-grid", view: "days" },
      { key: "weekdays", base: "calendar-weekdays", view: "days" },
      { key: "weekday", base: "calendar-weekday", view: "days" },
      { key: "row", base: "calendar-week", view: "days" },
      { key: "cell", base: "calendar-cell", view: "days" },
      { key: "day", base: "calendar-day", view: "days" },
      { key: "pickerGrid", base: "calendar-picker-grid", view: "months" },
      { key: "pickerCell", base: "calendar-picker-cell", view: "months" },
    ] as const;

    /**
     * `showToday` and two months so every once-rendered element exists:
     * `.calendar-footer`/`.calendar-today-button` need the first,
     * `.calendar-month-caption` is guarded on `monthCount > 1`.
     */
    async function renderAll(
      classNames: Partial<Record<(typeof SLOTS)[number]["key"], string>>,
      view: "days" | "months",
    ) {
      const result = render(
        <CalendarBase
          showToday
          numberOfMonths={2}
          defaultMonth={JUNE_2026}
          getDayStatus={() => ({})}
          onDaySelect={noop}
          classNames={classNames}
        />,
      );
      if (view === "months") {
        await userEvent.setup().click(screen.getByRole("button", { name: /June 2026/ }));
      }
      return result;
    }

    for (const { key, base, view } of SLOTS) {
      it(`lands classNames.${key} on .${base}, beside the base class`, async () => {
        const { container } = await renderAll({ [key]: "sentinel-slot" }, view);
        const el = container.querySelector(`.${base}`);
        expect(el, `no .${base} rendered`).not.toBeNull();
        expect(el!.getAttribute("class")).toContain(base);
        expect(el!.getAttribute("class")).toContain("sentinel-slot");
      });
    }

    it("leaves every base class alone when no slot is passed", async () => {
      const { container } = await renderAll({}, "days");
      for (const { base } of SLOTS.filter((s) => s.view === "days")) {
        const el = container.querySelector(`.${base}`);
        expect(el, `no .${base} rendered`).not.toBeNull();
        // `toBe`, not `toContain`: a merge that drops the library class when the
        // slot is `undefined` passes `toContain` and fails here.
        const expected = base === "calendar-label-button" ? "calendar-label calendar-label-button" : base;
        expect(el!.getAttribute("class")).toBe(expected);
      }
    });

    it("does not put a slot class on the root", async () => {
      const { container } = await renderAll({ day: "sentinel-slot" }, "days");
      expect(container.querySelector(".calendar")!.getAttribute("class")).not.toContain(
        "sentinel-slot",
      );
    });

    /**
     * The reason for an inline slot union rather than a `Record<string,string>`
     * helper: an unknown key is a *type* error, not a silent no-op. The
     * `@ts-expect-error` is the assertion — it fails if TypeScript ever stops
     * rejecting the key. Do not "clean it up".
     */
    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        <CalendarBase
          defaultMonth={JUNE_2026}
          getDayStatus={() => ({})}
          onDaySelect={noop}
          // @ts-expect-error — `dayCell` is not a slot; only untyped JS gets here.
          classNames={{ dayCell: "sentinel-slot" }}
        />,
      );
      expect(container.querySelector(".calendar-day")!.getAttribute("class")).toBe("calendar-day");
    });

    it("does not leak classNames onto the DOM", async () => {
      const { container } = await renderAll({ header: "sentinel-slot" }, "days");
      expect(container.querySelector(".calendar")!.hasAttribute("classnames")).toBe(false);
    });

    /**
     * `.calendar-day` and `.calendar-picker-cell` are queried by the two
     * roving-focus effects. A slot appends to them; it must never be able to
     * replace them, or arrow-key focus stops finding anything.
     */
    it("still finds the roving day by selector when a day slot is set", async () => {
      // Asserts the marker survived the merge, not that the slot landed — that
      // is the override test's job, and duplicating it here would make both
      // reden for one cause.
      await renderAll({ day: "calendar-day-custom bg-surface-2" }, "days");
      expect(document.querySelectorAll('.calendar-day[tabindex="0"]')).toHaveLength(1);
    });

    it("keeps arrow-key focus working through a pickerCell slot", async () => {
      const user = userEvent.setup();
      await renderAll({ pickerCell: "bg-surface-2" }, "months");
      const cells = pickerCells();
      expect(cells).toHaveLength(12);
      cells[5].focus();
      await user.keyboard("{ArrowRight}");
      expect(document.activeElement).toBe(cells[6]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  renderDay                                                        */
  /* ---------------------------------------------------------------- */

  describe("renderDay", () => {
    it("replaces a day's content without replacing the button", () => {
      render(
        <CalendarBase
          defaultMonth={JUNE_2026}
          getDayStatus={(d) => ({ selected: d.getDate() === 11 })}
          onDaySelect={noop}
          renderDay={({ date, selected }) => (
            <>
              {date.getDate()}
              {selected && <span data-testid="booked">•</span>}
            </>
          )}
        />,
      );
      const eleventh = document.querySelector<HTMLButtonElement>(
        `[data-day="${dayKey(new Date(2026, 5, 11))}"]`,
      )!;
      const twelfth = document.querySelector<HTMLButtonElement>(
        `[data-day="${dayKey(new Date(2026, 5, 12))}"]`,
      )!;

      expect(eleventh.querySelector('[data-testid="booked"]')).not.toBeNull();
      expect(twelfth.querySelector('[data-testid="booked"]')).toBeNull();
      // The button, its class and its accessible name stay the component's.
      expect(eleventh.tagName).toBe("BUTTON");
      expect(eleventh.getAttribute("class")).toBe("calendar-day");
      expect(eleventh).toHaveAccessibleName("June 11, 2026");
    });

    it("reports outside, today and disabled per cell", () => {
      const seen = new Map<string, { outside: boolean; disabled: boolean }>();
      render(
        <CalendarBase
          defaultMonth={JUNE_2026}
          isDateDisabled={(d) => d.getDate() === 20 && d.getMonth() === 5}
          getDayStatus={() => ({})}
          onDaySelect={noop}
          renderDay={({ date, outside, disabled }) => {
            seen.set(dayKey(date), { outside, disabled });
            return date.getDate();
          }}
        />,
      );
      // June 2026 starts on a Monday, so the grid's first cell is 31 May.
      expect(seen.get(dayKey(new Date(2026, 4, 31)))).toEqual({ outside: true, disabled: false });
      expect(seen.get(dayKey(new Date(2026, 5, 20)))).toEqual({ outside: false, disabled: true });
      expect(seen.get(dayKey(new Date(2026, 5, 11)))).toEqual({ outside: false, disabled: false });
    });

    /**
     * The thing a render prop is most likely to break: roving focus finds the
     * day by `[data-day]` and by `.calendar-day[tabindex="0"]`, and both live on
     * the button `renderDay` renders *inside*.
     */
    it("leaves roving focus and autoFocus working", async () => {
      const user = userEvent.setup();
      render(
        <CalendarBase
          autoFocus
          defaultMonth={JUNE_2026}
          focusAnchor={new Date(2026, 5, 11)}
          getDayStatus={() => ({})}
          onDaySelect={noop}
          renderDay={({ date }) => <span data-testid="content">{date.getDate()}</span>}
        />,
      );
      const eleventh = document.querySelector<HTMLButtonElement>(
        `[data-day="${dayKey(new Date(2026, 5, 11))}"]`,
      )!;
      expect(document.activeElement).toBe(eleventh);

      await user.keyboard("{ArrowRight}");
      expect(document.activeElement).toBe(
        document.querySelector(`[data-day="${dayKey(new Date(2026, 5, 12))}"]`),
      );
    });
  });
});
