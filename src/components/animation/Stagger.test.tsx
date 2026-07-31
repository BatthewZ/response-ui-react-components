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

import { Stagger } from "./Stagger";

describe("Stagger", () => {
  it("renders children", () => {
    render(
      <Stagger>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </Stagger>
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("wraps children in stagger-item divs with stagger index", () => {
    const { container } = render(
      <Stagger>
        <span>A</span>
        <span>B</span>
      </Stagger>
    );
    const items = container.querySelectorAll(".stagger-item");
    expect(items).toHaveLength(2);
    expect((items[0] as HTMLElement).style.getPropertyValue("--stagger-index")).toBe("0");
    expect((items[1] as HTMLElement).style.getPropertyValue("--stagger-index")).toBe("1");
  });

  // #17 — the variable used to be written on the container, where it can never
  // reach the animation: `.stagger-item` in @batthewz/response-ui-css re-declares
  // `--stagger-delay: var(--MOTION-STAGGER-DELAY)` on the item itself, so the
  // inherited value is shadowed. Measured in Firefox 146 with the shipped rule:
  // container-set `300ms` resolved to `50ms` on the item (animation-delay 0.1s at
  // index 2); item-set `300ms` resolved to `300ms` (animation-delay 0.6s).
  //
  // WHAT CHANGED IN PHASE 1, AND WHY THESE TESTS GOT STRONGER. The rest of #17 —
  // a *consumer* setting `--stagger-delay` on an ancestor — used to be closed by
  // `Stagger.css` (`--stagger-delay: inherit`), which won only because this
  // package's CSS was unlayered; from `@layer components` it loses to the
  // foundation's rule at any specificity. `Stagger.css` is therefore deleted and
  // the whole mechanism is inline: the CONTAINER resolves the step once into
  // `--_stagger-step`, and every ITEM carries an inline
  // `--stagger-delay: var(--_stagger-step)`. Inline is the only declaration the
  // foundation's rule cannot shadow, which is the same #17 conclusion reached a
  // second way — the value must land on the element that consumes it.
  //
  // Because the mechanism moved from CSS into inline style, jsdom can see it for
  // the first time: vitest runs `css: false`, so the ancestor path had no
  // assertion at all before and only a Firefox measurement in this comment.
  // Re-measured against the layered build with `bun run probe:cascade-layer`:
  // `stagger-ancestor-inherit` (ancestor 999ms, index 1) reads 0.999s and
  // `stagger-token-default` (nobody sets it, index 2) reads 0.1s, in both the
  // layered and unlayered builds.
  describe("#17 · staggerDelay reaches the element that consumes it", () => {
    it("writes --stagger-delay on every item wrapper", () => {
      const { container } = render(
        <Stagger staggerDelay="100ms">
          <span>A</span>
          <span>B</span>
        </Stagger>
      );
      const delays = Array.from(
        container.querySelectorAll<HTMLElement>(".stagger-item"),
        (item) => item.style.getPropertyValue("--stagger-delay")
      );
      // A reference, not the literal: the value itself is resolved once on the
      // container. What #17 requires is that the DECLARATION is on the item,
      // which is what makes it unshadowable — and that is what this asserts.
      expect(delays).toEqual(["var(--_stagger-step)", "var(--_stagger-step)"]);
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.getPropertyValue("--_stagger-step")).toBe("100ms");
    });

    it("does not leave the variable on the container, where it is shadowed", () => {
      const { container } = render(
        <Stagger staggerDelay="100ms">
          <span>A</span>
        </Stagger>
      );
      const el = container.firstElementChild as HTMLElement;
      // `--_stagger-step` deliberately, never `--stagger-delay`: writing the
      // consumed name here would re-open #17, because `.stagger-item` re-declares
      // it and the inherited value would be shadowed again.
      expect(el.style.getPropertyValue("--stagger-delay")).toBe("");
    });

    it("carries the fallback chain when the prop is omitted", () => {
      const { container } = render(
        <Stagger>
          <span>A</span>
        </Stagger>
      );
      const el = container.firstElementChild as HTMLElement;
      // The two remaining delay sources, in priority order, resolved on the
      // container: an ancestor's `--stagger-delay`, then the contract token. The
      // fallback lives INSIDE the reference on purpose — an inline
      // `animation-delay` carrying it would have made the foundation's own
      // reduced-motion guard inert.
      expect(el.style.getPropertyValue("--_stagger-step")).toBe(
        "var(--stagger-delay, var(--MOTION-STAGGER-DELAY))"
      );
      const item = container.querySelector<HTMLElement>(".stagger-item")!;
      expect(item.style.getPropertyValue("--stagger-delay")).toBe("var(--_stagger-step)");
      expect(item.style.getPropertyValue("--stagger-index")).toBe("0");
    });
  });

  // Exact string, not `toContain`: arrival and the collapse of the caller's own
  // conflicting utilities are one assertion.
  it("merges custom className, collapsing the caller's conflicting utilities", () => {
    const { container } = render(
      <Stagger className="custom-class p-r3 p-r5">
        <span>A</span>
      </Stagger>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("class")).toBe("custom-class p-r5");
  });

  // #10 — the public type accepts the rendered element's whole prop set.
  it("forwards rest props onto the rendered element", () => {
    const { container } = render(
      <Stagger id="cards" aria-label="Highlights" data-analytics="grid">
        <span>A</span>
      </Stagger>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.id).toBe("cards");
    expect(el.getAttribute("aria-label")).toBe("Highlights");
    expect(el.dataset.analytics).toBe("grid");
  });

  it("forwards rest props onto a custom `as` element", () => {
    const { container } = render(
      <Stagger as="ul" id="items">
        <li>A</li>
      </Stagger>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe("UL");
    expect(el.id).toBe("items");
  });

  it("forwards caller event handlers", () => {
    const onClick = vi.fn();
    const { container } = render(
      <Stagger onClick={onClick}>
        <span>A</span>
      </Stagger>
    );
    fireEvent.click(container.firstElementChild!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("merges its own container variable with a caller `style`, caller last", () => {
    const { container } = render(
      <Stagger staggerDelay="100ms" style={{ marginTop: "8px" }}>
        <span>A</span>
      </Stagger>
    );
    const el = container.firstElementChild as HTMLElement;
    // The container `style` is no longer handed over untouched — `--_stagger-step`
    // is merged in first, so every key of the caller's still wins.
    expect(el.style.marginTop).toBe("8px");
    expect(el.style.getPropertyValue("--_stagger-step")).toBe("100ms");
    const item = container.querySelector<HTMLElement>(".stagger-item")!;
    expect(item.style.getPropertyValue("--stagger-delay")).toBe("var(--_stagger-step)");
  });

  it("lets a caller `style` override the container variable", () => {
    const { container } = render(
      <Stagger
        staggerDelay="100ms"
        style={{ "--_stagger-step": "40ms" } as React.CSSProperties}
      >
        <span>A</span>
      </Stagger>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--_stagger-step")).toBe("40ms");
  });

  it("collapses every stagger index to 0 under reduced motion", () => {
    motion.reduced = true;
    const { container } = render(
      <Stagger>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </Stagger>
    );

    const indices = Array.from(
      container.querySelectorAll<HTMLElement>(".stagger-item"),
      (item) => item.style.getPropertyValue("--stagger-index")
    );
    // Every item lands at once instead of cascading by index.
    expect(indices).toEqual(["0", "0", "0"]);
  });
});
