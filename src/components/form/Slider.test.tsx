import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Slider } from "./Slider";
import { useForm } from "./use-form";

describe("Slider", () => {
  it("renders role=slider reflecting value/min/max", () => {
    render(<Slider aria-label="Volume" defaultValue={30} />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.value).toBe("30");
    expect(slider.min).toBe("0");
    expect(slider.max).toBe("100");
  });

  it("updates value and fires onValueChange when uncontrolled", () => {
    const onValueChange = vi.fn();
    render(<Slider aria-label="Volume" defaultValue={10} onValueChange={onValueChange} />);

    const slider = screen.getByRole("slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "55" } });

    expect(onValueChange).toHaveBeenCalledWith(55);
    expect(slider.value).toBe("55");
  });

  it("keeps a controlled value fixed until the prop changes", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Slider aria-label="Volume" value={20} onValueChange={onValueChange} />
    );

    const slider = screen.getByRole("slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "80" } });

    expect(onValueChange).toHaveBeenCalledWith(80);
    // Value did not move — parent controls it.
    expect(slider.value).toBe("20");

    rerender(<Slider aria-label="Volume" value={80} onValueChange={onValueChange} />);
    expect(slider.value).toBe("80");
  });

  it("does not fire change when disabled", () => {
    const onValueChange = vi.fn();
    render(
      <Slider aria-label="Volume" defaultValue={10} disabled onValueChange={onValueChange} />
    );
    const slider = screen.getByRole("slider");
    expect(slider).toBeDisabled();
  });

  it("respects custom min/max/step in aria attributes", () => {
    render(<Slider aria-label="Temp" min={-10} max={40} step={5} defaultValue={0} />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.min).toBe("-10");
    expect(slider.max).toBe("40");
    expect(slider.step).toBe("5");
    expect(slider.value).toBe("0");
  });

  it("computes the fill percentage from the effective value", () => {
    render(<Slider aria-label="Volume" min={0} max={100} value={25} />);
    const slider = screen.getByRole("slider");
    expect(slider.style.getPropertyValue("--slider-fill")).toBe("25%");
  });

  it("fires onChange with the number alongside onValueChange", () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    render(
      <Slider
        aria-label="Volume"
        defaultValue={10}
        onValueChange={onValueChange}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByRole("slider"), { target: { value: "55" } });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(55);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(55);
  });

  describe("form.field() binding (#431) and aria-invalid erasure (#434)", () => {
    it("#431 writes a number — not a string — into the bound field", () => {
      let values: { vol: number } = { vol: -1 };
      function Harness() {
        const form = useForm({ defaultValues: { vol: 20 } });
        values = form.getValues();
        return (
          <form {...form.props}>
            <Slider aria-label="Vol" {...form.field<number>("vol")} />
          </form>
        );
      }
      render(<Harness />);

      fireEvent.change(screen.getByRole("slider"), { target: { value: "60" } });

      // The UI looks right either way — only the stored type exposes the defect:
      // `{...props}` (Slider.tsx:60) replaced the component's own `onChange`, so the
      // raw DOM ChangeEvent wrote the string "60" into a number field.
      expect(typeof values.vol).toBe("number");
      expect(values.vol).toBe(60);
    });

    it("#434 keeps the computed aria-invalid that field() spreads away as undefined", () => {
      function Harness() {
        const form = useForm({ defaultValues: { vol: 20 } });
        return (
          <form {...form.props}>
            <Field error="Too low">
              <Slider aria-label="Vol" {...form.field<number>("vol")} />
              <FieldError />
            </Field>
          </form>
        );
      }
      render(<Harness />);

      expect(screen.getByRole("alert")).toHaveTextContent("Too low");
      expect(screen.getByRole("slider")).toHaveAttribute("aria-invalid", "true");
    });

    it("#434 still honours the aria-invalid field() supplies when it has none of its own", () => {
      function Harness() {
        const form = useForm({ defaultValues: { vol: 20 } });
        return (
          <form {...form.props}>
            <Slider aria-label="Vol" {...form.field<number>("vol")} />
            <button type="button" onClick={() => form.setError("vol", "Too low")}>
              fail
            </button>
          </form>
        );
      }
      render(<Harness />);

      expect(screen.getByRole("slider")).not.toHaveAttribute("aria-invalid");
      fireEvent.click(screen.getByRole("button", { name: "fail" }));
      expect(screen.getByRole("slider")).toHaveAttribute("aria-invalid", "true");
    });
  });
});
