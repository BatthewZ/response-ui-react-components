import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Meter } from "./Meter";

const filledCount = (el: HTMLElement) =>
  Array.from(el.querySelectorAll("span")).filter((s) =>
    /bg-(accent|status-warning|status-error)/.test(s.className)
  ).length;

describe("Meter", () => {
  it("renders role=meter with aria value/range/label attributes", () => {
    render(<Meter value={40} aria-label="Disk usage" />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "40");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-label", "Disk usage");
  });

  it("resolves via getByRole('meter')", () => {
    render(<Meter value={10} aria-label="CPU" />);
    expect(screen.getByRole("meter")).toBeInTheDocument();
  });

  it("renders the requested number of segments", () => {
    render(<Meter value={50} segments={8} aria-label="Memory" />);
    const meter = screen.getByRole("meter");
    expect(meter.querySelectorAll("span")).toHaveLength(8);
  });

  it("renders the default 10 segments", () => {
    render(<Meter value={50} aria-label="Memory" />);
    expect(screen.getByRole("meter").querySelectorAll("span")).toHaveLength(10);
  });

  it("fills no segments at value=min", () => {
    render(<Meter value={0} segments={10} aria-label="Memory" />);
    expect(filledCount(screen.getByRole("meter"))).toBe(0);
  });

  it("fills all segments at value=max", () => {
    render(<Meter value={100} segments={10} aria-label="Memory" />);
    expect(filledCount(screen.getByRole("meter"))).toBe(10);
  });

  it("fills proportionally at a mid value", () => {
    render(<Meter value={50} segments={10} aria-label="Memory" />);
    expect(filledCount(screen.getByRole("meter"))).toBe(5);
  });

  it("respects custom min/max range", () => {
    render(<Meter value={150} min={100} max={200} segments={10} aria-label="Range" />);
    expect(filledCount(screen.getByRole("meter"))).toBe(5);
  });

  it("guards: value just above min fills at least one segment", () => {
    render(<Meter value={1} segments={10} aria-label="Memory" />);
    // 1/100 * 10 = 0.1 -> rounds to 0, but guard bumps to 1.
    expect(filledCount(screen.getByRole("meter"))).toBe(1);
  });

  it("guards: value just below max fills fewer than all segments", () => {
    render(<Meter value={99} segments={10} aria-label="Memory" />);
    // 99/100 * 10 = 9.9 -> rounds to 10, but guard caps at segments - 1.
    expect(filledCount(screen.getByRole("meter"))).toBe(9);
  });

  it("defaults to data-status='ok' with no thresholds", () => {
    render(<Meter value={90} aria-label="Memory" />);
    expect(screen.getByRole("meter")).toHaveAttribute("data-status", "ok");
  });

  it("flips data-status to 'warning' at warningAt", () => {
    const { rerender } = render(
      <Meter value={69} warningAt={70} criticalAt={90} aria-label="Memory" />
    );
    expect(screen.getByRole("meter")).toHaveAttribute("data-status", "ok");

    rerender(<Meter value={70} warningAt={70} criticalAt={90} aria-label="Memory" />);
    expect(screen.getByRole("meter")).toHaveAttribute("data-status", "warning");
  });

  it("flips data-status to 'critical' at criticalAt", () => {
    const { rerender } = render(
      <Meter value={89} warningAt={70} criticalAt={90} aria-label="Memory" />
    );
    expect(screen.getByRole("meter")).toHaveAttribute("data-status", "warning");

    rerender(<Meter value={90} warningAt={70} criticalAt={90} aria-label="Memory" />);
    expect(screen.getByRole("meter")).toHaveAttribute("data-status", "critical");
  });

  it("applies the semantic fill color matching the status", () => {
    const { rerender } = render(
      <Meter value={50} warningAt={70} criticalAt={90} segments={10} aria-label="Memory" />
    );
    let filled = Array.from(screen.getByRole("meter").querySelectorAll("span")).filter((s) =>
      s.className.includes("bg-accent")
    );
    expect(filled.length).toBe(5);

    rerender(
      <Meter value={95} warningAt={70} criticalAt={90} segments={10} aria-label="Memory" />
    );
    filled = Array.from(screen.getByRole("meter").querySelectorAll("span")).filter((s) =>
      s.className.includes("bg-status-error")
    );
    expect(filled.length).toBeGreaterThan(0);
  });

  it("sets gridTemplateColumns inline for the segment count", () => {
    render(<Meter value={50} segments={5} aria-label="Memory" />);
    expect(screen.getByRole("meter").style.gridTemplateColumns).toBe("repeat(5, 1fr)");
  });

  it("forwards ref to the root element", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Meter
        ref={(el) => {
          node = el;
        }}
        value={50}
        aria-label="Memory"
      />
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
    expect(node).toHaveAttribute("role", "meter");
  });
});

// #21 — the threshold status changed the fill tint and nothing else. The word
// goes in the accessible name rather than a hidden child because `role="meter"`
// makes its children presentational (the same reason Avatar labels its dot).
describe("Meter · threshold status has a text channel", () => {
  it("folds the crossed threshold into the accessible name", () => {
    const { rerender } = render(
      <Meter value={75} warningAt={70} criticalAt={90} aria-label="Disk usage" />
    );
    expect(screen.getByRole("meter")).toHaveAccessibleName("Disk usage, Warning");

    rerender(<Meter value={95} warningAt={70} criticalAt={90} aria-label="Disk usage" />);
    expect(screen.getByRole("meter")).toHaveAccessibleName("Disk usage, Critical");
  });

  it("leaves the name alone below the first threshold", () => {
    render(<Meter value={10} warningAt={70} criticalAt={90} aria-label="Disk usage" />);
    expect(screen.getByRole("meter")).toHaveAccessibleName("Disk usage");
  });

  it("statusLabels overrides one status without disturbing the others", () => {
    const { rerender } = render(
      <Meter
        value={95}
        warningAt={70}
        criticalAt={90}
        statusLabels={{ critical: "Kritisch", ok: "Normal" }}
        aria-label="Speicher"
      />
    );
    expect(screen.getByRole("meter")).toHaveAccessibleName("Speicher, Kritisch");

    rerender(
      <Meter
        value={10}
        warningAt={70}
        criticalAt={90}
        statusLabels={{ critical: "Kritisch", ok: "Normal" }}
        aria-label="Speicher"
      />
    );
    expect(screen.getByRole("meter")).toHaveAccessibleName("Speicher, Normal");
  });

  it("an empty label drops the suffix for a name that already says it", () => {
    render(
      <Meter
        value={95}
        criticalAt={90}
        statusLabels={{ critical: "" }}
        aria-label="Disk usage critical"
      />
    );
    expect(screen.getByRole("meter")).toHaveAccessibleName("Disk usage critical");
  });

  it("keeps the word out of the DOM, where role=meter would hide it", () => {
    render(<Meter value={95} criticalAt={90} aria-label="Disk usage" />);
    expect(screen.getByRole("meter")).toHaveTextContent("");
  });
});

describe("Meter · range integrity", () => {
  // #22
  it("announces the clamped value, not the raw one", () => {
    render(<Meter value={140} max={100} aria-label="Disk" />);
    expect(screen.getByRole("meter", { name: "Disk" })).toHaveAttribute("aria-valuenow", "100");
  });

  it("announces the floor for a value below min", () => {
    render(<Meter value={-5} min={0} max={100} aria-label="Disk" />);
    expect(screen.getByRole("meter", { name: "Disk" })).toHaveAttribute("aria-valuenow", "0");
  });
});
