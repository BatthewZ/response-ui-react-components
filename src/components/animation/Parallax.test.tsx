import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Defaults to full motion — the reduced-motion path is opt-in per test via
// `motion.reduced = true`.
const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

afterEach(() => {
  motion.reduced = false;
  vi.restoreAllMocks();
});

import { Parallax } from "./Parallax";

describe("Parallax", () => {
  it("renders children", () => {
    render(<Parallax>Hello</Parallax>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies willChange transform style", () => {
    render(<Parallax data-testid="parallax">Content</Parallax>);
    const el = screen.getByTestId("parallax");
    expect(el.style.willChange).toBe("transform");
  });

  it("merges custom className", () => {
    render(<Parallax className="custom-class" data-testid="parallax">Styled</Parallax>);
    expect(screen.getByTestId("parallax").className).toContain("custom-class");
  });

  it("merges custom style", () => {
    render(
      <Parallax style={{ color: "red" }} data-testid="parallax">
        Content
      </Parallax>
    );
    const el = screen.getByTestId("parallax");
    expect(el.style.color).toBe("red");
    expect(el.style.willChange).toBe("transform");
  });

  it("registers one scroll listener and positions on mount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    render(
      <Parallax rate={0.5} data-testid="parallax">
        Content
      </Parallax>
    );

    // jsdom lays nothing out, so the element's box sits at the origin and the
    // distance to the viewport centre is exactly -innerHeight / 2.
    const expectedOffset = (-window.innerHeight / 2) * 0.5;
    expect(screen.getByTestId("parallax").style.transform).toBe(
      `translateY(${expectedOffset}px)`
    );
    expect(addSpy.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(1);
  });

  it("registers no scroll listener and sets no transform under reduced motion", () => {
    motion.reduced = true;
    const addSpy = vi.spyOn(window, "addEventListener");

    render(
      <Parallax rate={0.5} data-testid="parallax">
        Content
      </Parallax>
    );

    const el = screen.getByTestId("parallax");
    expect(el.style.transform).toBe("");
    expect(el.style.willChange).toBe("");
    expect(addSpy.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(0);
  });
});
