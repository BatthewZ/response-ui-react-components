import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Defaults to full motion — the reduced-motion path is opt-in per test via
// `motion.reduced = true`.
const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

import { ScrollReveal } from "./ScrollReveal";

/**
 * jsdom has no IntersectionObserver, so the reveal path never runs and the
 * animation class is never applied. Stub one that reports the target as
 * intersecting immediately, which is the only state in which the internal
 * `onAnimationEnd` is observable.
 */
function stubIntersectingObserver() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(node: Element) {
        this.cb(
          [{ isIntersecting: true, target: node } as unknown as IntersectionObserverEntry],
          this as unknown as IntersectionObserver
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
  );
}

/**
 * React resolves the animation-event name through vendor-prefix detection, and in
 * this jsdom it registers `webkitAnimationEnd` rather than `animationend` — so
 * `fireEvent.animationEnd` reaches React not at all (and jsdom has no
 * `AnimationEvent` constructor either). React only ever registers one of the two
 * names, so dispatching both fires the handler exactly once in any environment.
 */
function fireAnimationEnd(el: Element) {
  for (const name of ["animationend", "webkitAnimationEnd"]) {
    fireEvent(el, new Event(name, { bubbles: true }));
  }
}

afterEach(() => {
  motion.reduced = false;
  vi.unstubAllGlobals();
});

describe("ScrollReveal", () => {
  it("renders children", () => {
    render(<ScrollReveal>Hello</ScrollReveal>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies initial hidden state", () => {
    const { container } = render(<ScrollReveal>Content</ScrollReveal>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("scroll-reveal-hidden");
  });

  it("merges custom className", () => {
    const { container } = render(<ScrollReveal className="custom-class">Styled</ScrollReveal>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("custom-class");
  });

  it("renders as a div by default", () => {
    const { container } = render(<ScrollReveal>Content</ScrollReveal>);
    expect(container.firstElementChild!.tagName).toBe("DIV");
  });

  // #9 — the public type accepts the rendered element's whole prop set.
  it("forwards rest props onto the rendered element", () => {
    const { container } = render(
      <ScrollReveal id="reveal" aria-label="Featured" data-analytics="hero">
        Content
      </ScrollReveal>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.id).toBe("reveal");
    expect(el.getAttribute("aria-label")).toBe("Featured");
    expect(el.dataset.analytics).toBe("hero");
  });

  it("forwards rest props onto a custom `as` element", () => {
    const { container } = render(
      <ScrollReveal as="section" id="lane" role="region">
        Content
      </ScrollReveal>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe("SECTION");
    expect(el.id).toBe("lane");
    expect(el.getAttribute("role")).toBe("region");
  });

  it("forwards caller event handlers", () => {
    const onClick = vi.fn();
    const { container } = render(<ScrollReveal onClick={onClick}>Content</ScrollReveal>);
    fireEvent.click(container.firstElementChild!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("merges a caller `style` with its own animation delay", () => {
    stubIntersectingObserver();
    const { container } = render(
      <ScrollReveal delay={200} style={{ marginTop: "8px" }}>
        Content
      </ScrollReveal>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.marginTop).toBe("8px");
    expect(el.style.animationDelay).toBe("200ms");
  });

  it("composes a caller `onAnimationEnd` with its own without losing either", () => {
    stubIntersectingObserver();
    const onAnimationEnd = vi.fn();
    const { container } = render(
      <ScrollReveal onAnimationEnd={onAnimationEnd}>Content</ScrollReveal>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("fade-up");

    fireAnimationEnd(el);

    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    // the internal handler still clears the animating class
    expect(el.className).not.toContain("fade-up");
  });

  it("never observes and renders already-revealed under reduced motion", () => {
    motion.reduced = true;
    const constructed = vi.fn();
    const observed = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor() {
          constructed();
        }
        observe = observed;
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      }
    );

    const { container } = render(<ScrollReveal delay={200}>Content</ScrollReveal>);
    const el = container.firstElementChild as HTMLElement;

    expect(constructed).toHaveBeenCalledTimes(0);
    expect(observed).toHaveBeenCalledTimes(0);
    // Content is visible from the first paint rather than hidden pending a reveal.
    expect(el.className).not.toContain("scroll-reveal-hidden");
    expect(el.className).not.toContain("fade-up");
    expect(el.style.animationDelay).toBe("");
  });
});
