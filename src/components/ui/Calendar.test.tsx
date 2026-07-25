import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getMonthLabel, getWeekdayNames } from "../../util/date";
import { Calendar } from "./Calendar";

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
    expect(tenth).toHaveAttribute("aria-selected", "true");
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
    expect(ninth).toHaveAttribute("aria-selected", "false");
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
    expect(dayButton("5")).toHaveAttribute("aria-selected", "false");
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

    expect(dayButton("10")).toHaveAttribute("aria-selected", "true");

    rerender(
      <Calendar value={new Date(2026, 5, 12)} month={JUNE_2026} onValueChange={() => {}} />,
    );

    expect(dayButton("10")).toHaveAttribute("aria-selected", "false");
    expect(dayButton("12")).toHaveAttribute("aria-selected", "true");
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
});
