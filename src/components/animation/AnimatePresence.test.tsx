import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => false,
}));

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
});
