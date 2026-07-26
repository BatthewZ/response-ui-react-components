import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { formatDate } from "../../util/date";
import type { DateRange } from "../ui/RangeCalendar";
import { DateRangePicker } from "./DateRangePicker";
import { useForm } from "./use-form";

const LOCALE = "en-US";
const fmt = (d: Date) => formatDate(d, LOCALE);

/**
 * A caller's bag arriving from a carrier TypeScript cannot see — plain JS, or
 * props forwarded through `any`. `color?: never` makes the *typed* spread of the
 * same object a compile error; the runtime destructure is what covers this half,
 * and it is the half a published package cannot assume away.
 */
function untypedProps(bag: Record<string, unknown>): Record<string, never> {
  return bag as Record<string, never>;
}

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

  describe("draft vs committed range", () => {
    it("#335 an inline value={{start, end}} does not wipe in-progress typing", async () => {
      const user = userEvent.setup();
      let bump = () => {};
      function Harness() {
        const [, setTick] = useState(0);
        bump = () => setTick((t) => t + 1);
        // The natural-looking controlled form: a fresh object every render.
        return <DateRangePicker value={{ start: new Date(2026, 5, 10), end: null }} />;
      }
      render(<Harness />);

      const end = screen.getByRole("textbox", { name: "End date" }) as HTMLInputElement;
      await user.type(end, "06/1");
      expect(end.value).toBe("06/1");

      // An unrelated parent re-render — no blur, no range change.
      act(() => bump());

      expect(end.value).toBe("06/1");
      expect(
        (screen.getByRole("textbox", { name: "Start date" }) as HTMLInputElement).value,
      ).toBe(fmt(new Date(2026, 5, 10)));
    });

    it("#335 a blur that edits nothing commits nothing", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <DateRangePicker
            defaultValue={{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 14) }}
            onValueChange={onValueChange}
          />
          <button type="button">elsewhere</button>
        </>,
      );

      const start = screen.getByRole("textbox", { name: "Start date" });
      const elsewhere = screen.getByText("elsewhere");

      await user.click(start);
      await user.click(elsewhere);
      expect(onValueChange).toHaveBeenCalledTimes(0);

      await user.click(screen.getByRole("textbox", { name: "End date" }));
      await user.click(elsewhere);
      expect(onValueChange).toHaveBeenCalledTimes(0);
    });

    it("#335 a controlled range that really moves still reseeds both fields", async () => {
      const user = userEvent.setup();
      function Harness() {
        const [range, setRange] = useState<DateRange>({
          start: new Date(2026, 5, 10),
          end: new Date(2026, 5, 14),
        });
        return (
          <>
            <DateRangePicker value={range} />
            <button
              type="button"
              onClick={() =>
                setRange({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 5) })
              }
            >
              move
            </button>
          </>
        );
      }
      render(<Harness />);

      await user.click(screen.getByText("move"));
      expect(
        (screen.getByRole("textbox", { name: "Start date" }) as HTMLInputElement).value,
      ).toBe(fmt(new Date(2026, 8, 1)));
      expect(
        (screen.getByRole("textbox", { name: "End date" }) as HTMLInputElement).value,
      ).toBe(fmt(new Date(2026, 8, 5)));
    });
  });

  describe("form.field() binding (#439)", () => {
    it("#439 writes a DateRange to the store, not a raw input string", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      let values: { stay: DateRange } = { stay: { start: null, end: null } };
      function Harness() {
        const form = useForm({
          defaultValues: { stay: { start: null, end: null } as DateRange },
        });
        values = form.getValues();
        return (
          <form {...form.props}>
            <DateRangePicker
              onValueChange={onValueChange}
              {...form.field<DateRange>("stay")}
            />
          </form>
        );
      }
      render(<Harness />);

      const start = screen.getByRole("textbox", { name: "Start date" });
      const end = screen.getByRole("textbox", { name: "End date" });
      await user.type(start, "06/10/2026");
      await user.type(end, "06/14/2026");
      await user.keyboard("{Enter}");

      // The corruption is silent: the store held the string "1" (the first
      // keystroke's target.value) where a { start, end } object is declared.
      expect(values.stay.start).toBeInstanceOf(Date);
      expect(values.stay.end).toBeInstanceOf(Date);
      expect(values.stay.start?.getDate()).toBe(10);
      expect(values.stay.end?.getDate()).toBe(14);
      expect((start as HTMLInputElement).value).toBe(fmt(new Date(2026, 5, 10)));
      expect((end as HTMLInputElement).value).toBe(fmt(new Date(2026, 5, 14)));
      // One commit when focus leaves `start`, one on Enter in `end`.
      expect(onValueChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("omitted props", () => {
    it("an omitted `color` never reaches the wrapper div", () => {
      // Two keys: a one-key `{ color }` bag is rejected by TS2559 ("no properties
      // in common") and would give a false green. `id` is a supported rest prop and
      // proves the spread itself still works.
      const bag = { color: "red", id: "stay-picker" };

      const { container } = render(<DateRangePicker {...untypedProps(bag)} />);
      const root = container.firstElementChild;

      expect(root).toHaveAttribute("id", "stay-picker");
      expect(root).not.toHaveAttribute("color");
    });
  });
});

describe("DateRangePicker · popup wiring, i18n and commit safety", () => {
  // #333
  it("only the control that opens the dialog advertises it", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker />);

    const start = screen.getByRole("textbox", { name: "Start date" });
    expect(start).not.toHaveAttribute("aria-haspopup");
    expect(start).not.toHaveAttribute("aria-expanded");
    expect(start).not.toHaveAttribute("aria-controls");

    const trigger = screen.getByRole("button", { name: "Open calendar" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-controls");
  });

  // #334
  it("a refused date reverts the endpoint instead of clearing it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <>
        <DateRangePicker
          defaultValue={{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 20) }}
          isDateDisabled={(d) => d.getDate() === 15}
          onValueChange={onValueChange}
        />
        <button type="button">elsewhere</button>
      </>,
    );

    const start = screen.getByRole("textbox", { name: "Start date" });
    await user.clear(start);
    await user.type(start, "06/15/2026");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    expect(start).toHaveValue(fmt(new Date(2026, 5, 10)));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  // #336
  it("takes its field names from `labels` and accepts ids", () => {
    render(
      <DateRangePicker
        startInputId="stay-start"
        endInputId="stay-end"
        labels={{ startDate: "Date de début", endDate: "Date de fin" }}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Date de début" })).toHaveAttribute(
      "id",
      "stay-start",
    );
    expect(screen.getByRole("textbox", { name: "Date de fin" })).toHaveAttribute("id", "stay-end");
  });

  // #337
  it("the hidden inputs carry `form` and `disabled`", () => {
    const { container } = render(<DateRangePicker name="stay" form="other" disabled />);
    const hidden = container.querySelectorAll<HTMLInputElement>('input[type="hidden"]');

    expect(hidden).toHaveLength(2);
    for (const el of hidden) {
      expect(el).toHaveAttribute("form", "other");
      expect(el).toBeDisabled();
    }
  });

  // #339
  it("a blur with no edit does not rewrite the range", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    // Deliberately reversed: the old commit-on-every-blur reordered it unasked.
    render(
      <>
        <DateRangePicker
          defaultValue={{ start: new Date(2026, 5, 20), end: new Date(2026, 5, 10) }}
          onValueChange={onValueChange}
        />
        <button type="button">elsewhere</button>
      </>,
    );

    const start = screen.getByRole("textbox", { name: "Start date" });
    await user.click(start);
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(start).toHaveValue(fmt(new Date(2026, 5, 20)));
  });

  // #451
  it("composes the caller's onKeyDown and honours preventDefault", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onKeyDown = vi.fn((e: React.KeyboardEvent) => {
      if (e.key === "Enter") e.preventDefault();
    });
    render(<DateRangePicker onKeyDown={onKeyDown} onValueChange={onValueChange} />);

    const start = screen.getByRole("textbox", { name: "Start date" });
    await user.type(start, "06/10/2026");
    await user.keyboard("{Enter}");

    expect(onKeyDown).toHaveBeenCalled();
    // The caller preempted the commit.
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
