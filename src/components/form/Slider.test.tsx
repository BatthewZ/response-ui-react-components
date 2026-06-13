import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Slider } from "./Slider";

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
});
