import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProgressBar } from "./ProgressBar";

// Defaults to full motion — the reduced-motion path is opt-in per test via
// `motion.reduced = true`.
const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

afterEach(() => {
  motion.reduced = false;
});

function getFill(): HTMLElement {
  const fill = screen.getByRole("progressbar").firstElementChild;
  if (!(fill instanceof HTMLElement)) throw new Error("ProgressBar rendered no fill");
  return fill;
}

describe("ProgressBar", () => {
  it("renders with role='progressbar'", () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("value prop sets aria-valuenow", () => {
    render(<ProgressBar value={42} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
  });

  it("max prop sets aria-valuemax", () => {
    render(<ProgressBar value={20} max={200} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemax", "200");
  });

  it("defaults aria-valuemax to 100", () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "100");
  });

  it("visual bar width reflects percentage", () => {
    render(<ProgressBar value={75} max={100} />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("75%");
  });

  it("clamps visual width to 100%", () => {
    render(<ProgressBar value={150} max={100} />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("visual width is 0% when value is 0", () => {
    render(<ProgressBar value={0} />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("forwards className prop", () => {
    render(<ProgressBar value={50} className="custom-class" />);
    expect(screen.getByRole("progressbar").className).toContain("custom-class");
  });

  it("ProgressBar.Label renders its content", () => {
    const { container } = render(<ProgressBar.Label>Upload progress</ProgressBar.Label>);
    expect(container).toHaveTextContent("Upload progress");
  });

  it("ProgressBar.Value renders its content", () => {
    const { container } = render(<ProgressBar.Value>75%</ProgressBar.Value>);
    expect(container).toHaveTextContent("75%");
  });

  it("animates the fill by default", () => {
    render(<ProgressBar value={50} />);
    expect(getFill().className).not.toContain("progress-bar__fill--no-animate");
  });

  it("animate={false} opts the fill out of the width transition", () => {
    render(<ProgressBar value={50} animate={false} />);
    expect(getFill().className).toContain("progress-bar__fill--no-animate");
  });

  it("reduced motion opts the fill out even with animate left at its default", () => {
    motion.reduced = true;
    render(<ProgressBar value={50} />);
    expect(getFill().className).toContain("progress-bar__fill--no-animate");
  });

  // The root Omits `children` and does not destructure it, but JSX element children
  // are emitted after the spread in the object the JSX runtime builds, so the fill
  // always wins. Measured, not assumed — the omission needs no runtime guard.
  it("a spread `children` cannot displace the fill", () => {
    const bag = { children: "HIJACKED", id: "bar" };

    render(<ProgressBar value={50} {...bag} />);
    const root = screen.getByRole("progressbar");

    expect(root).toHaveAttribute("id", "bar");
    expect(root).toHaveTextContent("");
    expect(getFill()).toHaveClass("progress-bar__fill");
  });
});

describe("ProgressBar · range integrity", () => {
  // #202
  it("announces the clamped value, not the raw one", () => {
    render(<ProgressBar value={150} max={100} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar.firstElementChild).toHaveStyle({ width: "100%" });
  });

  it("announces 0 for a value below the floor", () => {
    render(<ProgressBar value={-20} max={100} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  // #204
  it("renders an empty bar for a NaN value, never a full one", () => {
    render(<ProgressBar value={Number.NaN} max={100} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.firstElementChild).toHaveStyle({ width: "0%" });
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  // #209
  it("exposes no range at all when max describes none", () => {
    render(<ProgressBar value={5} max={0} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).not.toHaveAttribute("aria-valuemin");
    expect(bar).not.toHaveAttribute("aria-valuemax");
  });
});
