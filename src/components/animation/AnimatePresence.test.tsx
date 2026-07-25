import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Defaults to full motion — the reduced-motion path is opt-in per test via
// `motion.reduced = true`.
const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

afterEach(() => {
  motion.reduced = false;
});

import { AnimatePresence } from "./AnimatePresence";

// jsdom has no `AnimationEvent` constructor, so `fireEvent.animationEnd` dispatches
// something React never sees; React also picks exactly one of these two names via
// vendor-prefix detection. Dispatching both fires the handler exactly once anywhere.
function fireAnimationEnd(el: Element) {
  for (const name of ["animationend", "webkitAnimationEnd"]) {
    fireEvent(el, new Event(name, { bubbles: true }));
  }
}

describe("AnimatePresence", () => {
  it("renders children when show is true", () => {
    render(<AnimatePresence show={true}>Visible</AnimatePresence>);
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("does not render children when show is false", () => {
    render(<AnimatePresence show={false}>Hidden</AnimatePresence>);
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("applies enter class when show is true", () => {
    render(
      <AnimatePresence show={true} data-testid="animate">
        Content
      </AnimatePresence>
    );
    const el = screen.getByTestId("animate");
    expect(el.className).toContain("fade-in");
  });

  it("merges custom className", () => {
    render(
      <AnimatePresence show={true} className="custom-class" data-testid="animate">
        Content
      </AnimatePresence>
    );
    expect(screen.getByTestId("animate").className).toContain("custom-class");
  });

  it("unmounts once the exit animation ends", () => {
    const { rerender } = render(
      <AnimatePresence show={true} data-testid="animate">
        Content
      </AnimatePresence>
    );
    rerender(
      <AnimatePresence show={false} data-testid="animate">
        Content
      </AnimatePresence>
    );

    const el = screen.getByTestId("animate");
    expect(el.className).toContain("fade-out");
    fireAnimationEnd(el);

    expect(screen.queryByTestId("animate")).not.toBeInTheDocument();
  });

  it("still unmounts when the caller supplies onAnimationEnd, and calls it too", () => {
    const onAnimationEnd = vi.fn();
    const { rerender } = render(
      <AnimatePresence show={true} onAnimationEnd={onAnimationEnd} data-testid="animate">
        Content
      </AnimatePresence>
    );
    rerender(
      <AnimatePresence show={false} onAnimationEnd={onAnimationEnd} data-testid="animate">
        Content
      </AnimatePresence>
    );

    const el = screen.getByTestId("animate");
    expect(el.className).toContain("fade-out");
    fireAnimationEnd(el);

    expect(screen.queryByTestId("animate")).not.toBeInTheDocument();
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
  });

  // #14 — `animationend` bubbles, so a child finishing its own animation mid-exit must not
  // be mistaken for the wrapper's. Composing a caller's handler (#13) made the internal
  // handler always run, which widened this from "only consumers not passing
  // onAnimationEnd" to every consumer — so the guard is now load-bearing.
  it("ignores an `animationend` bubbling up from a child mid-exit", () => {
    const { rerender } = render(
      <AnimatePresence show={true} data-testid="animate">
        <span data-testid="child">Spinner</span>
      </AnimatePresence>
    );
    rerender(
      <AnimatePresence show={false} data-testid="animate">
        <span data-testid="child">Spinner</span>
      </AnimatePresence>
    );

    const el = screen.getByTestId("animate");
    expect(el.className).toContain("fade-out");

    // the CHILD's animation ends, not the wrapper's
    fireAnimationEnd(screen.getByTestId("child"));

    expect(screen.queryByTestId("animate")).toBeInTheDocument();
    expect(el.className).toContain("fade-out");

    // the wrapper's own animation still unmounts it
    fireAnimationEnd(el);
    expect(screen.queryByTestId("animate")).not.toBeInTheDocument();
  });

  it("carries no enter/exit animation class under reduced motion", () => {
    motion.reduced = true;
    render(
      <AnimatePresence show={true} className="custom-class" data-testid="animate">
        Content
      </AnimatePresence>
    );

    expect(screen.getByTestId("animate").className).toBe("custom-class");
  });

  it("unmounts on hide without waiting for an exit animation under reduced motion", () => {
    motion.reduced = true;
    const { rerender } = render(
      <AnimatePresence show={true} data-testid="animate">
        Content
      </AnimatePresence>
    );
    expect(screen.getByTestId("animate")).toBeInTheDocument();

    rerender(
      <AnimatePresence show={false} data-testid="animate">
        Content
      </AnimatePresence>
    );

    // Gone already — no `animationend` is dispatched here, and none is needed.
    expect(screen.queryByTestId("animate")).not.toBeInTheDocument();
  });
});
