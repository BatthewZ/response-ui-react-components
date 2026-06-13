import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { formatDate } from "../../util/date";
import { DateRangePicker } from "./DateRangePicker";

const LOCALE = "en-US";
const fmt = (d: Date) => formatDate(d, LOCALE);

describe("DateRangePicker", () => {
  it("typing both endpoints + Enter commits an ordered range", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DateRangePicker onValueChange={onValueChange} />);

    const start = screen.getByRole("textbox", { name: "Start date" });
    const end = screen.getByRole("textbox", { name: "End date" });

    await user.type(start, "06/14/2026");
    await user.type(end, "06/10/2026");
    await user.keyboard("{Enter}");

    const calls = onValueChange.mock.calls;
    const last = calls[calls.length - 1][0];
    // Endpoints are ordered regardless of which field held the earlier date.
    expect(last.start.getDate()).toBe(10);
    expect(last.end.getDate()).toBe(14);
    expect((start as HTMLInputElement).value).toBe(fmt(new Date(2026, 5, 10)));
    expect((end as HTMLInputElement).value).toBe(fmt(new Date(2026, 5, 14)));
  });

  it("exposes both endpoints as hidden ISO inputs for form submission", () => {
    const { container } = render(
      <DateRangePicker
        name="trip"
        defaultValue={{ start: new Date(2026, 0, 5), end: new Date(2026, 0, 9) }}
      />,
    );
    const startHidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="trip.start"]');
    const endHidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="trip.end"]');
    expect(startHidden!.value).toBe("2026-01-05");
    expect(endHidden!.value).toBe("2026-01-09");
  });

  it("opens a two-month calendar and fills both inputs when a range is picked", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker defaultMonth={new Date(2026, 5, 1)} />);

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    expect(screen.getAllByRole("grid")).toHaveLength(2);

    const pick = (d: Date) => {
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return document.querySelector<HTMLButtonElement>(`[data-day="${key}"]:not([data-outside])`)!;
    };

    await user.click(pick(new Date(2026, 5, 10)));
    await user.click(pick(new Date(2026, 5, 18)));

    const start = screen.getByRole("textbox", { name: "Start date" });
    const end = screen.getByRole("textbox", { name: "End date" });
    expect((start as HTMLInputElement).value).toBe(fmt(new Date(2026, 5, 10)));
    expect((end as HTMLInputElement).value).toBe(fmt(new Date(2026, 5, 18)));
  });

  it("reverts an invalid endpoint draft on blur", async () => {
    const user = userEvent.setup();
    render(
      <>
        <DateRangePicker defaultValue={{ start: new Date(2026, 0, 1), end: new Date(2026, 0, 31) }} />
        <button type="button">elsewhere</button>
      </>,
    );

    const start = screen.getByRole("textbox", { name: "Start date" });
    await user.clear(start);
    await user.type(start, "garbage");
    await user.click(screen.getByText("elsewhere"));

    expect((start as HTMLInputElement).value).toBe(fmt(new Date(2026, 0, 1)));
  });
});
