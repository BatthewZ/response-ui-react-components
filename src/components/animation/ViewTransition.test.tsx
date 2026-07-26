import { act, render, renderHook, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Defaults to full motion — the reduced-motion path is opt-in per test via
// `motion.reduced = true`.
const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

import { useViewTransition, ViewTransition } from "./ViewTransition";

type StartViewTransition = (callback: () => unknown) => unknown;

/** Installs a `document.startViewTransition` that hands back the callback it was given. */
function stubStartViewTransition() {
  const calls: (() => unknown)[] = [];
  const start = vi.fn<StartViewTransition>((callback) => {
    calls.push(callback);
    return { finished: Promise.resolve(), ready: Promise.resolve(), skipTransition() {} };
  });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    writable: true,
    value: start,
  });
  return { start, calls };
}

function removeStartViewTransition() {
  Reflect.deleteProperty(document, "startViewTransition");
}

/** Drains the microtask queue so an awaited callback can settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  motion.reduced = false;
  removeStartViewTransition();
  vi.restoreAllMocks();
});

describe("ViewTransition", () => {
  it("renders children", () => {
    render(<ViewTransition name="hero">Hello</ViewTransition>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies view-transition-name style", () => {
    render(
      <ViewTransition name="hero" data-testid="vt">
        Content
      </ViewTransition>
    );
    const el = screen.getByTestId("vt");
    expect(el.style.viewTransitionName).toBe("hero");
  });

  it("merges custom className", () => {
    render(
      <ViewTransition name="card" className="custom-class" data-testid="vt">
        Styled
      </ViewTransition>
    );
    expect(screen.getByTestId("vt").className).toContain("custom-class");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ViewTransition name="test" ref={ref}>
        Ref
      </ViewTransition>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("useViewTransition", () => {
  it("calls navigate directly when the browser has no View Transitions", () => {
    removeStartViewTransition();
    const navigate = vi.fn();
    const { result } = renderHook(() => useViewTransition(navigate));

    act(() => result.current("/dashboard"));

    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });

  it("runs navigate inside startViewTransition when supported", () => {
    const { start, calls } = stubStartViewTransition();
    const navigate = vi.fn();
    const { result } = renderHook(() => useViewTransition(navigate));

    act(() => result.current("/dashboard"));

    expect(start).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    void calls[0]!();
    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });

  // #18 — the callback used to be `() => void navigate(...)`, which discards the
  // promise. `startViewTransition` then snapshots the pre-navigation DOM as the
  // "new" state and an async router gets no transition at all.
  it("#18 · returns navigate's promise so the transition waits for it", async () => {
    const { calls } = stubStartViewTransition();
    let commit!: () => void;
    const visited: string[] = [];
    const navigate = vi.fn((path: string) => {
      visited.push(path);
      return new Promise<void>((resolve) => (commit = resolve));
    });
    const { result } = renderHook(() => useViewTransition(navigate));

    act(() => result.current("/dashboard"));

    const settled = vi.fn();
    void Promise.resolve(calls[0]!()).then(settled);

    await flush();
    // Navigation is still in flight, so the callback has not settled.
    expect(settled).not.toHaveBeenCalled();

    commit();
    await flush();
    expect(settled).toHaveBeenCalledTimes(1);
    expect(visited).toEqual(["/dashboard"]);
  });

  it("#18 · a synchronous navigate still settles the callback", async () => {
    const { calls } = stubStartViewTransition();
    const navigate = vi.fn();
    const { result } = renderHook(() => useViewTransition(navigate));

    act(() => result.current("/dashboard"));

    const settled = vi.fn();
    void Promise.resolve(calls[0]!()).then(settled);
    await flush();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledTimes(1);
  });

  // #19 — neither export consulted `prefers-reduced-motion`. The CSS package
  // zeroes the root cross-fade, but a named `<ViewTransition name="x">` group
  // still morphed; skipping the transition entirely is what stops that.
  it("#19 · skips the transition under reduced motion and navigates anyway", () => {
    motion.reduced = true;
    const { start } = stubStartViewTransition();
    const navigate = vi.fn();
    const { result } = renderHook(() => useViewTransition(navigate));

    act(() => result.current("/dashboard"));

    expect(start).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });

  it("passes every argument through", () => {
    removeStartViewTransition();
    const navigate = vi.fn();
    const { result } = renderHook(() => useViewTransition(navigate));

    act(() => result.current("/products", { replace: true }));

    expect(navigate).toHaveBeenCalledWith("/products", { replace: true });
  });
});
