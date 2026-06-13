import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { formatDate } from "../../util/date";
import { DatePicker } from "./DatePicker";

const LOCALE = "en-US";

function fmt(d: Date): string {
  return formatDate(d, LOCALE);
}

describe("DatePicker", () => {
  it("typing a valid date + Enter commits and shows the formatted value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DatePicker onValueChange={onValueChange} aria-label="Date" />);

    const input = screen.getByRole("textbox", { name: "Date" });
    await user.type(input, "12/25/2026");
    await user.keyboard("{Enter}");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    const committed = onValueChange.mock.calls[0][0] as Date;
    expect(committed.getFullYear()).toBe(2026);
    expect(committed.getMonth()).toBe(11);
    expect(committed.getDate()).toBe(25);
    expect((input as HTMLInputElement).value).toBe(fmt(new Date(2026, 11, 25)));
  });

  it("typing invalid text + blur reverts to the prior value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <>
        <DatePicker
          defaultValue={new Date(2026, 0, 15)}
          onValueChange={onValueChange}
          aria-label="Date"
        />
        <button type="button">elsewhere</button>
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Date" });
    const prior = (input as HTMLInputElement).value;
    expect(prior).toBe(fmt(new Date(2026, 0, 15)));

    await user.clear(input);
    await user.type(input, "not a date");
    await user.click(screen.getByText("elsewhere"));

    expect((input as HTMLInputElement).value).toBe(prior);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("clicking the icon opens the Calendar (role=grid visible)", async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Date" />);

    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("picking a day fires onValueChange, closes the panel, and shows the date", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    // Controlled month seed via defaultValue so the grid shows a known month.
    render(
      <DatePicker
        defaultValue={new Date(2026, 5, 1)}
        onValueChange={onValueChange}
        aria-label="Date"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    const grid = screen.getByRole("grid");
    // Pick the 10th of the displayed month (June 2026) by its stable day key,
    // since "10" can also appear as an outside day from an adjacent month.
    const tenth = grid.querySelector<HTMLButtonElement>('[data-day="2026-5-10"]');
    expect(tenth).not.toBeNull();
    await user.click(tenth as HTMLButtonElement);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    const picked = onValueChange.mock.calls[0][0] as Date;
    expect(picked.getFullYear()).toBe(2026);
    expect(picked.getMonth()).toBe(5);
    expect(picked.getDate()).toBe(10);

    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "Date" });
    expect((input as HTMLInputElement).value).toBe(fmt(new Date(2026, 5, 10)));
  });

  it("clamps an out-of-range typed date to [min, max]", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const max = new Date(2026, 11, 31);
    render(
      <DatePicker
        max={max}
        min={new Date(2026, 0, 1)}
        onValueChange={onValueChange}
        aria-label="Date"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Date" });
    await user.type(input, "01/01/2030");
    await user.keyboard("{Enter}");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    const committed = onValueChange.mock.calls[0][0] as Date;
    expect(committed.getTime()).toBe(max.getTime());
    expect((input as HTMLInputElement).value).toBe(fmt(max));
  });

  it("Escape closes the panel and keeps the input value", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker defaultValue={new Date(2026, 2, 3)} aria-label="Date" />,
    );

    const input = screen.getByRole("textbox", { name: "Date" });
    const before = (input as HTMLInputElement).value;

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe(before);
  });

  it("renders a controlled value as a formatted string", () => {
    const value = new Date(2026, 6, 4);
    render(<DatePicker value={value} aria-label="Date" />);
    const input = screen.getByRole("textbox", { name: "Date" });
    expect((input as HTMLInputElement).value).toBe(fmt(value));
  });

  it("reformats when a controlled value changes externally", async () => {
    function Harness() {
      const [value, setValue] = useState<Date | null>(new Date(2026, 0, 1));
      return (
        <>
          <DatePicker value={value} aria-label="Date" />
          <button type="button" onClick={() => setValue(new Date(2026, 8, 9))}>
            change
          </button>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("textbox", { name: "Date" });
    expect((input as HTMLInputElement).value).toBe(fmt(new Date(2026, 0, 1)));

    await user.click(screen.getByText("change"));
    expect((input as HTMLInputElement).value).toBe(fmt(new Date(2026, 8, 9)));
  });

  it("clearing the input commits null", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <>
        <DatePicker
          defaultValue={new Date(2026, 3, 12)}
          onValueChange={onValueChange}
          aria-label="Date"
        />
        <button type="button">elsewhere</button>
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Date" });
    await user.clear(input);
    await user.click(screen.getByText("elsewhere"));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBeNull();
    expect((input as HTMLInputElement).value).toBe("");
  });
});
