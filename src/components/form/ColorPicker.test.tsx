import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ColorPicker } from "./ColorPicker";
import { useForm } from "./use-form";

function Harness({ onValueChange }: { onValueChange?: (hex: string) => void }) {
  const [value, setValue] = useState("#3366cc");
  return (
    <ColorPicker
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      presets={["#ff0000", "#00ff00"]}
    />
  );
}

describe("ColorPicker", () => {
  it("shows the current hex on the trigger", () => {
    render(<ColorPicker defaultValue="#abcdef" />);
    expect(screen.getByRole("button", { name: "Choose color" })).toHaveTextContent(
      "#abcdef",
    );
  });

  it("normalizes the initial value", () => {
    render(<ColorPicker defaultValue="#ABC" />);
    expect(screen.getByRole("button", { name: "Choose color" })).toHaveTextContent(
      "#aabbcc",
    );
  });

  it("opens the panel on trigger click", async () => {
    const user = userEvent.setup();
    render(<ColorPicker defaultValue="#3366cc" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose color" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Hex value")).toHaveValue("#3366cc");
  });

  it("commits a typed hex value on Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));

    const hexField = screen.getByLabelText("Hex value");
    fireEvent.change(hexField, { target: { value: "#ff8800" } });
    fireEvent.keyDown(hexField, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith("#ff8800");
  });

  it("reverts an invalid hex entry on blur", async () => {
    const user = userEvent.setup();
    render(<ColorPicker defaultValue="#3366cc" />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));

    const hexField = screen.getByLabelText("Hex value") as HTMLInputElement;
    fireEvent.change(hexField, { target: { value: "nonsense" } });
    fireEvent.blur(hexField);
    expect(hexField.value).toBe("#3366cc");
  });

  it("selects a preset swatch", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));
    await user.click(screen.getByRole("button", { name: "#ff0000" }));
    expect(onValueChange).toHaveBeenLastCalledWith("#ff0000");
  });

  it("changes hue via the hue rail", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));

    fireEvent.change(screen.getByLabelText("Hue"), { target: { value: "0" } });
    // Hue 0 at this saturation/value yields a red-dominant hex.
    expect(onValueChange).toHaveBeenCalled();
    const lastHex = onValueChange.mock.lastCall?.[0] as string;
    expect(lastHex.startsWith("#")).toBe(true);
  });

  it("adjusts saturation/brightness with arrow keys", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));

    const sv = screen.getByLabelText("Saturation and brightness");
    sv.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalled();
  });

  describe("form.field() binding (#285)", () => {
    it("binds via the advertised form.field() spread and commits edits", async () => {
      const user = userEvent.setup();
      let values: { brand: string } | null = null;
      function FieldHarness() {
        const form = useForm({ defaultValues: { brand: "#3366cc" } });
        values = form.getValues();
        return (
          <form {...form.props}>
            <ColorPicker {...form.field<string>("brand")} presets={["#ff0000"]} />
          </form>
        );
      }
      render(<FieldHarness />);

      await user.click(screen.getByRole("button", { name: "Choose color" }));
      await user.click(screen.getByRole("button", { name: "#ff0000" }));

      // Today: the props type is closed and nothing is spread, so `onChange` is
      // dropped on the floor — the store never hears the edit and the controlled
      // `value` never moves, leaving a permanently inert control.
      expect(values).toEqual({ brand: "#ff0000" });
      expect(screen.getByRole("button", { name: "Choose color" })).toHaveTextContent(
        "#ff0000",
      );
    });

    it("fires onChange with the canonical hex alongside onValueChange", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onValueChange = vi.fn();
      render(
        <ColorPicker
          defaultValue="#3366cc"
          presets={["#ff0000"]}
          onChange={onChange}
          onValueChange={onValueChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Choose color" }));
      await user.click(screen.getByRole("button", { name: "#ff0000" }));

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith("#ff0000");
    });

    it("lands rest props on the trigger button, and onChange on no element at all", () => {
      render(
        <ColorPicker
          defaultValue="#3366cc"
          id="brand-trigger"
          name="brand"
          data-slot="colour"
          onChange={vi.fn()}
        />,
      );

      const trigger = screen.getByRole("button", { name: "Choose color" });
      expect(trigger).toHaveAttribute("id", "brand-trigger");
      expect(trigger).toHaveAttribute("name", "brand");
      expect(trigger).toHaveAttribute("data-slot", "colour");
      // The value-typed onChange is not a DOM ChangeEvent handler and must never
      // be handed to an element.
      expect(trigger.closest(".colorpicker")).not.toHaveAttribute("id");
      expect(trigger.outerHTML).not.toContain("onchange");
    });

    it("runs the caller's onBlur without displacing the floating-ui wiring", async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn();
      render(<ColorPicker defaultValue="#3366cc" onBlur={onBlur} />);

      const trigger = screen.getByRole("button", { name: "Choose color" });
      await user.click(trigger);
      // The click still opens the panel (getReferenceProps kept its handler)…
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      trigger.blur();
      // …and the caller's own handler still ran.
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it("keeps a caller's aria-invalid when it has no opinion of its own (#434)", () => {
      const bindings: { "aria-invalid": true | undefined } = { "aria-invalid": true };
      render(<ColorPicker defaultValue="#3366cc" {...bindings} />);
      expect(screen.getByRole("button", { name: "Choose color" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("is not erased by field()'s always-present `aria-invalid: undefined` (#434)", () => {
      // field() emits the key on every render, valid or not. A plain
      // `{...props}` spread after the computed error props would let that
      // `undefined` delete the component's own opinion.
      const bindings: { "aria-invalid": true | undefined } = { "aria-invalid": undefined };
      render(<ColorPicker defaultValue="#3366cc" error {...bindings} />);
      expect(screen.getByRole("button", { name: "Choose color" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  });
});
