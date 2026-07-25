import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { RangeSlider, type RangeSliderValue } from "./RangeSlider";
import { useForm } from "./use-form";

describe("RangeSlider", () => {
  it("renders two range thumbs reflecting the value pair", () => {
    render(<RangeSlider defaultValue={[20, 80]} minLabel="Low" maxLabel="High" />);
    const low = screen.getByLabelText("Low") as HTMLInputElement;
    const high = screen.getByLabelText("High") as HTMLInputElement;
    expect(low.value).toBe("20");
    expect(high.value).toBe("80");
  });

  it("updates the lower thumb and fires onValueChange when uncontrolled", () => {
    const onValueChange = vi.fn();
    render(
      <RangeSlider defaultValue={[20, 80]} minLabel="Low" maxLabel="High" onValueChange={onValueChange} />,
    );
    fireEvent.change(screen.getByLabelText("Low"), { target: { value: "35" } });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith([35, 80]);
  });

  it("updates the upper thumb independently", () => {
    const onValueChange = vi.fn();
    render(
      <RangeSlider defaultValue={[20, 80]} minLabel="Low" maxLabel="High" onValueChange={onValueChange} />,
    );
    fireEvent.change(screen.getByLabelText("High"), { target: { value: "60" } });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith([20, 60]);
    // Moving one thumb must not re-emit for its sibling.
    expect(screen.getByLabelText<HTMLInputElement>("Low").value).toBe("20");
  });

  it("clamps the lower thumb so it cannot cross the upper (respecting minDistance)", () => {
    const onValueChange = vi.fn();
    render(
      <RangeSlider
        defaultValue={[20, 50]}
        minDistance={10}
        minLabel="Low"
        maxLabel="High"
        onValueChange={onValueChange}
      />,
    );
    // Try to drag low up to 90 — it must stop at high(50) - minDistance(10) = 40.
    fireEvent.change(screen.getByLabelText("Low"), { target: { value: "90" } });
    // One clamp, one emission — not an emission per intermediate value.
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith([40, 50]);
  });

  it("clamps the upper thumb so it cannot cross the lower", () => {
    const onValueChange = vi.fn();
    render(
      <RangeSlider defaultValue={[40, 70]} minLabel="Low" maxLabel="High" onValueChange={onValueChange} />,
    );
    fireEvent.change(screen.getByLabelText("High"), { target: { value: "10" } });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith([40, 40]);
  });

  it("keeps a controlled value fixed until the prop changes", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <RangeSlider value={[20, 80]} minLabel="Low" maxLabel="High" onValueChange={onValueChange} />,
    );
    const low = screen.getByLabelText("Low") as HTMLInputElement;
    fireEvent.change(low, { target: { value: "35" } });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith([35, 80]);
    expect(low.value).toBe("20"); // parent controls it

    rerender(
      <RangeSlider value={[35, 80]} minLabel="Low" maxLabel="High" onValueChange={onValueChange} />,
    );
    expect(low.value).toBe("35");
    // Catching up to the emitted value is not itself a change.
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("exposes the fill geometry as CSS custom properties", () => {
    const { container } = render(<RangeSlider value={[25, 75]} min={0} max={100} />);
    const root = container.querySelector(".range-slider") as HTMLElement;
    expect(root.style.getPropertyValue("--range-lo")).toBe("25%");
    expect(root.style.getPropertyValue("--range-hi")).toBe("25%"); // 100 - 75
  });

  it("keeps the actively dragged lower thumb on top so the drag never hands off mid-gesture", () => {
    render(<RangeSlider defaultValue={[10, 90]} minLabel="Low" maxLabel="High" />);
    const low = screen.getByLabelText("Low") as HTMLInputElement;
    // Below the midpoint the idle heuristic leaves the lower thumb underneath…
    expect(low.style.zIndex).toBe("");
    // …but grabbing it raises it for the whole drag — even as it crosses the
    // midpoint — so the z-index never flips mid-gesture.
    fireEvent.pointerDown(low);
    expect(low.style.zIndex).toBe("4");
    fireEvent.pointerUp(low);
    expect(low.style.zIndex).toBe("");
  });

  it("re-pins the native thumb at the boundary instead of letting it drift past", () => {
    const onValueChange = vi.fn();
    render(
      <RangeSlider
        defaultValue={[30, 50]}
        minDistance={10}
        minLabel="Low"
        maxLabel="High"
        onValueChange={onValueChange}
      />,
    );
    const low = screen.getByLabelText("Low") as HTMLInputElement;
    // First push raises the lower thumb to the wall: high(50) - minDistance(10) = 40.
    fireEvent.change(low, { target: { value: "45" } });
    expect(onValueChange).toHaveBeenLastCalledWith([40, 50]);

    // Dragging further must not fire again, and the DOM thumb must stay pinned
    // at the boundary rather than drift to the dragged-to value.
    onValueChange.mockClear();
    fireEvent.change(low, { target: { value: "48" } });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(low.value).toBe("40");
  });

  it("disables both thumbs when disabled", () => {
    render(<RangeSlider defaultValue={[10, 90]} minLabel="Low" maxLabel="High" disabled />);
    expect(screen.getByLabelText("Low")).toBeDisabled();
    expect(screen.getByLabelText("High")).toBeDisabled();
  });

  it("fires onChange with the tuple alongside onValueChange", () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    render(
      <RangeSlider
        defaultValue={[20, 80]}
        minLabel="Low"
        maxLabel="High"
        onValueChange={onValueChange}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Low"), { target: { value: "35" } });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith([35, 80]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([35, 80]);
  });

  describe("form.field() binding (#432) and aria-invalid erasure (#434)", () => {
    it("#432 writes the tuple — not a string — into the bound field", () => {
      let values: { span: RangeSliderValue } = { span: [-1, -1] };
      function Harness() {
        const form = useForm({ defaultValues: { span: [20, 80] as RangeSliderValue } });
        values = form.getValues();
        return (
          <form {...form.props}>
            <RangeSlider
              minLabel="Low"
              maxLabel="High"
              {...form.field<RangeSliderValue>("span")}
            />
          </form>
        );
      }
      render(<Harness />);

      fireEvent.change(screen.getByLabelText("Low"), { target: { value: "35" } });

      // `{...props}` (RangeSlider.tsx:137) put field()'s onChange on the container, so
      // the bubbled DOM ChangeEvent wrote the string "35" over the tuple. `const
      // [lo, hi] = current` then destructured that string into "3" and "5".
      expect(values.span).toEqual([35, 80]);
      expect(screen.getByLabelText<HTMLInputElement>("Low").value).toBe("35");
      expect(screen.getByLabelText<HTMLInputElement>("High").value).toBe("80");
    });

    it("#434 keeps the computed aria-invalid that field() spreads away as undefined", () => {
      function Harness() {
        const form = useForm({ defaultValues: { span: [20, 80] as RangeSliderValue } });
        return (
          <form {...form.props}>
            <Field error="Out of range">
              <RangeSlider
                minLabel="Low"
                maxLabel="High"
                {...form.field<RangeSliderValue>("span")}
              />
              <FieldError />
            </Field>
          </form>
        );
      }
      const { container } = render(<Harness />);

      expect(screen.getByRole("alert")).toHaveTextContent("Out of range");
      expect(container.querySelector(".range-slider")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      // Merging the whole of fieldErrorProps (rather than cherry-picking
      // aria-invalid) also stops the Field's error id being discarded.
      expect(container.querySelector(".range-slider")).toHaveAttribute(
        "aria-describedby",
        screen.getByRole("alert").id,
      );
    });

    it("#434 still honours the aria-invalid field() supplies when it has none of its own", () => {
      function Harness() {
        const form = useForm({ defaultValues: { span: [20, 80] as RangeSliderValue } });
        return (
          <form {...form.props}>
            <RangeSlider
              minLabel="Low"
              maxLabel="High"
              {...form.field<RangeSliderValue>("span")}
            />
            <button type="button" onClick={() => form.setError("span", "Out of range")}>
              fail
            </button>
          </form>
        );
      }
      const { container } = render(<Harness />);
      const root = container.querySelector(".range-slider");

      expect(root).not.toHaveAttribute("aria-invalid");
      fireEvent.click(screen.getByRole("button", { name: "fail" }));
      expect(root).toHaveAttribute("aria-invalid", "true");
    });
  });
});
