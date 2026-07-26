import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getMonthLabel } from "../../util/date";
import { type DateRange, RangeCalendar } from "./RangeCalendar";

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

/**
 * RangeCalendar's own `onChange` guard is invisible to a runtime test: it forwards
 * to `CalendarBase`, which strips the key too, so deleting RangeCalendar's
 * destructure leaves every assertion below green. What is *not* redundant is the
 * type ban — without `onChange?: never` on RangeCalendar itself,
 * `{...form.field<DateRange>("stay")}` compiles again and silently binds nothing.
 * This line stops compiling the moment `onChange` accepts anything but `undefined`.
 */
type OnlyUndefined<T> = [T] extends [undefined] ? true : never;
const _rangeCalendarOnChangeIsBanned: OnlyUndefined<
  ComponentProps<typeof RangeCalendar>["onChange"]
> = true;

const JUNE_2026 = new Date(2026, 5, 15);

/** The in-month day button for a specific date, located by its stable data-day key. */
function day(d: Date): HTMLButtonElement {
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const el = document.querySelector<HTMLButtonElement>(`[data-day="${key}"]:not([data-outside])`);
  if (!el) throw new Error(`No in-month day button for ${key}`);
  return el;
}

describe("RangeCalendar", () => {
  it("renders two month grids by default", () => {
    render(<RangeCalendar defaultMonth={JUNE_2026} />);
    const grids = screen.getAllByRole("grid");
    expect(grids).toHaveLength(2);
    expect(grids[0]).toHaveAccessibleName(getMonthLabel(new Date(2026, 5, 1), "en-US"));
    expect(grids[1]).toHaveAccessibleName(getMonthLabel(new Date(2026, 6, 1), "en-US"));
  });

  it("selects start then end and marks endpoints + in-between days", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RangeCalendar defaultMonth={JUNE_2026} numberOfMonths={1} onValueChange={onValueChange} />,
    );

    await user.click(day(new Date(2026, 5, 10)));
    expect(day(new Date(2026, 5, 10))).toHaveAttribute("data-range-start");
    // First click starts the range; end is still null.
    expect(onValueChange).toHaveBeenLastCalledWith({ start: expect.any(Date), end: null });

    await user.click(day(new Date(2026, 5, 14)));
    expect(day(new Date(2026, 5, 10))).toHaveAttribute("data-range-start");
    expect(day(new Date(2026, 5, 14))).toHaveAttribute("data-range-end");
    // A day strictly inside the range is marked in-range.
    expect(day(new Date(2026, 5, 12))).toHaveAttribute("data-in-range");

    const calls = onValueChange.mock.calls;
    const last = calls[calls.length - 1][0] as DateRange;
    expect(last.start!.getDate()).toBe(10);
    expect(last.end!.getDate()).toBe(14);
  });

  it("orders endpoints when the second click precedes the first", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RangeCalendar defaultMonth={JUNE_2026} numberOfMonths={1} onValueChange={onValueChange} />,
    );

    await user.click(day(new Date(2026, 5, 20)));
    await user.click(day(new Date(2026, 5, 12)));

    const calls = onValueChange.mock.calls;
    const last = calls[calls.length - 1][0] as DateRange;
    expect(last.start!.getDate()).toBe(12);
    expect(last.end!.getDate()).toBe(20);
    expect(day(new Date(2026, 5, 12))).toHaveAttribute("data-range-start");
    expect(day(new Date(2026, 5, 20))).toHaveAttribute("data-range-end");
  });

  it("starts a fresh range when clicking after a complete range", async () => {
    const user = userEvent.setup();
    render(<RangeCalendar defaultMonth={JUNE_2026} numberOfMonths={1} />);

    await user.click(day(new Date(2026, 5, 5)));
    await user.click(day(new Date(2026, 5, 9)));
    // Third click resets to a new single-endpoint range.
    await user.click(day(new Date(2026, 5, 20)));

    expect(day(new Date(2026, 5, 20))).toHaveAttribute("data-range-start");
    expect(day(new Date(2026, 5, 5))).not.toHaveAttribute("data-range-start");
    expect(day(new Date(2026, 5, 9))).not.toHaveAttribute("data-range-end");
  });

  it("previews the in-progress range on hover", async () => {
    const user = userEvent.setup();
    render(<RangeCalendar defaultMonth={JUNE_2026} numberOfMonths={1} />);

    await user.click(day(new Date(2026, 5, 10)));
    await user.hover(day(new Date(2026, 5, 13)));

    expect(day(new Date(2026, 5, 12))).toHaveAttribute("data-preview");
  });

  it("clears the hover preview when the pointer leaves the calendar", async () => {
    const user = userEvent.setup();
    render(<RangeCalendar defaultMonth={JUNE_2026} numberOfMonths={1} />);

    await user.click(day(new Date(2026, 5, 10)));
    await user.hover(day(new Date(2026, 5, 14)));
    expect(document.querySelectorAll("[data-preview]")).toHaveLength(4);

    await user.unhover(day(new Date(2026, 5, 14)));
    expect(document.querySelectorAll("[data-preview]")).toHaveLength(0);
  });

  it("clears the hover preview on leave even when the caller passes onPointerLeave", async () => {
    const user = userEvent.setup();
    const onPointerLeave = vi.fn();
    render(
      <RangeCalendar
        defaultMonth={JUNE_2026}
        numberOfMonths={1}
        onPointerLeave={onPointerLeave}
      />,
    );

    await user.click(day(new Date(2026, 5, 10)));
    await user.hover(day(new Date(2026, 5, 14)));
    expect(document.querySelectorAll("[data-preview]")).toHaveLength(4);

    // jsdom's synthetic pointerout carries no relatedTarget, so React cannot stop the
    // leave chain at the common ancestor and day-to-day moves also reach the root.
    // Count only the decisive leave, out of the calendar.
    onPointerLeave.mockClear();
    await user.unhover(day(new Date(2026, 5, 14)));
    expect(document.querySelectorAll("[data-preview]")).toHaveLength(0);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });

  it("clears a keyboard-built preview on leave even when the caller passes onPointerLeave", async () => {
    const user = userEvent.setup();
    const onPointerLeave = vi.fn();
    render(
      <RangeCalendar
        defaultMonth={JUNE_2026}
        numberOfMonths={1}
        onPointerLeave={onPointerLeave}
      />,
    );

    // Build the preview from the keyboard: Enter on a day button starts the range,
    // then Arrow keys move the roving focus and extend the preview.
    day(new Date(2026, 5, 15)).focus();
    await user.keyboard("{Enter}");
    await user.hover(day(new Date(2026, 5, 15)));
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(document.querySelectorAll("[data-preview]")).toHaveLength(2);

    onPointerLeave.mockClear();
    await user.unhover(day(new Date(2026, 5, 17)));
    expect(document.querySelectorAll("[data-preview]")).toHaveLength(0);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });

  it("renders a controlled range", () => {
    render(
      <RangeCalendar
        month={JUNE_2026}
        numberOfMonths={1}
        value={{ start: new Date(2026, 5, 8), end: new Date(2026, 5, 11) }}
        onValueChange={() => {}}
      />,
    );

    expect(day(new Date(2026, 5, 8))).toHaveAttribute("data-range-start");
    expect(day(new Date(2026, 5, 11))).toHaveAttribute("data-range-end");
    expect(day(new Date(2026, 5, 9))).toHaveAttribute("data-in-range");
  });

  it("does not highlight an endpoint twice when it also appears as a padding day", () => {
    // June 28 → July 3, shown across the June + July grids. July 3 is in-month in
    // July but also rendered as a trailing (outside) day in June's grid; June 28 is
    // in-month in June but a leading (outside) day in July. Each endpoint must be
    // highlighted exactly once (its in-month cell) — the multi-month duplicate bug.
    render(
      <RangeCalendar
        month={JUNE_2026}
        value={{ start: new Date(2026, 5, 28), end: new Date(2026, 6, 3) }}
        onValueChange={() => {}}
      />,
    );

    expect(document.querySelectorAll("[data-range-start]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-range-end]")).toHaveLength(1);
    // No outside/padding day carries any range state.
    expect(
      document.querySelectorAll(
        "[data-outside][data-range-start], [data-outside][data-range-end], [data-outside][data-in-range]",
      ),
    ).toHaveLength(0);
    // The single highlighted endpoints are the in-month cells.
    expect(day(new Date(2026, 5, 28))).toHaveAttribute("data-range-start");
    expect(day(new Date(2026, 6, 3))).toHaveAttribute("data-range-end");
  });

  it("drives an uncontrolled range end-to-end across two months", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [range, setRange] = useState<DateRange>({ start: null, end: null });
      return (
        <div>
          <span data-testid="out">
            {range.start?.getDate() ?? "-"}/{range.end?.getDate() ?? "-"}
          </span>
          <RangeCalendar defaultMonth={JUNE_2026} onValueChange={setRange} />
        </div>
      );
    }

    render(<Harness />);
    await user.click(day(new Date(2026, 5, 28))); // late June (grid 1)
    await user.click(day(new Date(2026, 6, 3))); // early July (grid 2)
    expect(screen.getByTestId("out")).toHaveTextContent("28/3");
  });

  // RangeCalendar's two-month default is exactly what CalendarBase collapses
  // below 40rem. jsdom's matchMedia never matches a width query, so the branch
  // is unreachable without replacing the global.
  describe("compact layout (below the 40rem breakpoint)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function stubMatchMedia(matches: boolean) {
      vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((query: string) => ({
          matches,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );
    }

    it("collapses the default two-month range calendar to one month", () => {
      stubMatchMedia(true);
      render(<RangeCalendar defaultMonth={JUNE_2026} />);

      const grids = screen.getAllByRole("grid");
      expect(grids).toHaveLength(1);
      expect(grids[0]).toHaveAccessibleName(getMonthLabel(new Date(2026, 5, 1), "en-US"));
    });

    it("keeps both months when the viewport is wide enough", () => {
      stubMatchMedia(false);
      render(<RangeCalendar defaultMonth={JUNE_2026} />);

      expect(screen.getAllByRole("grid")).toHaveLength(2);
    });

    it("still selects a range across the paged months while collapsed", async () => {
      const user = userEvent.setup();
      stubMatchMedia(true);
      const onValueChange = vi.fn();
      render(<RangeCalendar defaultMonth={JUNE_2026} onValueChange={onValueChange} />);

      await user.click(day(new Date(2026, 5, 28)));
      expect(onValueChange).toHaveBeenCalledTimes(1);

      // Only June is mounted, so July's endpoint needs the ‹ › nav to page there.
      await user.click(screen.getByRole("button", { name: "Next month" }));
      expect(screen.getAllByRole("grid")).toHaveLength(1);

      await user.click(day(new Date(2026, 6, 3)));
      expect(onValueChange).toHaveBeenCalledTimes(2);
      const last = onValueChange.mock.calls[1][0] as DateRange;
      expect(last.start!.getDate()).toBe(28);
      expect(last.end!.getDate()).toBe(3);
    });
  });

  describe("omitted props", () => {
    it("a field()-shaped bag's onChange never reaches the calendar root", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      // The real `field<DateRange>()` shape. A one-key `{ onChange }` bag is
      // rejected by TS2559 ("no properties in common") and would give a false green.
      const bag = {
        name: "stay",
        value: { start: null, end: null } as DateRange,
        onChange: vi.fn(),
        onBlur: vi.fn(),
      };

      const { container } = render(
        <RangeCalendar
          defaultMonth={JUNE_2026}
          onValueChange={onValueChange}
          {...untypedProps(bag)}
        />,
      );
      const root = container.querySelector(".calendar");
      await user.click(day(new Date(2026, 5, 10)));

      expect(hostProps(root!)).not.toHaveProperty("onChange");
      expect(bag.onChange).toHaveBeenCalledTimes(0);
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });
  });
});
