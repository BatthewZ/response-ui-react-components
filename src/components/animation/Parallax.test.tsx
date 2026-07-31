import { act, fireEvent, render, screen } from "@testing-library/react";
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
  vi.unstubAllGlobals();
});

import { Parallax } from "./Parallax";

/**
 * jsdom lays nothing out and its `getBoundingClientRect` ignores transforms, so
 * the geometry tests below stand a fixed layout box in for it — including the
 * applied `translateY`, which a real rect carries. Without that, the component's
 * "subtract the current transform" step is exercised against zeroes.
 */
const LAYOUT_TOP = 1000;
const LAYOUT_HEIGHT = 200;

function stubLayout() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement
  ) {
    const applied = Number(/translateY\((-?[\d.]+)px\)/.exec(this.style.transform)?.[1] ?? 0);
    return { top: LAYOUT_TOP + applied, height: LAYOUT_HEIGHT } as DOMRect;
  });
}

/** What the component should be showing for the current viewport height. */
const offsetFor = (rate: number) =>
  (LAYOUT_TOP + LAYOUT_HEIGHT / 2 - window.innerHeight / 2) * rate;

/** rAF-throttled work has to land inside the assertion, not a frame later. */
function stubSyncRaf() {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
}

/** A controllable IntersectionObserver — jsdom ships none at all. */
function stubIntersectionObserver() {
  const state: { emit: (isIntersecting: boolean) => void; init?: IntersectionObserverInit } = {
    emit: () => {},
  };
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
        state.init = init;
        state.emit = (isIntersecting) =>
          act(() => {
            cb(
              [{ isIntersecting } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver
            );
          });
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
  );
  return state;
}

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

  // Exact string, not `toContain`: arrival and the collapse of the caller's own
  // conflicting utilities are one assertion.
  it("merges custom className, collapsing the caller's conflicting utilities", () => {
    render(<Parallax className="custom-class p-r3 p-r5" data-testid="parallax">Styled</Parallax>);
    expect(screen.getByTestId("parallax").getAttribute("class")).toBe("custom-class p-r5");
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

  it("clears the applied transform when reduced motion turns on mid-scroll", () => {
    stubLayout();
    const { rerender } = render(
      <Parallax rate={0.5} data-testid="parallax">
        Content
      </Parallax>
    );
    const el = screen.getByTestId("parallax");
    expect(el.style.transform).toBe(`translateY(${offsetFor(0.5)}px)`);

    motion.reduced = true;
    rerender(
      <Parallax rate={0.5} data-testid="parallax">
        Content
      </Parallax>
    );

    // The layer returns to its layout position rather than freezing where it
    // had drifted to; the hint goes with it.
    expect(el.style.transform).toBe("");
    expect(el.style.willChange).toBe("");
  });

  it("recomputes the offset when the viewport is resized", () => {
    stubLayout();
    stubSyncRaf();
    render(
      <Parallax rate={0.5} data-testid="parallax">
        Content
      </Parallax>
    );
    const el = screen.getByTestId("parallax");
    expect(el.style.transform).toBe(`translateY(${offsetFor(0.5)}px)`);

    const stale = el.style.transform;
    vi.stubGlobal("innerHeight", 300);
    stubSyncRaf();
    fireEvent(window, new Event("resize"));

    expect(el.style.transform).not.toBe(stale);
    expect(el.style.transform).toBe(`translateY(${offsetFor(0.5)}px)`);
  });

  it("hints will-change only while the layer is near the viewport", () => {
    const observer = stubIntersectionObserver();
    render(<Parallax data-testid="parallax">Content</Parallax>);
    const el = screen.getByTestId("parallax");

    // Nothing is promoted before the observer has reported.
    expect(el.style.willChange).toBe("");
    expect(observer.init).toEqual({ rootMargin: "200px" });

    observer.emit(true);
    expect(el.style.willChange).toBe("transform");

    observer.emit(false);
    expect(el.style.willChange).toBe("");
  });

  it("promotes for the element's life when IntersectionObserver is unavailable", () => {
    // jsdom ships none, which is the fallback path: a hint for the whole life
    // beats no layer at all.
    expect(typeof IntersectionObserver).toBe("undefined");
    render(<Parallax data-testid="parallax">Content</Parallax>);
    expect(screen.getByTestId("parallax").style.willChange).toBe("transform");
  });
});
