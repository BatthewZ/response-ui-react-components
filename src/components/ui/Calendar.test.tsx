import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { getMonthLabel, getWeekdayNames } from "../../util/date";
import { Calendar } from "./Calendar";

// A fixed month so tests are deterministic regardless of "today".
const JUNE_2026 = new Date(2026, 5, 15);

/**
 * The in-month day button for a given day-of-month. The grid pads with
 * leading/trailing days from adjacent months, so a bare label like "1" can
 * appear twice; we pick the one that belongs to the displayed month
 * (i.e. not `data-outside`).
 */
function dayButton(label: string): HTMLButtonElement {
  const matches = screen
    .getAllByRole("button", { name: label })
    .filter((el): el is HTMLButtonElement => !el.hasAttribute("data-outside"));
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
    expect(before).toBeDisabled();
    expect(before).toHaveAttribute("aria-disabled", "true");

    const within = dayButton("15");
    expect(within).not.toBeDisabled();

    const after = dayButton("25");
    expect(after).toBeDisabled();
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
});
