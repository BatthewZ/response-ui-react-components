import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { getMonthLabel } from "../../util/date";
import { type DateRange, RangeCalendar } from "./RangeCalendar";

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
});
