import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sparkline } from "./Sparkline";

// Defaults to full motion — the reduced-motion path is opt-in per test via
// `motion.reduced = true`.
const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

afterEach(() => {
  motion.reduced = false;
});

describe("Sparkline", () => {
  it("renders with role='img'", () => {
    render(<Sparkline values={[1, 2, 3]} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /*  #29 · the default name describes the data, and img is opt-out      */
  /* ------------------------------------------------------------------ */

  it("the default aria-label describes the series, not its length", () => {
    render(<Sparkline values={[12, 18, 15, 28]} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Sparkline: 4 values, 12 to 28, rising, low 12, high 28",
    );
  });

  it("names the direction from the ends, not the extremes", () => {
    render(<Sparkline values={[28, 40, 12]} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Sparkline: 3 values, 28 to 12, falling, low 12, high 40",
    );
  });

  it("degenerate series still name themselves", () => {
    const { unmount } = render(<Sparkline values={[]} />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Sparkline: no data");
    unmount();

    const single = render(<Sparkline values={[7]} />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Sparkline: one value, 7");
    single.unmount();

    render(<Sparkline values={[5, 5, 5]} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Sparkline: 3 values, 5 to 5, level, low 5, high 5",
    );
  });

  it("aria-hidden is a real decorative mode: no role, no name", () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} aria-hidden />);
    const svg = container.querySelector("svg")!;
    expect(svg).not.toHaveAttribute("role");
    expect(svg).not.toHaveAttribute("aria-label");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("aria-labelledby names it instead, with no competing aria-label", () => {
    const { container } = render(
      <>
        <span id="cap">Revenue, last 7 days</span>
        <Sparkline values={[1, 2, 3]} aria-labelledby="cap" />
      </>,
    );
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).not.toHaveAttribute("aria-label");
    expect(screen.getByRole("img", { name: "Revenue, last 7 days" })).toBeInTheDocument();
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

  /* ------------------------------------------------------------------ */
  /*  Bars measure magnitude, so their domain contains zero               */
  /* ------------------------------------------------------------------ */

  const barHeights = (container: HTMLElement) =>
    [...container.querySelectorAll("rect")].map((r) => Number(r.getAttribute("height")));

  it("no bar is invisible just for being the smallest value", () => {
    // The old domain started at min(values), so the smallest datum collapsed to
    // a zero-height rect and silently vanished from the chart.
    const { container } = render(<Sparkline values={[8, 9, 7, 11, 10]} variant="bar" />);
    for (const h of barHeights(container)) expect(h).toBeGreaterThan(0);
  });

  it("a near-flat series reads as near-flat rather than full-scale swings", () => {
    // Uptime 99.8–100 is a 0.2pt spread; anchored at the data min it rendered as
    // zero-to-full bars, which reads as a wildly unstable service.
    const { container } = render(
      <Sparkline values={[100, 99.9, 99.8, 100, 99.95]} variant="bar" />
    );
    const heights = barHeights(container);
    const spread = (Math.max(...heights) - Math.min(...heights)) / Math.max(...heights);
    expect(spread).toBeLessThan(0.01);
  });

  it("bar heights stay proportional to value, measured from zero", () => {
    const { container } = render(<Sparkline values={[10, 5]} variant="bar" />);
    const [full, half] = barHeights(container);
    expect(half / full).toBeCloseTo(0.5, 2);
  });

  it("a zero value renders no bar, because zero magnitude is no bar", () => {
    const { container } = render(<Sparkline values={[0, 5, 10]} variant="bar" />);
    expect(barHeights(container)[0]).toBe(0);
  });

  it("negative bars hang below the zero line", () => {
    const { container } = render(<Sparkline values={[-5, 5]} variant="bar" />);
    const [neg, pos] = [...container.querySelectorAll("rect")];
    const negTop = Number(neg.getAttribute("y"));
    const posTop = Number(pos.getAttribute("y"));
    const posBottom = posTop + Number(pos.getAttribute("height"));
    // The positive bar's floor is the zero line; the negative bar starts there.
    expect(negTop).toBeCloseTo(posBottom, 1);
    expect(Number(neg.getAttribute("height"))).toBeGreaterThan(0);
  });

  it("an explicit domain that excludes zero still gets a floor, not an off-canvas baseline", () => {
    const height = 32;
    const { container } = render(
      <Sparkline values={[99.8, 100]} variant="bar" min={99.5} max={100} height={height} />
    );
    for (const rect of container.querySelectorAll("rect")) {
      const y = Number(rect.getAttribute("y"));
      const h = Number(rect.getAttribute("height"));
      expect(h).toBeGreaterThan(0);
      expect(y + h).toBeLessThanOrEqual(height);
    }
  });

  it("the area fill bottoms out on the same baseline the bars stand on", () => {
    const strokeWidth = 2;
    const height = 32;
    const { container } = render(
      <Sparkline values={[1, 5, 2]} variant="area" height={height} strokeWidth={strokeWidth} />
    );
    const d = container.querySelector("path.sparkline-area")?.getAttribute("d") ?? "";
    // Closes on the drawing area's floor (height - pad), not the viewBox edge.
    // Asserted as the exact closing segment: a bare `toContain("30")` also matches
    // the y of a datum sitting on that floor, so it would pass either way.
    const floor = height - strokeWidth;
    expect(d.endsWith(`L 120 ${floor} L 0 ${floor} Z`)).toBe(true);
  });

  it("empty values renders no path and does not throw", () => {
    const { container } = render(<Sparkline values={[]} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(container.querySelectorAll("path")).toHaveLength(0);
    expect(container.querySelectorAll("rect")).toHaveLength(0);
  });

  // #30: `M x y` with nothing after it paints no pixels, so a one-value line
  // rendered an empty chart — a silent no-op with no error and no fallback.
  it("single value renders a visible point rather than an empty path", () => {
    const { container } = render(<Sparkline values={[7]} />);

    expect(container.querySelector("path.sparkline-line")).not.toBeInTheDocument();

    const point = container.querySelector("circle.sparkline-point");
    expect(point).toBeInTheDocument();
    for (const attr of ["cx", "cy", "r"]) {
      const value = point?.getAttribute(attr);
      expect(value).not.toContain("NaN");
      expect(Number(value)).toBeGreaterThan(0);
    }
  });

  it("single value in the area variant does not draw a triangle out of one datum", () => {
    const { container } = render(<Sparkline values={[7]} variant="area" />);

    expect(container.querySelector("path.sparkline-area")).not.toBeInTheDocument();
    expect(container.querySelector("circle.sparkline-point")).toBeInTheDocument();
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

  it("carries the animate class only when motion is allowed", () => {
    const full = render(<Sparkline values={[1, 2, 3]} />);
    expect(full.getByRole("img").getAttribute("class")).toContain("sparkline--animate");
    full.unmount();

    motion.reduced = true;
    const reduced = render(<Sparkline values={[1, 2, 3]} />);
    const cls = reduced.getByRole("img").getAttribute("class") ?? "";
    expect(cls).not.toContain("sparkline--animate");
    // the rest of the class list is untouched
    expect(cls).toContain("sparkline--line");
  });
});
