import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Sparkline } from "./Sparkline";

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => false,
}));

describe("Sparkline", () => {
  it("renders with role='img'", () => {
    render(<Sparkline values={[1, 2, 3]} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("provides a default aria-label describing the value count", () => {
    render(<Sparkline values={[1, 2, 3, 4]} />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Sparkline of 4 values");
  });

  it("allows the aria-label to be overridden", () => {
    render(<Sparkline values={[1, 2, 3]} aria-label="Revenue trend" />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Revenue trend");
  });

  it("line variant renders a single path", () => {
    const { container } = render(<Sparkline values={[1, 5, 2, 8]} variant="line" />);
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(1);
    expect(paths[0]).toHaveClass("sparkline-line");
  });

  it("area variant renders an area path plus a line path", () => {
    const { container } = render(<Sparkline values={[1, 5, 2, 8]} variant="area" />);
    expect(container.querySelector("path.sparkline-area")).toBeInTheDocument();
    expect(container.querySelector("path.sparkline-line")).toBeInTheDocument();
  });

  it("bar variant renders N rects", () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4, 5]} variant="bar" />);
    expect(container.querySelectorAll("rect")).toHaveLength(5);
  });

  it("empty values renders no path and does not throw", () => {
    const { container } = render(<Sparkline values={[]} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(container.querySelectorAll("path")).toHaveLength(0);
    expect(container.querySelectorAll("rect")).toHaveLength(0);
  });

  it("single value does not throw or produce NaN", () => {
    const { container } = render(<Sparkline values={[7]} />);
    const path = container.querySelector("path.sparkline-line");
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute("d")).not.toContain("NaN");
  });

  it("single bar value does not throw or produce NaN", () => {
    const { container } = render(<Sparkline values={[7]} variant="bar" />);
    const rect = container.querySelector("rect");
    expect(rect).toBeInTheDocument();
    for (const attr of ["x", "y", "width", "height"]) {
      expect(rect?.getAttribute(attr)).not.toContain("NaN");
    }
  });

  it("max === min does not produce NaN in the path data", () => {
    const { container } = render(<Sparkline values={[5, 5, 5, 5]} />);
    const path = container.querySelector("path.sparkline-line");
    expect(path?.getAttribute("d")).not.toContain("NaN");
  });

  it("custom min/max changes the geometry", () => {
    const values = [2, 4, 6];
    const auto = render(<Sparkline values={values} />);
    const autoD = auto.container.querySelector("path.sparkline-line")?.getAttribute("d");
    auto.unmount();

    const custom = render(<Sparkline values={values} min={0} max={100} />);
    const customD = custom.container.querySelector("path.sparkline-line")?.getAttribute("d");

    expect(customD).toBeTruthy();
    expect(customD).not.toEqual(autoD);
  });

  it("forwards a ref to the underlying svg element", () => {
    let node: SVGSVGElement | null = null;
    render(
      <Sparkline
        values={[1, 2, 3]}
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(SVGSVGElement);
  });
});
