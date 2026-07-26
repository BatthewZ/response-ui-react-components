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
  // The rest of #17 — a *consumer* setting `--stagger-delay` on an ancestor — is
  // closed by `Stagger.css` in this package (`--stagger-delay: inherit` plus an
  // `animation-delay` that reads the token as a fallback). Nothing below can
  // assert it: vitest runs `css: false`, so no test here reads a stylesheet at
  // all. Measured in Firefox 146 against the real components: an ancestor set to
  // `300ms` moved items 1 and 2 from 0.05s/0.1s to 0.3s/0.6s, while the
  // `staggerDelay` prop and the bare-token default were unchanged.
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
      expect(delays).toEqual(["100ms", "100ms"]);
    });

    it("does not leave the variable on the container, where it is shadowed", () => {
      const { container } = render(
        <Stagger staggerDelay="100ms">
          <span>A</span>
        </Stagger>
      );
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.getPropertyValue("--stagger-delay")).toBe("");
    });

    it("writes no delay variable at all when the prop is omitted", () => {
      const { container } = render(
        <Stagger>
          <span>A</span>
        </Stagger>
      );
      const item = container.querySelector<HTMLElement>(".stagger-item")!;
      expect(item.style.getPropertyValue("--stagger-delay")).toBe("");
      expect(item.style.getPropertyValue("--stagger-index")).toBe("0");
    });
  });

  it("merges custom className", () => {
    const { container } = render(
      <Stagger className="custom-class">
        <span>A</span>
      </Stagger>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("custom-class");
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

  it("leaves a caller `style` on the container untouched by the delay", () => {
    const { container } = render(
      <Stagger staggerDelay="100ms" style={{ marginTop: "8px" }}>
        <span>A</span>
      </Stagger>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.marginTop).toBe("8px");
    const item = container.querySelector<HTMLElement>(".stagger-item")!;
    expect(item.style.getPropertyValue("--stagger-delay")).toBe("100ms");
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
