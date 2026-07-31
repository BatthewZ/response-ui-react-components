import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type KeyboardEvent, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { NumberInput } from "./NumberInput";
import { useForm } from "./use-form";

describe("NumberInput", () => {
  it("renders a spinbutton", () => {
    render(<NumberInput aria-label="Qty" />);
    expect(screen.getByRole("spinbutton", { name: "Qty" })).toBeInTheDocument();
  });

  it("typing '1.' does not emit NaN", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="Qty" onValueChange={onValueChange} />);

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.type(input, "1.");
    // Draft holds "1." but nothing is committed mid-typing.
    expect(input).toHaveValue("1.");
    expect(onValueChange).not.toHaveBeenCalledWith(NaN);
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });

  it("clamps to min/max on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" min={0} max={10} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.type(input, "99");
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(10);
    expect(input).toHaveValue("10");
  });

  it("clamps below min on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" min={5} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.type(input, "1");
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(5);
  });

  it("rounds to precision on commit", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" precision={2} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.type(input, "1.005");
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(input).toHaveValue("1");
  });

  it("steps up via the up button", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" defaultValue={1} step={2} onValueChange={onValueChange} />
    );

    const buttons = screen.getAllByRole("button", { hidden: true });
    await user.click(buttons[0]);
    expect(onValueChange).toHaveBeenLastCalledWith(3);
  });

  it("steps down via the down button", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" defaultValue={5} onValueChange={onValueChange} />
    );

    const buttons = screen.getAllByRole("button", { hidden: true });
    await user.click(buttons[1]);
    expect(onValueChange).toHaveBeenLastCalledWith(4);
  });

  it("steps with ArrowUp / ArrowDown", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" defaultValue={0} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    input.focus();
    await user.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenLastCalledWith(-1);
  });

  it("emits null when cleared", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" defaultValue={5} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.clear(input);
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input).toHaveValue("");
  });

  it("renders a controlled value", () => {
    render(<NumberInput aria-label="Qty" value={42} onValueChange={vi.fn()} />);
    const input = screen.getByRole("spinbutton", { name: "Qty" });
    expect(input).toHaveValue("42");
    expect(input).toHaveAttribute("aria-valuenow", "42");
  });

  it("updates when the controlled value prop changes", () => {
    const { rerender } = render(
      <NumberInput aria-label="Qty" value={1} onValueChange={vi.fn()} />
    );
    expect(screen.getByRole("spinbutton", { name: "Qty" })).toHaveValue("1");
    rerender(<NumberInput aria-label="Qty" value={7} onValueChange={vi.fn()} />);
    expect(screen.getByRole("spinbutton", { name: "Qty" })).toHaveValue("7");
  });

  it("forwards ref to the input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<NumberInput ref={ref} aria-label="Qty" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  describe("regressions", () => {
    it("#426 keeps the store numeric when bound via the form.field() spread", async () => {
      const user = userEvent.setup();
      const seen: { values: { qty: number | null } } = { values: { qty: 5 } };
      function Harness() {
        const form = useForm({ defaultValues: { qty: 5 as number | null } });
        seen.values = form.getValues();
        return (
          <form {...form.props}>
            <NumberInput aria-label="Qty" {...form.field<number | null>("qty")} />
          </form>
        );
      }
      render(<Harness />);
      const input = screen.getByRole("spinbutton", { name: "Qty" });

      await user.type(input, "7");
      // Today the spread's `onChange` replaces the draft setter, so the raw DOM
      // event value is written into a numeric field: {"qty":"57"} — a string,
      // and a concatenation of the store value with the keystroke.
      expect(typeof seen.values.qty).toBe("number");
      expect(seen.values.qty).toBe(5); // typing alone must not commit

      await user.tab();
      expect(typeof seen.values.qty).toBe("number");
      expect(seen.values.qty).toBe(57);
      expect(input).toHaveValue("57");
    });

    it("#426 composes the caller's onKeyDown/onBlur rather than running past them", async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn((e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp") e.preventDefault();
      });
      const onBlur = vi.fn();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          defaultValue={1}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      input.focus();
      await user.keyboard("{ArrowUp}");
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      // The caller ran first and cancelled the event, so the component's own
      // stepping must not run.
      expect(onValueChange).toHaveBeenCalledTimes(0);
      expect(input).toHaveValue("1");

      await user.tab();
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it("#237 does not re-emit once clamped at a bound (buttons)", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          defaultValue={9}
          max={10}
          onValueChange={onValueChange}
        />
      );

      const [up] = screen.getAllByRole("button", { hidden: true });
      await user.click(up);
      await user.click(up);
      await user.click(up);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(10);
      expect(screen.getByRole("spinbutton", { name: "Qty" })).toHaveValue("10");
    });

    it("#237 does not re-emit once clamped at a bound (ArrowUp)", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          defaultValue={10}
          max={10}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      input.focus();
      await user.keyboard("{ArrowUp}{ArrowUp}");
      expect(onValueChange).toHaveBeenCalledTimes(0);
      expect(input).toHaveValue("10");
    });

    it("#236 first step from an empty field lands on min itself", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          min={10}
          max={20}
          step={1}
          onValueChange={onValueChange}
        />
      );

      const [up] = screen.getAllByRole("button", { hidden: true });
      await user.click(up);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(10);
      expect(screen.getByRole("spinbutton", { name: "Qty" })).toHaveValue("10");
    });

    it("#236 ArrowUp from an empty field lands on min, then steps from it", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          min={16}
          step={0.5}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      input.focus();
      await user.keyboard("{ArrowUp}");
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(16);
      await user.keyboard("{ArrowUp}");
      expect(onValueChange).toHaveBeenCalledTimes(2);
      expect(onValueChange).toHaveBeenLastCalledWith(16.5);
      expect(input).toHaveValue("16.5");
    });

    it("#231 steps from the uncommitted draft, not the last committed value", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          defaultValue={1}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      await user.clear(input);
      await user.type(input, "42");

      const [up, down] = screen.getAllByRole("button", { hidden: true });
      await user.click(up);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(43);
      expect(input).toHaveValue("43");

      await user.click(down);
      expect(onValueChange).toHaveBeenCalledTimes(2);
      expect(onValueChange).toHaveBeenLastCalledWith(42);
    });

    it("#231 ArrowUp steps from the uncommitted draft", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          defaultValue={1}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      await user.clear(input);
      await user.type(input, "7");
      await user.keyboard("{ArrowUp}");
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(8);
      expect(input).toHaveValue("8");
    });

    it("#232 re-syncs the draft when a controlled parent refuses the value", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      function Parent() {
        const [value, setValue] = useState<number | null>(5);
        return (
          <NumberInput
            aria-label="Qty"
            value={value}
            onValueChange={(next) => {
              onValueChange(next);
              // Refuses anything above 5: re-renders the same value back.
              setValue(Math.min(next ?? 0, 5));
            }}
          />
        );
      }
      render(<Parent />);

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      const [up] = screen.getAllByRole("button", { hidden: true });
      await user.click(up);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(6);
      // The prop never changed, so an identity-gated reconcile leaves the
      // refused 6 on screen forever.
      expect(input).toHaveValue("5");
      expect(input).toHaveAttribute("aria-valuenow", "5");

      // Same again, but stepping from text the user typed and never committed.
      await user.clear(input);
      await user.type(input, "40");
      await user.click(up);
      expect(onValueChange).toHaveBeenCalledTimes(2);
      expect(onValueChange).toHaveBeenLastCalledWith(41);
      expect(input).toHaveValue("5");
      expect(input).toHaveAttribute("aria-valuenow", "5");
    });

    it("#232 re-syncs typed text a controlled parent refuses", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      function Parent() {
        const [value, setValue] = useState<number | null>(5);
        return (
          <NumberInput
            aria-label="Qty"
            value={value}
            onValueChange={(next) => {
              onValueChange(next);
              setValue(Math.min(next ?? 0, 5));
            }}
          />
        );
      }
      render(<Parent />);

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      await user.clear(input);
      await user.type(input, "99");
      await user.keyboard("{Enter}");
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(99);
      expect(input).toHaveValue("5");
      expect(input).toHaveAttribute("aria-valuenow", "5");
    });

    it("#235 rejects hexadecimal text that Number() would accept", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          defaultValue={5}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      await user.clear(input);
      await user.type(input, "0x1f");
      await user.tab();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(null);
      expect(input).toHaveValue("");
      expect(input).not.toHaveAttribute("aria-valuenow");
    });

    it("#235 rejects Infinity and an overflowing exponent", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          defaultValue={5}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      await user.clear(input);
      await user.type(input, "Infinity");
      await user.keyboard("{Enter}");
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(null);
      expect(input).toHaveValue("");
      expect(input).not.toHaveAttribute("aria-valuenow");

      // Shaped like a decimal, but overflows to Infinity — the second guard.
      await user.type(input, "1e400");
      await user.keyboard("{Enter}");
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(input).toHaveValue("");
      expect(input).not.toHaveAttribute("aria-valuenow");
    });

    it("#235 still accepts signed decimals and surrounding whitespace", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<NumberInput aria-label="Qty" onValueChange={onValueChange} />);

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      await user.type(input, " -1.5 ");
      await user.tab();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(-1.5);
      expect(input).toHaveValue("-1.5");
    });
  });
  describe("readOnly is a real read-only (#233)", () => {
    it("reports itself read-only to assistive tech", () => {
      render(<NumberInput aria-label="Qty" defaultValue={5} readOnly />);

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      expect(input).toHaveAttribute("readonly");
      expect(input).toHaveAttribute("aria-readonly", "true");
    });

    it("does not step on Arrow keys", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <NumberInput
          aria-label="Qty"
          defaultValue={5}
          readOnly
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByRole("spinbutton", { name: "Qty" });
      input.focus();
      await user.keyboard("{ArrowUp}{ArrowDown}");

      expect(onValueChange).not.toHaveBeenCalled();
      expect(input).toHaveValue("5");
    });

    it("disables the steppers", () => {
      const { container } = render(
        <NumberInput aria-label="Qty" defaultValue={5} readOnly />
      );

      for (const button of container.querySelectorAll("button")) {
        expect(button).toBeDisabled();
      }
    });
  });

  describe("the reserved stepper column (#234)", () => {
    it("reserves exactly the column the chevrons occupy", () => {
      const { container } = render(<NumberInput aria-label="Qty" />);

      const wrapper = container.querySelector(".relative") as HTMLElement;
      // 14px chevron plus the button's own px-r5 on each side.
      expect(wrapper.style.getPropertyValue("--numberinput-stepper")).toBe(
        "calc(14px + 2 * var(--R-SIZE-5))"
      );
      expect(
        screen.getByRole("spinbutton", { name: "Qty" }).className
      ).toContain("pr-[var(--numberinput-stepper)]");
    });
  });

  describe("classNames slots", () => {
    /** The two stepper `<button>`s, in document order (up, then down). */
    const steppers = (container: HTMLElement) =>
      Array.from(container.querySelectorAll("button"));

    /**
     * The slot-override test for `classNames.chevron`, and the falsifier for it:
     * delete either `cn()` merge on the stepper buttons and this must go red.
     * It asserts *both* buttons, because the key names the pair.
     */
    it("lands classNames.chevron on both steppers, beside the base classes", () => {
      const { container } = render(
        <NumberInput aria-label="Qty" classNames={{ chevron: "bg-surface-1" }} />
      );
      const [up, down] = steppers(container);
      expect(up.className).toContain("rounded-tr-md");
      expect(up.className).toContain("bg-surface-1");
      expect(down.className).toContain("rounded-br-md");
      expect(down.className).toContain("bg-surface-1");
    });

    it("leaves the steppers on their base classes alone when no slot is passed", () => {
      const { container } = render(<NumberInput aria-label="Qty" />);
      const [up, down] = steppers(container);
      expect(up.className).toBe(
        "flex flex-1 items-center justify-center px-r5 text-fg-secondary hover:bg-surface-2 active:bg-surface-3 rounded-tr-md duration-fast disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      );
      expect(down.className).toBe(
        "flex flex-1 items-center justify-center px-r5 text-fg-secondary hover:bg-surface-2 active:bg-surface-3 rounded-br-md duration-fast disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      );
    });

    it("does not put the slot class on the input or the wrapper", () => {
      const { container } = render(
        <NumberInput aria-label="Qty" classNames={{ chevron: "bg-surface-1" }} />
      );
      expect(
        screen.getByRole("spinbutton", { name: "Qty" }).className
      ).not.toContain("bg-surface-1");
      expect(container.firstElementChild?.getAttribute("class")).toBe("relative");
    });

    /**
     * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
     * compile error. It fails if TypeScript ever stops rejecting the key.
     */
    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        // @ts-expect-error — `stepper` is not a slot; only untyped JS gets here.
        <NumberInput aria-label="Qty" classNames={{ stepper: "bg-surface-1" }} />
      );
      expect(steppers(container)[0].className).not.toContain("bg-surface-1");
    });

    it("does not leak classNames onto the DOM", () => {
      const { container } = render(
        <NumberInput aria-label="Qty" classNames={{ chevron: "bg-surface-1" }} />
      );
      expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
      expect(
        screen.getByRole("spinbutton", { name: "Qty" }).hasAttribute("classnames")
      ).toBe(false);
    });

    /**
     * The pin on the (a) ruling for the two wrappers: `className` goes to the
     * `<input>` (documented in `number-input.md`), the outer box carries only the
     * positioning context, and the stepper column only the reservation geometry.
     * If the house rule is ever applied here, this is the test to rewrite rather
     * than delete.
     */
    it("leaves both wrappers on their own classes only", () => {
      const { container } = render(
        <NumberInput aria-label="Qty" className="w-32" />
      );
      expect(container.firstElementChild?.getAttribute("class")).toBe("relative");
      expect(
        container.querySelector(".relative > div")?.getAttribute("class")
      ).toBe("absolute inset-y-0 right-0 flex flex-col");
      expect(
        screen.getByRole("spinbutton", { name: "Qty" }).className
      ).toContain("w-32");
    });
  });
});
