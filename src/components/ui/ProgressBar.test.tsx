import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
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
    render(<ProgressBar value={50} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("value prop sets aria-valuenow", () => {
    render(<ProgressBar value={42} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
  });

  it("max prop sets aria-valuemax", () => {
    render(<ProgressBar value={20} max={200} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemax", "200");
  });

  it("defaults aria-valuemax to 100", () => {
    render(<ProgressBar value={50} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "100");
  });

  it("visual bar width reflects percentage", () => {
    render(<ProgressBar value={75} max={100} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("75%");
  });

  it("clamps visual width to 100%", () => {
    render(<ProgressBar value={150} max={100} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("visual width is 0% when value is 0", () => {
    render(<ProgressBar value={0} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("forwards className prop", () => {
    render(<ProgressBar value={50} className="custom-class" aria-label="Upload" />);
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
    render(<ProgressBar value={50} aria-label="Upload" />);
    expect(getFill().className).not.toContain("progress-bar__fill--no-animate");
  });

  it("animate={false} opts the fill out of the width transition", () => {
    render(<ProgressBar value={50} animate={false} aria-label="Upload" />);
    expect(getFill().className).toContain("progress-bar__fill--no-animate");
  });

  it("reduced motion opts the fill out even with animate left at its default", () => {
    motion.reduced = true;
    render(<ProgressBar value={50} aria-label="Upload" />);
    expect(getFill().className).toContain("progress-bar__fill--no-animate");
  });

  // The root Omits `children` and does not destructure it, but JSX element children
  // are emitted after the spread in the object the JSX runtime builds, so the fill
  // always wins. Measured, not assumed — the omission needs no runtime guard.
  it("a spread `children` cannot displace the fill", () => {
    const bag = { children: "HIJACKED", id: "bar" };

    render(<ProgressBar value={50} aria-label="Upload" {...bag} />);
    const root = screen.getByRole("progressbar");

    expect(root).toHaveAttribute("id", "bar");
    expect(root).toHaveTextContent("");
    expect(getFill()).toHaveClass("progress-bar__fill");
  });
});

// #205 — `color` swapped one background and emitted nothing else, so two bars at
// the same value with `success` and `error` announced identically. The word rides
// `aria-valuetext` rather than a hidden child because `role="progressbar"` makes
// its children presentational (the same reason Avatar labels its dot).
describe("ProgressBar · status has a text channel", () => {
  it("announces the status alongside the percentage", () => {
    render(<ProgressBar value={96} color="error" aria-label="Quota" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "96%, Error");
  });

  it("says nothing extra for the neutral accent colour", () => {
    render(<ProgressBar value={96} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuetext");
  });

  it("reports the percentage of the range, not the raw value", () => {
    render(<ProgressBar value={50} max={200} color="warning" aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "25%, Warning");
  });

  it("statusLabel replaces the default word, and '' removes it", () => {
    const { rerender } = render(
      <ProgressBar value={96} color="error" statusLabel="Dépassement" aria-label="Quota" />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "96%, Dépassement",
    );

    rerender(<ProgressBar value={96} color="error" statusLabel="" aria-label="Over quota" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuetext");
  });

  it("falls back to the status alone when max describes no range", () => {
    render(<ProgressBar value={5} max={0} color="warning" aria-label="Sync" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Warning");
  });

  it("a caller's own aria-valuetext wins", () => {
    render(
      <ProgressBar value={96} color="error" aria-valuetext="Over quota" aria-label="Quota" />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Over quota");
  });

  it("keeps the word out of the DOM, where role=progressbar would hide it", () => {
    render(<ProgressBar value={96} color="error" aria-label="Quota" />);
    expect(screen.getByRole("progressbar")).toHaveTextContent("");
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

// #203 — `ProgressBar.Label` implies a wiring it cannot perform: the root omits
// `children`, so the label is its sibling and no context can join them. The type
// asks the caller for the association instead, the way `Meter` asks for a name.
describe("ProgressBar · the bar has to be named", () => {
  type RootProps = ComponentProps<typeof ProgressBar>;

  // Compile-time assertions, enforced by `tsc --noEmit`: each `true` is only
  // assignable if the conditional resolves the way its name says.
  const namelessRejected: { value: number } extends RootProps ? false : true = true;
  const ariaLabelAccepted: { value: number; "aria-label": string } extends RootProps
    ? true
    : false = true;
  const ariaLabelledbyAccepted: { value: number; "aria-labelledby": string } extends RootProps
    ? true
    : false = true;
  const ariaHiddenAccepted: { value: number; "aria-hidden": true } extends RootProps
    ? true
    : false = true;

  it("accepts each documented route to a name, and nothing else", () => {
    expect([
      namelessRejected,
      ariaLabelAccepted,
      ariaLabelledbyAccepted,
      ariaHiddenAccepted,
    ]).toEqual([true, true, true, true]);
  });

  it("takes its name from a ProgressBar.Label the caller points it at", () => {
    render(
      <>
        <ProgressBar.Label id="upload-label">Uploading design-system.zip</ProgressBar.Label>
        <ProgressBar value={64} aria-labelledby="upload-label" />
      </>,
    );

    expect(
      screen.getByRole("progressbar", { name: "Uploading design-system.zip" }),
    ).toBeInTheDocument();
  });

  it("still composes the status word with a name that came from a Label", () => {
    render(
      <>
        <ProgressBar.Label id="quota-label">Storage used</ProgressBar.Label>
        <ProgressBar value={96} color="error" aria-labelledby="quota-label" />
      </>,
    );

    const bar = screen.getByRole("progressbar", { name: "Storage used" });
    expect(bar).toHaveAttribute("aria-valuetext", "96%, Error");
  });

  it("a purely decorative bar opts out of the name instead of going unnamed", () => {
    render(<ProgressBar value={64} aria-hidden />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
