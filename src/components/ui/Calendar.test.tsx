import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getMonthLabel, getWeekdayNames } from "../../util/date";
import { Calendar } from "./Calendar";

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
 * Calendar's own `onChange` guard is invisible to a runtime test: it forwards to
 * `CalendarBase`, which strips the key too, so deleting Calendar's destructure
 * leaves every assertion below green. What is *not* redundant is the type ban —
 * without `onChange?: never` on Calendar itself, `{...form.field<Date>("d")}`
 * compiles again and silently binds nothing. This line stops compiling the moment
 * `onChange` accepts anything but `undefined`.
 */
type OnlyUndefined<T> = [T] extends [undefined] ? true : never;
const _calendarOnChangeIsBanned: OnlyUndefined<
  ComponentProps<typeof Calendar>["onChange"]
> = true;

// A fixed month so tests are deterministic regardless of "today".
// June 1 2026 is a Monday, so the 15th, 22nd and 29th are Mondays too.
const JUNE_2026 = new Date(2026, 5, 15);

/**
 * jsdom's `matchMedia` never matches a width query, so `useMediaQuery` — and
 * with it CalendarBase's compact (below-40rem) layout — is permanently false
 * unless the global is replaced.
 */
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

/**
 * The in-month day button for a given day-of-month. Day buttons carry a full-date
 * `aria-label` (e.g. "June 10, 2026"), so we match on the visible text (the day
 * number) instead. The grid pads with leading/trailing days from adjacent months,
 * so a bare label like "1" can appear twice; we pick the one that belongs to the
 * displayed month (i.e. not `data-outside`).
 */
function dayButton(label: string): HTMLButtonElement {
  const matches = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button.calendar-day"),
  ).filter((el) => el.textContent === label && !el.hasAttribute("data-outside"));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one in-month day button "${label}", found ${matches.length}`);
  }
  return matches[0];
}

/**
 * The `role="gridcell"` wrapping a day button. `aria-selected` lives here and not
 * on the button: ARIA does not support the attribute on `button` (#314).
 */
function dayCell(label: string): HTMLElement {
  const cell = dayButton(label).closest<HTMLElement>('[role="gridcell"]');
  if (!cell) throw new Error(`day button "${label}" has no gridcell`);
  return cell;
}


describe("Calendar", () => {
  it("renders 7 localized columnheaders and a grid", () => {
    render(<Calendar defaultMonth={JUNE_2026} />);

    expect(screen.getByRole("grid")).toBeInTheDocument();

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(7);

    const names = getWeekdayNames("en-US", "short", 0);
    headers.forEach((header, i) => {
      expect(header).toHaveTextContent(names[i]);
    });
  });

  it("respects a non-en-US locale and weekStartsOn for the headers", () => {
    render(<Calendar defaultMonth={JUNE_2026} locale="fr-FR" weekStartsOn={1} />);

    const headers = screen.getAllByRole("columnheader");
    const names = getWeekdayNames("fr-FR", "short", 1);
    headers.forEach((header, i) => {
      expect(header).toHaveTextContent(names[i]);
    });
  });

  it("fires onValueChange and marks the day selected on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Calendar defaultMonth={JUNE_2026} onValueChange={onValueChange} />);

    const tenth = dayButton("10");
    await user.click(tenth);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    const picked = onValueChange.mock.calls[0][0] as Date;
    expect(picked.getFullYear()).toBe(2026);
    expect(picked.getMonth()).toBe(5);
    expect(picked.getDate()).toBe(10);
    expect(dayCell("10")).toHaveAttribute("aria-selected", "true");
    expect(tenth).not.toHaveAttribute("aria-selected");
  });

  it("moves the focused button with ArrowRight/Left/Up/Down", async () => {
    const user = userEvent.setup();
    render(<Calendar defaultValue={new Date(2026, 5, 15)} defaultMonth={JUNE_2026} />);

    const fifteenth = dayButton("15");
    expect(fifteenth).toHaveAttribute("tabindex", "0");
    fifteenth.focus();

    await user.keyboard("{ArrowRight}");
    expect(dayButton("16")).toHaveFocus();
    expect(dayButton("16")).toHaveAttribute("tabindex", "0");
    expect(dayButton("15")).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{ArrowLeft}");
    expect(dayButton("15")).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(dayButton("22")).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(dayButton("15")).toHaveFocus();
  });

  it("changes the displayed month on PageDown", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(
      <Calendar
        defaultValue={new Date(2026, 5, 15)}
        defaultMonth={JUNE_2026}
        onMonthChange={onMonthChange}
      />,
    );

    dayButton("15").focus();
    await user.keyboard("{PageDown}");

    expect(onMonthChange).toHaveBeenCalledTimes(1);
    const next = onMonthChange.mock.calls[0][0] as Date;
    expect(next.getMonth()).toBe(6); // July
    expect(screen.getByRole("grid")).toHaveAccessibleName(
      getMonthLabel(new Date(2026, 6, 1), "en-US"),
    );
  });

  it("changes the displayed month on PageUp", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(
      <Calendar
        defaultValue={new Date(2026, 5, 15)}
        defaultMonth={JUNE_2026}
        onMonthChange={onMonthChange}
      />,
    );

    dayButton("15").focus();
    await user.keyboard("{PageUp}");

    expect(onMonthChange).toHaveBeenCalledTimes(1);
    const prev = onMonthChange.mock.calls[0][0] as Date;
    expect(prev.getMonth()).toBe(4); // May
    expect(screen.getByRole("grid")).toHaveAccessibleName(
      getMonthLabel(new Date(2026, 4, 1), "en-US"),
    );
    // Roving focus follows the same day-of-month into the revealed month.
    expect(dayButton("15")).toHaveFocus();
    expect(dayButton("15")).toHaveAttribute("tabindex", "0");
  });

  it("Home jumps to the first day of the focused week", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(
      <Calendar
        defaultValue={new Date(2026, 5, 15)}
        defaultMonth={JUNE_2026}
        onMonthChange={onMonthChange}
      />,
    );

    dayButton("15").focus(); // Monday
    await user.keyboard("{Home}");

    // weekStartsOn defaults to 0 (Sunday), so the week containing Mon 15 starts Sun 14.
    expect(dayButton("14")).toHaveFocus();
    expect(dayButton("14")).toHaveAttribute("tabindex", "0");
    expect(dayButton("15")).toHaveAttribute("tabindex", "-1");
    // Same month — the window must not page.
    expect(onMonthChange).toHaveBeenCalledTimes(0);
  });

  it("Home honours weekStartsOn when locating the start of the week", async () => {
    const user = userEvent.setup();
    render(
      <Calendar
        defaultValue={new Date(2026, 5, 17)}
        defaultMonth={JUNE_2026}
        weekStartsOn={1}
      />,
    );

    dayButton("17").focus(); // Wednesday
    await user.keyboard("{Home}");

    // Monday-start weeks: Wed 17 belongs to the week beginning Mon 15 (not Sun 14).
    expect(dayButton("15")).toHaveFocus();
    expect(dayButton("14")).not.toHaveFocus();
  });

  it("End jumps to the last day of the focused week", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(
      <Calendar
        defaultValue={new Date(2026, 5, 15)}
        defaultMonth={JUNE_2026}
        onMonthChange={onMonthChange}
      />,
    );

    dayButton("15").focus(); // Monday
    await user.keyboard("{End}");

    // Sunday-start weeks: Mon 15 sits in the week ending Sat 20.
    expect(dayButton("20")).toHaveFocus();
    expect(dayButton("20")).toHaveAttribute("tabindex", "0");
    expect(onMonthChange).toHaveBeenCalledTimes(0);
  });

  it("End pages the window when the week spills into the next month", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(
      <Calendar
        defaultValue={new Date(2026, 5, 29)}
        defaultMonth={JUNE_2026}
        onMonthChange={onMonthChange}
      />,
    );

    dayButton("29").focus(); // Monday of the last June week
    await user.keyboard("{End}");

    // That week ends Sat July 4 — outside the displayed month, so the window pages.
    expect(onMonthChange).toHaveBeenCalledTimes(1);
    expect((onMonthChange.mock.calls[0][0] as Date).getMonth()).toBe(6); // July
    expect(screen.getByRole("grid")).toHaveAccessibleName(
      getMonthLabel(new Date(2026, 6, 1), "en-US"),
    );
    expect(dayButton("4")).toHaveFocus();
  });

  it("crosses the month boundary with an arrow and keeps focus on the target date", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    // June 1 2026 is a Monday; ArrowLeft from the 1st lands on May 31.
    render(
      <Calendar
        defaultValue={new Date(2026, 5, 1)}
        defaultMonth={JUNE_2026}
        onMonthChange={onMonthChange}
      />,
    );

    dayButton("1").focus();
    await user.keyboard("{ArrowLeft}");

    expect(onMonthChange).toHaveBeenCalledTimes(1);
    const next = onMonthChange.mock.calls[0][0] as Date;
    expect(next.getMonth()).toBe(4); // May

    expect(screen.getByRole("grid")).toHaveAccessibleName(
      getMonthLabel(new Date(2026, 4, 1), "en-US"),
    );
    // Focus landed on May 31 in the now-displayed May grid.
    const thirtyFirst = dayButton("31");
    expect(thirtyFirst).toHaveFocus();
    expect(thirtyFirst).toHaveAttribute("tabindex", "0");
  });

  it("disables days outside [min, max]", () => {
    render(
      <Calendar
        defaultMonth={JUNE_2026}
        min={new Date(2026, 5, 10)}
        max={new Date(2026, 5, 20)}
      />,
    );

    const before = dayButton("5");
    expect(before).toHaveAttribute("aria-disabled", "true");
    // aria-disabled, not the native attribute, so the button stays focusable.
    expect(before).not.toBeDisabled();

    const within = dayButton("15");
    expect(within).not.toHaveAttribute("aria-disabled");

    const after = dayButton("25");
    expect(after).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps keyboard focus reachable when navigating onto a disabled day", async () => {
    const user = userEvent.setup();
    render(
      <Calendar
        defaultValue={new Date(2026, 5, 11)}
        defaultMonth={JUNE_2026}
        min={new Date(2026, 5, 10)}
      />,
    );

    const eleventh = dayButton("11");
    eleventh.focus();
    // ArrowLeft lands on the 10th (the min boundary, still enabled)...
    await user.keyboard("{ArrowLeft}");
    expect(dayButton("10")).toHaveFocus();
    // ...ArrowLeft again lands on the 9th, which is disabled but must still take focus.
    await user.keyboard("{ArrowLeft}");
    const ninth = dayButton("9");
    expect(ninth).toHaveAttribute("aria-disabled", "true");
    expect(ninth).toHaveFocus();
    expect(ninth).toHaveAttribute("tabindex", "0");

    // And it cannot be selected.
    await user.keyboard("{Enter}");
    expect(dayCell("9")).toHaveAttribute("aria-selected", "false");
  });

  it("does not select a disabled day on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Calendar
        defaultMonth={JUNE_2026}
        min={new Date(2026, 5, 10)}
        onValueChange={onValueChange}
      />,
    );

    await user.click(dayButton("5"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(dayCell("5")).toHaveAttribute("aria-selected", "false");
  });

  it("gives each day button a full-date accessible name", () => {
    render(<Calendar defaultMonth={JUNE_2026} />);
    // The visible text is just "13", but screen readers get the full date.
    expect(dayButton("13")).toHaveAccessibleName("June 13, 2026");
  });

  it("disables individual days via isDateDisabled (composed with min/max)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    // Disable weekends (Sat/Sun). June 13 2026 is a Saturday, June 15 a Monday.
    const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
    render(
      <Calendar defaultMonth={JUNE_2026} isDateDisabled={isWeekend} onValueChange={onValueChange} />,
    );

    expect(dayButton("13")).toHaveAttribute("aria-disabled", "true"); // Saturday
    expect(dayButton("15")).not.toHaveAttribute("aria-disabled"); // Monday

    await user.click(dayButton("13"));
    expect(onValueChange).not.toHaveBeenCalled();

    await user.click(dayButton("15"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("respects a controlled value", () => {
    const { rerender } = render(
      <Calendar value={new Date(2026, 5, 10)} month={JUNE_2026} onValueChange={() => {}} />,
    );

    expect(dayCell("10")).toHaveAttribute("aria-selected", "true");

    rerender(
      <Calendar value={new Date(2026, 5, 12)} month={JUNE_2026} onValueChange={() => {}} />,
    );

    expect(dayCell("10")).toHaveAttribute("aria-selected", "false");
    expect(dayCell("12")).toHaveAttribute("aria-selected", "true");
  });

  it("respects a controlled month (prev/next do not move without the prop changing)", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    const { rerender } = render(
      <Calendar month={JUNE_2026} onMonthChange={onMonthChange} />,
    );

    expect(screen.getByRole("grid")).toHaveAccessibleName(
      getMonthLabel(new Date(2026, 5, 1), "en-US"),
    );

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(onMonthChange).toHaveBeenCalledTimes(1);
    // Controlled: still June until the parent updates the prop.
    expect(screen.getByRole("grid")).toHaveAccessibleName(
      getMonthLabel(new Date(2026, 5, 1), "en-US"),
    );

    rerender(<Calendar month={new Date(2026, 6, 1)} onMonthChange={onMonthChange} />);
    expect(screen.getByRole("grid")).toHaveAccessibleName(
      getMonthLabel(new Date(2026, 6, 1), "en-US"),
    );
  });

  it("forwards a block-body ref callback to the root element", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Calendar
        defaultMonth={JUNE_2026}
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("drives an uncontrolled selection end-to-end", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [picked, setPicked] = useState<Date | null>(null);
      return (
        <div>
          <span data-testid="picked">{picked ? picked.getDate() : "none"}</span>
          <Calendar defaultMonth={JUNE_2026} onValueChange={setPicked} />
        </div>
      );
    }

    render(<Harness />);
    await user.click(dayButton("8"));
    expect(screen.getByTestId("picked")).toHaveTextContent("8");
  });

  it("jumps months/years via the caption quick-navigation", async () => {
    const user = userEvent.setup();
    render(<Calendar defaultMonth={JUNE_2026} />);

    // Day view -> month picker (caption shows the year).
    await user.click(screen.getByRole("button", { name: getMonthLabel(JUNE_2026, "en-US") }));
    expect(screen.getByRole("button", { name: "2026" })).toBeInTheDocument();

    // Month picker -> year picker. The decade page aligns to a multiple of 12
    // (2016–2027 for 2026), so 2024 is on the page.
    await user.click(screen.getByRole("button", { name: "2026" }));
    expect(screen.getByRole("button", { name: "2024" })).toBeInTheDocument();

    // Pick 2024 -> back to month picker, then pick March -> back to the day grid.
    await user.click(screen.getByRole("button", { name: "2024" }));
    await user.click(screen.getByRole("button", { name: "Mar" }));

    expect(screen.getByRole("grid")).toHaveAccessibleName(
      getMonthLabel(new Date(2024, 2, 1), "en-US"),
    );
  });

  it("navigates and selects today via the Today footer button", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    // Seed a far-away month so 'today' is off-screen.
    render(
      <Calendar defaultMonth={new Date(2020, 0, 1)} showToday onValueChange={onValueChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Today" }));

    const now = new Date();
    expect(screen.getByRole("grid")).toHaveAccessibleName(getMonthLabel(now, "en-US"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    const picked = onValueChange.mock.calls[0][0] as Date;
    expect(picked.getDate()).toBe(now.getDate());
  });

  it("calls a caller's onPointerLeave on the root", async () => {
    const user = userEvent.setup();
    const onPointerLeave = vi.fn();
    render(<Calendar defaultMonth={JUNE_2026} onPointerLeave={onPointerLeave} />);

    await user.hover(dayButton("10"));
    await user.unhover(dayButton("10"));

    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });

  it("renders multiple month grids with numberOfMonths", () => {
    render(<Calendar defaultMonth={JUNE_2026} numberOfMonths={2} />);
    const grids = screen.getAllByRole("grid");
    expect(grids).toHaveLength(2);
    expect(grids[0]).toHaveAccessibleName(getMonthLabel(new Date(2026, 5, 1), "en-US"));
    expect(grids[1]).toHaveAccessibleName(getMonthLabel(new Date(2026, 6, 1), "en-US"));
  });

  // CalendarBase collapses to one paged month below 40rem. The switch is a media
  // query, not a prop, so it only runs with `matchMedia` replaced — both
  // directions are asserted so a regression that collapsed unconditionally
  // (or never collapsed) fails.
  describe("compact layout (below the 40rem breakpoint)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("collapses a multi-month calendar to a single paged month", () => {
      stubMatchMedia(true);
      render(<Calendar defaultMonth={JUNE_2026} numberOfMonths={2} />);

      const grids = screen.getAllByRole("grid");
      expect(grids).toHaveLength(1);
      expect(grids[0]).toHaveAccessibleName(getMonthLabel(new Date(2026, 5, 1), "en-US"));
    });

    it("keeps both months when the viewport is wide enough", () => {
      stubMatchMedia(false);
      render(<Calendar defaultMonth={JUNE_2026} numberOfMonths={2} />);

      expect(screen.getAllByRole("grid")).toHaveLength(2);
    });

    it("turns the header caption into the month/year quick-jump once collapsed", async () => {
      const user = userEvent.setup();
      stubMatchMedia(true);
      render(<Calendar defaultMonth={JUNE_2026} numberOfMonths={2} />);

      // Multi-month grids leave the caption an inert spacer; the collapsed
      // single-month layout makes it the quick-nav trigger.
      const caption = screen.getByRole("button", {
        name: getMonthLabel(JUNE_2026, "en-US"),
      });
      await user.click(caption);
      expect(screen.getByRole("button", { name: "2026" })).toBeInTheDocument();
    });

    it("leaves the caption inert when two months are shown", () => {
      stubMatchMedia(false);
      render(<Calendar defaultMonth={JUNE_2026} numberOfMonths={2} />);

      expect(
        screen.queryByRole("button", { name: getMonthLabel(JUNE_2026, "en-US") }),
      ).not.toBeInTheDocument();
    });

    it("pages one month at a time with the nav buttons once collapsed", async () => {
      const user = userEvent.setup();
      stubMatchMedia(true);
      render(<Calendar defaultMonth={JUNE_2026} numberOfMonths={2} />);

      await user.click(screen.getByRole("button", { name: "Next month" }));

      const grids = screen.getAllByRole("grid");
      expect(grids).toHaveLength(1);
      expect(grids[0]).toHaveAccessibleName(getMonthLabel(new Date(2026, 6, 1), "en-US"));
    });
  });

  describe("omitted props", () => {
    it("a field()-shaped bag's onChange never reaches the calendar root", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      // The real `field<Date>()` shape. A one-key `{ onChange }` bag is rejected by
      // TS2559 ("no properties in common") and would give a false green.
      const bag = { name: "due", value: JUNE_2026, onChange: vi.fn(), onBlur: vi.fn() };

      const { container } = render(
        <Calendar onValueChange={onValueChange} {...untypedProps(bag)} />,
      );
      const root = container.querySelector(".calendar");
      await user.click(dayButton("10"));

      expect(hostProps(root!)).not.toHaveProperty("onChange");
      expect(bag.onChange).toHaveBeenCalledTimes(0);
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * #310 / #311 — which of `month` and the selection owns the visible window.
 *
 * The rule: a *change* in the selection moves an uncontrolled view; a controlled
 * `month` always wins and is asked instead, via `onMonthChange`. It has to be
 * edge-triggered on the change — a view that re-asserts to the selection on
 * every render cannot be paged away from. Avoiding that is why the seed was
 * mount-only, and why the selection could previously never move the view at all:
 * re-rendering `value` from June to September left the grid on June with **no
 * day marked selected anywhere**.
 */
describe("#310 · the view follows a change of selection", () => {
  const JUNE_10 = new Date(2026, 5, 10);
  const SEPT_3 = new Date(2026, 8, 3);
  const label = (d: Date) => getMonthLabel(d, "en-US");

  it("an uncontrolled month follows the selection to another month", () => {
    const { rerender } = render(<Calendar value={JUNE_10} locale="en-US" />);
    expect(screen.getByRole("grid")).toHaveAccessibleName(label(new Date(2026, 5, 1)));

    rerender(<Calendar value={SEPT_3} locale="en-US" />);

    expect(screen.getByRole("grid")).toHaveAccessibleName(label(new Date(2026, 8, 1)));
    expect(dayCell("3")).toHaveAttribute("aria-selected", "true");
  });

  it("notifies the parent that the view moved", () => {
    const onMonthChange = vi.fn();
    const { rerender } = render(
      <Calendar value={JUNE_10} onMonthChange={onMonthChange} locale="en-US" />,
    );
    onMonthChange.mockClear();

    rerender(<Calendar value={SEPT_3} onMonthChange={onMonthChange} locale="en-US" />);

    expect(onMonthChange).toHaveBeenCalledTimes(1);
    expect((onMonthChange.mock.calls[0][0] as Date).getMonth()).toBe(8);
  });

  it("does not re-assert, so a user can page away from the selection and stay", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Calendar value={JUNE_10} locale="en-US" />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("grid")).toHaveAccessibleName(label(new Date(2026, 6, 1)));

    // An unrelated re-render with the SAME selection must not yank the view back.
    rerender(<Calendar value={new Date(2026, 5, 10)} locale="en-US" />);

    expect(screen.getByRole("grid")).toHaveAccessibleName(label(new Date(2026, 6, 1)));
  });

  it("a selection change inside the visible window leaves the view alone", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Calendar value={JUNE_10} locale="en-US" />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("grid")).toHaveAccessibleName(label(new Date(2026, 6, 1)));

    rerender(<Calendar value={new Date(2026, 6, 20)} locale="en-US" />);

    expect(screen.getByRole("grid")).toHaveAccessibleName(label(new Date(2026, 6, 1)));
  });

  it("a controlled month wins; the move is a request, not a fact", () => {
    const onMonthChange = vi.fn();
    const JUNE_1 = new Date(2026, 5, 1);
    const { rerender } = render(
      <Calendar value={JUNE_10} month={JUNE_1} onMonthChange={onMonthChange} locale="en-US" />,
    );
    onMonthChange.mockClear();

    rerender(
      <Calendar value={SEPT_3} month={JUNE_1} onMonthChange={onMonthChange} locale="en-US" />,
    );

    expect(screen.getByRole("grid")).toHaveAccessibleName(label(JUNE_1));
    expect(onMonthChange).toHaveBeenCalledTimes(1);
    expect((onMonthChange.mock.calls[0][0] as Date).getMonth()).toBe(8);
  });
});

describe("#311 · an explicit defaultMonth beats a seeded selection", () => {
  it("mounts on defaultMonth when a value is given too", () => {
    render(
      <Calendar
        value={new Date(2026, 5, 10)}
        defaultMonth={new Date(2026, 0, 1)}
        locale="en-US"
      />,
    );

    expect(screen.getByRole("grid")).toHaveAccessibleName(
      getMonthLabel(new Date(2026, 0, 1), "en-US"),
    );
  });
});

describe("Calendar · change gate and spread order", () => {
  // #462
  it("does not re-emit the day that is already selected", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Calendar
        defaultMonth={JUNE_2026}
        defaultValue={new Date(2026, 5, 10)}
        onValueChange={onValueChange}
      />,
    );

    await user.click(dayButton("10"));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  // #428
  it("a spread bag cannot replace the selection wiring", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const hijack = vi.fn();
    render(
      <Calendar
        defaultMonth={JUNE_2026}
        onValueChange={onValueChange}
        {...untypedProps({ onDaySelect: hijack, onTodayClick: hijack })}
      />,
    );

    await user.click(dayButton("10"));

    expect(hijack).not.toHaveBeenCalled();
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  /**
   * Calendar renders none of the calendar markup — `CalendarBase` does — so the
   * only thing to assert here is that both channels survive the forward. The
   * anatomy itself is pinned in `CalendarBase.test.tsx`.
   */
  describe("classNames / renderDay forwarding", () => {
    it("forwards classNames to CalendarBase's internals", () => {
      const { container } = render(
        <Calendar defaultMonth={JUNE_2026} classNames={{ day: "sentinel-slot" }} />,
      );
      const day = container.querySelector(".calendar-day");
      expect(day!.getAttribute("class")).toContain("calendar-day");
      expect(day!.getAttribute("class")).toContain("sentinel-slot");
    });

    it("leaves the base classes alone when no slot is passed", () => {
      const { container } = render(<Calendar defaultMonth={JUNE_2026} />);
      expect(container.querySelector(".calendar-day")!.getAttribute("class")).toBe("calendar-day");
    });

    it("does not put a slot class on the root", () => {
      const { container } = render(
        <Calendar defaultMonth={JUNE_2026} classNames={{ day: "sentinel-slot" }} />,
      );
      expect(container.querySelector(".calendar")!.getAttribute("class")).not.toContain(
        "sentinel-slot",
      );
    });

    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        // @ts-expect-error — `dayCell` is not a slot; only untyped JS gets here.
        <Calendar defaultMonth={JUNE_2026} classNames={{ dayCell: "sentinel-slot" }} />,
      );
      expect(container.querySelector(".calendar-day")!.getAttribute("class")).toBe("calendar-day");
    });

    it("does not leak classNames onto the DOM", () => {
      const { container } = render(
        <Calendar defaultMonth={JUNE_2026} classNames={{ day: "sentinel-slot" }} />,
      );
      expect(container.querySelector(".calendar")!.hasAttribute("classnames")).toBe(false);
    });

    it("forwards renderDay, and selection still commits from the rendered cell", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Calendar
          defaultMonth={JUNE_2026}
          onValueChange={onValueChange}
          renderDay={({ date }) => (
            // The 42-cell grid spans three months, so the day number alone is
            // not unique — key on the whole date.
            <span data-testid={`d-${date.toDateString()}`}>{date.getDate()}</span>
          )}
        />,
      );
      await user.click(screen.getByTestId(`d-${new Date(2026, 5, 10).toDateString()}`));
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });
  });
});
