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
 * An observer that observes and never reports an intersection — the state a
 * real browser is in before the element scrolls into view. jsdom ships no
 * `IntersectionObserver` at all, and that is now its own behaviour (#16), so
 * every assertion about the *waiting* state has to supply one.
 */
function stubIdleObserver() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
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
    stubIdleObserver();
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

  // Phase 1. The entrance window is published as `data-entering` as well as a
  // class, because a component whose entrance direction has to beat the
  // foundation's `.fade-*` rules cannot emit those classes at all — from
  // `@layer components` they win on layer at any specificity. `Timeline.css`
  // keys its whole `animation` shorthand off this attribute, so it is public
  // surface and not an implementation detail.
  describe("data-entering marks the entrance window", () => {
    it("is present exactly while the entrance class is", () => {
      stubIntersectingObserver();
      const { container } = render(<ScrollReveal>Content</ScrollReveal>);
      const el = container.firstElementChild as HTMLElement;
      expect(el.className).toContain("fade-up");
      expect(el).toHaveAttribute("data-entering");

      fireAnimationEnd(el);

      expect(el.className).not.toContain("fade-up");
      expect(el).not.toHaveAttribute("data-entering");
    });

    it('animation="none" reveals with the marker and no entrance class', () => {
      stubIntersectingObserver();
      const { container } = render(<ScrollReveal animation="none">Content</ScrollReveal>);
      const el = container.firstElementChild as HTMLElement;
      // The point of the option: the caller owns the animation, so no foundation
      // class is emitted for a layered rule to lose to.
      expect(el.className).not.toMatch(/\bfade-|\bscale-/);
      expect(el).toHaveAttribute("data-entering");
      expect(screen.getByText("Content")).toBeVisible();
    });

    it("is absent before the reveal fires and when animate is off", () => {
      const { container, rerender } = render(<ScrollReveal animate={false}>Content</ScrollReveal>);
      const el = container.firstElementChild as HTMLElement;
      expect(el).not.toHaveAttribute("data-entering");
      rerender(<ScrollReveal animate={false} animation="none">Content</ScrollReveal>);
      expect(container.firstElementChild).not.toHaveAttribute("data-entering");
    });
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

  // #16 — the reveal's first paint is `opacity: 0` and only an IntersectionObserver
  // clears it, so with no JS, no observer, or during SSR the content never appears.
  // `animate={false}` is the opt-out, matching the one Swimlane gained for the same
  // defect (ee5d181).
  describe("#16 · animate={false} renders visible content", () => {
    it("applies neither the hidden class nor an animation class", () => {
      stubIntersectingObserver();
      const { container } = render(<ScrollReveal animate={false}>Content</ScrollReveal>);
      const el = container.firstElementChild as HTMLElement;
      expect(el.className).not.toContain("scroll-reveal-hidden");
      expect(el.className).not.toContain("fade-up");
      expect(screen.getByText("Content")).toBeVisible();
    });

    it("never constructs an observer", () => {
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

      render(<ScrollReveal animate={false}>Content</ScrollReveal>);
      expect(constructed).toHaveBeenCalledTimes(0);
      expect(observed).toHaveBeenCalledTimes(0);
    });

    it("contributes no animation delay", () => {
      stubIntersectingObserver();
      const { container } = render(
        <ScrollReveal animate={false} delay={200} style={{ marginTop: "8px" }}>
          Content
        </ScrollReveal>
      );
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.animationDelay).toBe("");
      expect(el.style.marginTop).toBe("8px");
    });

    it("still forwards className, rest props and the `as` tag", () => {
      const { container } = render(
        <ScrollReveal animate={false} as="section" className="custom-class" id="lane">
          Content
        </ScrollReveal>
      );
      const el = container.firstElementChild as HTMLElement;
      expect(el.tagName).toBe("SECTION");
      expect(el.className).toContain("custom-class");
      expect(el.id).toBe("lane");
    });

    it("still hides behind the reveal by default", () => {
      stubIdleObserver();
      const { container } = render(<ScrollReveal>Content</ScrollReveal>);
      expect((container.firstElementChild as HTMLElement).className).toContain(
        "scroll-reveal-hidden"
      );
    });
  });

  // #16 — the hidden class is cleared by an IntersectionObserver, so where the
  // API does not exist nothing ever clears it and the content stays at
  // `opacity: 0` for the life of the page. Revealing is the only safe reading of
  // "no trigger will ever arrive".
  describe("#16 · no IntersectionObserver reveals instead of hiding", () => {
    it("drops the hidden class when the observer API is absent", () => {
      // jsdom implements none; asserted so the premise cannot silently change.
      expect(typeof IntersectionObserver).toBe("undefined");

      const { container } = render(<ScrollReveal>Content</ScrollReveal>);
      const el = container.firstElementChild as HTMLElement;

      expect(el.className).not.toContain("scroll-reveal-hidden");
      expect(screen.getByText("Content")).toBeVisible();
    });

    it("reveals statically — no entrance animation and no delay", () => {
      const { container } = render(<ScrollReveal delay={200}>Content</ScrollReveal>);
      const el = container.firstElementChild as HTMLElement;

      // There was never a trigger, so there is nothing to animate *from*.
      expect(el.className).not.toContain("fade-up");
      expect(el.style.animationDelay).toBe("");
    });

    // The other half of #16 — a visitor with scripting switched off — is CSS
    // only (`@media (scripting: none)` in ScrollReveal.css) and unreachable from
    // here: vitest runs `css: false`, so no test in this package reads a
    // stylesheet. Verified in Firefox 146 by screenshotting the same element at
    // the same position with `javaScriptEnabled` true then false: the hidden box
    // painted only in the second, alongside an always-visible control box.
    it("still honours animate={false} with no observer available", () => {
      const { container } = render(
        <ScrollReveal animate={false} className="custom-class">
          Content
        </ScrollReveal>
      );
      const el = container.firstElementChild as HTMLElement;

      expect(el.className).not.toContain("scroll-reveal-hidden");
      expect(el.className).toContain("custom-class");
    });
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
