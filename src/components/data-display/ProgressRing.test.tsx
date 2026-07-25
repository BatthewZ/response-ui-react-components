import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProgressRing } from "./ProgressRing";

// Defaults to full motion — the reduced-motion path is opt-in per test via
// `motion.reduced = true`.
const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

afterEach(() => {
  motion.reduced = false;
});

const CIRCUMFERENCE = (size: number, thickness: number) =>
  2 * Math.PI * ((size - thickness) / 2);

/** The progress arc — the second circle, after the track. */
function getIndicator(scope: ParentNode = document): SVGCircleElement {
  const indicator = scope.querySelector<SVGCircleElement>(".progress-ring__indicator");
  if (!indicator) throw new Error("ProgressRing rendered no indicator circle");
  return indicator;
}

describe("ProgressRing", () => {
  it("renders with role='progressbar' and aria value attributes", () => {
    render(<ProgressRing value={50} />);
    const ring = screen.getByRole("progressbar");
    expect(ring).toHaveAttribute("aria-valuenow", "50");
    expect(ring).toHaveAttribute("aria-valuemin", "0");
    expect(ring).toHaveAttribute("aria-valuemax", "100");
  });

  it("uses custom max for aria-valuemax", () => {
    render(<ProgressRing value={20} max={200} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "200");
  });

  it("dashoffset equals circumference at 0%", () => {
    render(<ProgressRing value={0} size={64} thickness={6} />);
    const offset = Number(getIndicator().getAttribute("stroke-dashoffset"));
    expect(offset).toBeCloseTo(CIRCUMFERENCE(64, 6), 5);
  });

  it("dashoffset equals half circumference at 50%", () => {
    render(<ProgressRing value={50} max={100} size={64} thickness={6} />);
    const offset = Number(getIndicator().getAttribute("stroke-dashoffset"));
    expect(offset).toBeCloseTo(CIRCUMFERENCE(64, 6) / 2, 5);
  });

  it("dashoffset equals 0 at 100%", () => {
    render(<ProgressRing value={100} max={100} size={64} thickness={6} />);
    const offset = Number(getIndicator().getAttribute("stroke-dashoffset"));
    expect(offset).toBeCloseTo(0, 5);
  });

  it("clamps value > max to max (offset 0, aria-valuenow=max)", () => {
    render(<ProgressRing value={150} max={100} size={64} thickness={6} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    const offset = Number(getIndicator().getAttribute("stroke-dashoffset"));
    expect(offset).toBeCloseTo(0, 5);
  });

  it("clamps negative value to 0 (offset = circumference, aria-valuenow=0)", () => {
    render(<ProgressRing value={-25} max={100} size={64} thickness={6} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    const offset = Number(getIndicator().getAttribute("stroke-dashoffset"));
    expect(offset).toBeCloseTo(CIRCUMFERENCE(64, 6), 5);
  });

  it("guards max <= 0 to a 0 fraction (offset = circumference)", () => {
    render(<ProgressRing value={10} max={0} size={64} thickness={6} />);
    const offset = Number(getIndicator().getAttribute("stroke-dashoffset"));
    expect(offset).toBeCloseTo(CIRCUMFERENCE(64, 6), 5);
  });

  it("renders children in the centered slot", () => {
    render(<ProgressRing value={50}>42%</ProgressRing>);
    const slot = document.querySelector(".progress-ring__slot");
    expect(slot).toHaveTextContent("42%");
  });

  it("applies the color class for the given color prop", () => {
    render(<ProgressRing value={50} color="warning" />);
    expect(getIndicator().classList.contains("progress-ring__indicator--warning")).toBe(true);
  });

  it("defaults to the accent color class", () => {
    render(<ProgressRing value={50} />);
    expect(getIndicator().classList.contains("progress-ring__indicator--accent")).toBe(true);
  });

  it("forwards className to the wrapper", () => {
    render(<ProgressRing value={50} className="custom-class" />);
    expect(screen.getByRole("progressbar").className).toContain("custom-class");
  });

  it("adds the no-animate indicator class only under reduced motion", () => {
    const full = render(<ProgressRing value={50} />);
    expect(
      getIndicator(full.container).classList.contains("progress-ring__indicator--no-animate")
    ).toBe(false);
    full.unmount();

    motion.reduced = true;
    const reduced = render(<ProgressRing value={50} />);
    expect(
      getIndicator(reduced.container).classList.contains("progress-ring__indicator--no-animate")
    ).toBe(true);
  });
});
