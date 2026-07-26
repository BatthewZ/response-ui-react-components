import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { formatDate } from "../../util/date";
import { DatePicker } from "./DatePicker";
import { Field } from "./Field";
import { useForm } from "./use-form";

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

  it("exposes a machine-readable ISO value via a hidden input for form submission", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DatePicker name="dob" defaultValue={new Date(2026, 0, 5)} aria-label="Date" />,
    );

    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="dob"]');
    expect(hidden).not.toBeNull();
    expect(hidden!.value).toBe("2026-01-05");
    // The visible text input must not carry the name (it would submit a localized string).
    const input = screen.getByRole("textbox", { name: "Date" });
    expect(input).not.toHaveAttribute("name");

    await user.clear(input);
    await user.keyboard("{Enter}");
    expect(hidden!.value).toBe("");
  });

  it("renders no hidden input when name is omitted", () => {
    const { container } = render(<DatePicker defaultValue={new Date(2026, 0, 5)} aria-label="Date" />);
    expect(container.querySelector('input[type="hidden"]')).toBeNull();
  });

  it("round-trips a textual-month format on blur (does not revert)", async () => {
    const user = userEvent.setup();
    const formatOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    render(
      <>
        <DatePicker formatOptions={formatOptions} aria-label="Date" />
        <button type="button">elsewhere</button>
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Date" });
    await user.type(input, "June 13, 2026");
    await user.click(screen.getByText("elsewhere"));

    // Before the fix the digit-only parser saw "June 13, 2026" as invalid and reverted to "".
    expect((input as HTMLInputElement).value).toBe(
      formatDate(new Date(2026, 5, 13), LOCALE, formatOptions),
    );
  });

  it("clears the value via the clear button when clearable", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker clearable defaultValue={new Date(2026, 3, 12)} onValueChange={onValueChange} aria-label="Date" />,
    );

    const input = screen.getByRole("textbox", { name: "Date" });
    expect((input as HTMLInputElement).value).toBe(fmt(new Date(2026, 3, 12)));

    await user.click(screen.getByRole("button", { name: "Clear date" }));
    // Clearing commits once; the refocus it performs must not commit again.
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(null);
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("shows no clear button when there is no value", () => {
    render(<DatePicker clearable aria-label="Date" />);
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
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

  describe("draft vs committed value", () => {
    it("#324 a blur that edits nothing commits nothing", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <DatePicker
            defaultValue={new Date(2026, 5, 10)}
            onValueChange={onValueChange}
            aria-label="Date"
          />
          <button type="button">elsewhere</button>
        </>,
      );

      const input = screen.getByRole("textbox", { name: "Date" });
      const elsewhere = screen.getByText("elsewhere");

      await user.click(input);
      await user.click(elsewhere);
      expect(onValueChange).toHaveBeenCalledTimes(0);

      await user.click(input);
      await user.click(elsewhere);
      expect(onValueChange).toHaveBeenCalledTimes(0);
      expect((input as HTMLInputElement).value).toBe(fmt(new Date(2026, 5, 10)));
    });

    it("#324 an untouched empty field commits nothing on blur", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <DatePicker onValueChange={onValueChange} aria-label="Date" />
          <button type="button">elsewhere</button>
        </>,
      );

      await user.click(screen.getByRole("textbox", { name: "Date" }));
      await user.click(screen.getByText("elsewhere"));
      expect(onValueChange).toHaveBeenCalledTimes(0);
    });

    it("#324 a real edit after a no-op blur still commits exactly once", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <DatePicker
            defaultValue={new Date(2026, 5, 10)}
            onValueChange={onValueChange}
            aria-label="Date"
          />
          <button type="button">elsewhere</button>
        </>,
      );

      const input = screen.getByRole("textbox", { name: "Date" });
      const elsewhere = screen.getByText("elsewhere");

      await user.click(input);
      await user.click(elsewhere);

      await user.clear(input);
      await user.type(input, "06/11/2026");
      await user.click(elsewhere);

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect((onValueChange.mock.calls[0][0] as Date).getDate()).toBe(11);
    });

    it("#325 an inline value={new Date(…)} does not wipe in-progress typing", async () => {
      const user = userEvent.setup();
      let bump = () => {};
      function Harness() {
        const [, setTick] = useState(0);
        bump = () => setTick((t) => t + 1);
        // The natural-looking controlled form: a fresh Date object every render.
        return <DatePicker value={new Date(2026, 0, 15)} aria-label="Date" />;
      }
      render(<Harness />);

      const input = screen.getByRole("textbox", { name: "Date" });
      expect((input as HTMLInputElement).value).toBe(fmt(new Date(2026, 0, 15)));

      await user.clear(input);
      await user.type(input, "12/25/20");

      // An unrelated parent re-render — no blur, no value change.
      act(() => bump());

      expect((input as HTMLInputElement).value).toBe("12/25/20");
    });

    it("#325 a controlled value that really moves still reseeds the field", async () => {
      const user = userEvent.setup();
      function Harness() {
        const [value, setValue] = useState(new Date(2026, 0, 15));
        return (
          <>
            <DatePicker value={value} aria-label="Date" />
            <button type="button" onClick={() => setValue(new Date(2026, 8, 9))}>
              move
            </button>
          </>
        );
      }
      render(<Harness />);

      const input = screen.getByRole("textbox", { name: "Date" });
      await user.click(screen.getByText("move"));
      expect((input as HTMLInputElement).value).toBe(fmt(new Date(2026, 8, 9)));
    });
  });

  describe("form.field() binding (#429)", () => {
    it("#429 binds via the advertised form.field() spread without crashing", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      let values: { when: Date | null } = { when: null };
      function Harness() {
        const form = useForm({ defaultValues: { when: null as Date | null } });
        values = form.getValues();
        return (
          <form {...form.props}>
            <DatePicker
              aria-label="When"
              onValueChange={onValueChange}
              {...form.field<Date | null>("when")}
            />
          </form>
        );
      }
      render(<Harness />);

      const input = screen.getByRole("textbox", { name: "When" });
      await user.type(input, "12/25/2026");
      await user.keyboard("{Enter}");

      expect((input as HTMLInputElement).value).toBe(fmt(new Date(2026, 11, 25)));
      // The store must hold a Date, not the raw DOM ChangeEvent's target.value.
      const committed = values.when;
      expect(committed).toBeInstanceOf(Date);
      expect(committed?.getFullYear()).toBe(2026);
      expect(committed?.getMonth()).toBe(11);
      expect(committed?.getDate()).toBe(25);
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    it("#429 clearing through a form.field() spread writes null, not an empty string", async () => {
      const user = userEvent.setup();
      let values: { when: Date | null } = { when: null };
      function Harness() {
        const form = useForm({
          defaultValues: { when: new Date(2026, 3, 12) as Date | null },
        });
        values = form.getValues();
        return (
          <form {...form.props}>
            <DatePicker clearable aria-label="When" {...form.field<Date | null>("when")} />
          </form>
        );
      }
      render(<Harness />);

      await user.click(screen.getByRole("button", { name: "Clear date" }));
      expect(values.when).toBeNull();
    });

    it("#434 keeps its computed aria-invalid under a field() spread", () => {
      function Harness() {
        const form = useForm({ defaultValues: { when: null as Date | null } });
        return (
          <form {...form.props}>
            <Field error="Required">
              <DatePicker aria-label="When" {...form.field<Date | null>("when")} />
            </Field>
          </form>
        );
      }
      render(<Harness />);
      // field() always emits `"aria-invalid": undefined`; spread last it erased
      // the Field-derived "true".
      expect(screen.getByRole("textbox", { name: "When" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("#434 keeps a caller's aria-invalid when it has no error of its own", () => {
      render(<DatePicker aria-label="Date" aria-invalid />);
      expect(screen.getByRole("textbox", { name: "Date" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("#434 sets no aria-invalid when neither side has an opinion", () => {
      render(<DatePicker aria-label="Date" />);
      expect(screen.getByRole("textbox", { name: "Date" })).not.toHaveAttribute(
        "aria-invalid",
      );
    });
  });
});
