import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Label } from "./Label";
import { Switch } from "./Switch";
import { useForm } from "./use-form";

/**
 * The props React handed the host element. `Omit` is compile-time only, and every
 * key it removes here is a legitimate DOM attribute name that React renders no
 * attribute for and warns nothing about — so this is the only place a key that
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

describe("Switch", () => {
  it("renders with role=switch", () => {
    render(<Switch aria-label="Notifications" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("toggles aria-checked on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Toggle" onCheckedChange={onCheckedChange} />);

    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");

    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it("respects defaultChecked initial state", () => {
    render(<Switch aria-label="Toggle" defaultChecked />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("controlled value stays fixed without a prop change, flips on rerender", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Switch aria-label="Toggle" checked={false} onCheckedChange={onCheckedChange} />
    );

    const sw = screen.getByRole("switch");
    await user.click(sw);
    // Still false — parent did not update the prop.
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);

    rerender(<Switch aria-label="Toggle" checked onCheckedChange={onCheckedChange} />);
    expect(sw).toHaveAttribute("aria-checked", "true");
    // Catching up to the emitted value is not itself a change.
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Toggle" disabled onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("exposes a data-state attribute reflecting checked", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Toggle" />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("data-state", "unchecked");
    await user.click(sw);
    expect(sw).toHaveAttribute("data-state", "checked");
  });

  it("associates with a Label via htmlFor and focuses on label click", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="sw1">Wireless</Label>
        <Switch id="sw1" />
      </>
    );
    await user.click(screen.getByText("Wireless"));
    expect(screen.getByRole("switch")).toHaveFocus();
  });

  it("renders a hidden input reflecting checked when name is set", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <Switch
          aria-label="Toggle"
          name="notify"
          value="yes"
          checked={checked}
          onCheckedChange={setChecked}
        />
      );
    }
    const { container } = render(<Harness />);
    const hidden = () => container.querySelector('input[type="hidden"][name="notify"]');
    // #82 — unchecked submits nothing, exactly like a native checkbox, so
    // `FormData.has("notify")` answers the question it looks like it answers.
    expect(hidden()).toBeNull();
    await user.click(screen.getByRole("switch"));
    expect(hidden()).toHaveValue("yes");
  });

  // #79 / #83
  it("the hidden input is excluded when disabled and carries `form`", () => {
    const { container } = render(
      <Switch aria-label="Toggle" name="notify" value="yes" defaultChecked disabled form="prefs" />,
    );
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="notify"]',
    )!;
    expect(hidden).toBeDisabled();
    expect(hidden).toHaveAttribute("form", "prefs");
  });

  // #79 — the payload a real <form> would send.
  it("a disabled Switch submits nothing", () => {
    render(
      <form aria-label="prefs">
        <Switch aria-label="Toggle" name="notify" value="yes" defaultChecked disabled />
      </form>,
    );
    const data = new FormData(screen.getByRole("form", { name: "prefs" }) as HTMLFormElement);
    expect(data.has("notify")).toBe(false);
  });

  it("applies aria-invalid when error is set", () => {
    render(<Switch aria-label="Toggle" error />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "true");
  });

  describe("caller-supplied props", () => {
    it("reports its own state when the caller passes aria-checked", async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch aria-label="Toggle" aria-checked onCheckedChange={onCheckedChange} />);

      const sw = screen.getByRole("switch", { checked: false });
      expect(sw).toHaveAttribute("aria-checked", "false");

      await user.click(sw);

      expect(screen.getByRole("switch", { checked: true })).toBe(sw);
      expect(onCheckedChange).toHaveBeenCalledTimes(1);
    });

    it("keeps role=switch when the caller passes another role", () => {
      render(<Switch aria-label="Toggle" role="button" />);
      expect(screen.getByRole("switch")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("keeps data-state in sync with the thumb when the caller passes one", async () => {
      const user = userEvent.setup();
      render(<Switch aria-label="Toggle" data-state="checked" />);

      const sw = screen.getByRole("switch");
      expect(sw).toHaveAttribute("data-state", "unchecked");

      await user.click(sw);
      expect(sw).toHaveAttribute("data-state", "checked");
    });

    it("keeps data-size derived from the size prop", () => {
      render(<Switch aria-label="Toggle" size="sm" data-size="md" />);
      expect(screen.getByRole("switch")).toHaveAttribute("data-size", "sm");
    });

    it("wins on aria-invalid when in error, without dropping the caller's aria-describedby", () => {
      render(<Switch aria-label="Toggle" error aria-invalid="false" aria-describedby="hint" />);

      const sw = screen.getByRole("switch");
      expect(sw).toHaveAttribute("aria-invalid", "true");
      expect(sw).toHaveAttribute("aria-describedby", "hint");
    });

    it("keeps the caller's aria-describedby when it has no error of its own", () => {
      render(<Switch aria-label="Toggle" aria-describedby="hint" />);

      const sw = screen.getByRole("switch");
      expect(sw).toHaveAttribute("aria-describedby", "hint");
      expect(sw).not.toHaveAttribute("aria-invalid");
    });

    it("still lets the caller override type", () => {
      render(<Switch aria-label="Toggle" type="submit" />);
      expect(screen.getByRole("switch")).toHaveAttribute("type", "submit");
    });
  });

  describe("omitted props", () => {
    it("a field()-shaped bag's onChange never reaches the <button>", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onCheckedChange = vi.fn();
      // The real `field()` shape — always multi-key. A one-key `{ onChange }` bag
      // is rejected by TS2559 ("no properties in common") and would give a false
      // green.
      const bag = { name: "subscribe", value: "on", onChange, onBlur: vi.fn() };

      render(
        <Switch
          aria-label="Subscribe"
          onCheckedChange={onCheckedChange}
          {...untypedProps(bag)}
        />,
      );
      const sw = screen.getByRole("switch");
      await user.click(sw);

      expect(hostProps(sw)).not.toHaveProperty("onChange");
      expect(onChange).toHaveBeenCalledTimes(0);
      expect(onCheckedChange).toHaveBeenCalledTimes(1);
    });

    it("keeps forwarding the rest props the type does accept", () => {
      const onBlur = vi.fn();
      const bag = { name: "subscribe", value: "yes", onChange: vi.fn(), onBlur };

      const { container } = render(
        <Switch aria-label="Subscribe" defaultChecked {...untypedProps(bag)} />,
      );

      const hidden = container.querySelector('input[type="hidden"][name="subscribe"]');
      expect(hidden).toHaveValue("yes");
      expect(hostProps(screen.getByRole("switch")).onBlur).toBe(onBlur);
    });

    // The binding a Switch actually has. `field()` is not it, and cannot be: it
    // supplies `value` as the field's STATE, while Switch's `value` is the string
    // its hidden input submits. README ("`checked`-based controls are wired via
    // `watch`/`setValue` instead of `field()`") and docs/components/switch.md
    // ("`onChange` is removed outright, because the change channel is
    // `onCheckedChange`") both say so; `onChange?: never` now makes the spread a
    // compile error rather than a dead handler. This is the supported route.
    it("watch/setValue via onCheckedChange writes the store", async () => {
      const user = userEvent.setup();
      const read = vi.fn();

      function Harness() {
        const form = useForm({ defaultValues: { subscribe: false } });
        return (
          <>
            <Switch
              aria-label="Subscribe"
              checked={Boolean(form.watch("subscribe"))}
              onCheckedChange={(v) => form.setValue("subscribe", v)}
            />
            <button type="button" onClick={() => read(form.getValues())}>
              read
            </button>
          </>
        );
      }
      render(<Harness />);

      await user.click(screen.getByRole("switch"));
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
      await user.click(screen.getByRole("button", { name: "read" }));

      expect(read).toHaveBeenCalledTimes(1);
      expect(read.mock.calls[0][0]).toEqual({ subscribe: true });
    });
  });
});
