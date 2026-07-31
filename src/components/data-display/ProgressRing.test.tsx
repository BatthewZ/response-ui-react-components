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

/**
 * Junk no `cn()` in this package may emit: an absent slot appends NOTHING — no
 * `undefined`, no `null`, no doubled or edge whitespace.
 */
const NO_JUNK = /undefined|null|\s{2,}|^\s|\s$/;

const classesOf = (el: Element | null | undefined) =>
  (el?.getAttribute("class") ?? "").split(" ");

describe("ProgressRing · classNames slots", () => {
  /**
   * One slot-override test per slot, and each is the falsifier for its own
   * merge: delete that element's `cn()` and exactly this test must go red.
   */
  it("lands classNames.svg on the <svg>, beside the base class", () => {
    const { container } = render(<ProgressRing value={50} classNames={{ svg: "rotate-45" }} />);
    const svg = container.querySelector(".progress-ring__svg");
    expect(svg?.getAttribute("class")).toContain("progress-ring__svg");
    expect(svg?.getAttribute("class")).toContain("rotate-45");
  });

  it("lands classNames.track on the groove, beside the base class", () => {
    const { container } = render(<ProgressRing value={50} classNames={{ track: "opacity-50" }} />);
    const track = container.querySelector(".progress-ring__track");
    expect(track?.getAttribute("class")).toContain("progress-ring__track");
    expect(track?.getAttribute("class")).toContain("opacity-50");
  });

  it("lands classNames.indicator on the arc, beside the base and colour classes", () => {
    const { container } = render(
      <ProgressRing value={50} color="success" classNames={{ indicator: "opacity-75" }} />,
    );
    const indicator = container.querySelector(".progress-ring__indicator");
    expect(indicator?.getAttribute("class")).toContain("progress-ring__indicator");
    expect(indicator?.getAttribute("class")).toContain("progress-ring__indicator--success");
    expect(indicator?.getAttribute("class")).toContain("opacity-75");
  });

  it("lands classNames.center on the centre region, beside the base class", () => {
    const { container } = render(
      <ProgressRing value={50} classNames={{ center: "text-body-3" }}>
        50%
      </ProgressRing>,
    );
    const center = container.querySelector(".progress-ring__slot");
    expect(center?.getAttribute("class")).toContain("progress-ring__slot");
    expect(center?.getAttribute("class")).toContain("text-body-3");
  });

  /**
   * These used to assert each class attribute equalled its marker exactly, which
   * stopped being expressible once `ProgressRing.css` was deleted and the
   * elements carried their own utilities. The falsifiers are unchanged and are
   * what the equality was ever standing in for: an absent slot appends NOTHING,
   * and each element keeps its own marker.
   */
  it("leaves each internal on its base classes alone when no slot is passed", () => {
    const { container } = render(<ProgressRing value={50}>50%</ProgressRing>);
    for (const marker of [
      "progress-ring__svg",
      "progress-ring__track",
      "progress-ring__indicator",
      "progress-ring__slot",
    ]) {
      const el = container.querySelector(`.${marker}`);
      expect(classesOf(el)).toContain(marker);
      expect(el?.getAttribute("class")).not.toMatch(NO_JUNK);
    }
    // The colour marker still rides with the arc's base classes.
    expect(classesOf(container.querySelector(".progress-ring__indicator"))).toContain(
      "progress-ring__indicator--accent",
    );
  });

  it("does not put a slot class on the root", () => {
    const { container } = render(
      <ProgressRing
        value={50}
        classNames={{
          svg: "rotate-45",
          track: "opacity-50",
          indicator: "opacity-75",
          center: "text-body-3",
        }}
      >
        50%
      </ProgressRing>,
    );
    const root = classesOf(container.firstElementChild);
    expect(root).toContain("progress-ring");
    for (const slotClass of ["rotate-45", "opacity-50", "opacity-75", "text-body-3"]) {
      expect(root).not.toContain(slotClass);
    }
  });

  /**
   * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
   * compile error. It fails if TypeScript ever stops rejecting the key.
   */
  it("rejects an unknown slot key at compile time", () => {
    const { container } = render(
      <ProgressRing
        value={50}
        // @ts-expect-error — `slot` is a banned key; the centre region is `center`.
        classNames={{ slot: "text-body-3" }}
      />,
    );
    expect(classesOf(container.querySelector(".progress-ring__slot"))).not.toContain(
      "text-body-3",
    );
  });

  it("does not leak classNames onto the DOM", () => {
    const { container } = render(<ProgressRing value={50} classNames={{ svg: "rotate-45" }} />);
    expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
  });
});
