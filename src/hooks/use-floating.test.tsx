import { act, renderHook, waitFor } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFloating } from "./use-floating";

type FloatingConfig = Parameters<typeof useFloating>[0];

const VIEWPORT = { width: 1024, height: 768 };
const REFERENCE_RECT = { x: 100, y: 100, width: 50, height: 20 };

const spawned: HTMLElement[] = [];

/**
 * floating-ui reads the viewport from `documentElement.client{Width,Height}`,
 * which jsdom leaves at 0 — so without this every placement overflows and
 * `flip()`/`shift()` clamp the result to the origin, hiding the real maths.
 */
beforeEach(() => {
  for (const [prop, value] of [
    ["clientWidth", VIEWPORT.width],
    ["clientHeight", VIEWPORT.height],
  ] as const) {
    Object.defineProperty(document.documentElement, prop, {
      value,
      configurable: true,
    });
  }
});

afterEach(() => {
  for (const prop of ["clientWidth", "clientHeight"]) {
    delete (document.documentElement as unknown as Record<string, unknown>)[prop];
  }
  for (const el of spawned.splice(0)) el.remove();
  vi.restoreAllMocks();
});

/**
 * jsdom computes no layout, so every element reports a 0x0 box at the origin.
 * Stubbing the reference's rect gives the middleware real numbers to position
 * against; the floating element stays 0x0 (floating-ui takes its size from
 * layout, not from `getBoundingClientRect`), which is why the expectations
 * below are expressed purely in terms of the reference box.
 */
function spawn(rect?: typeof REFERENCE_RECT) {
  const el = document.createElement("div");
  if (rect) {
    el.getBoundingClientRect = () =>
      ({
        ...rect,
        top: rect.y,
        left: rect.x,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height,
        toJSON: () => rect,
      }) as DOMRect;
  }
  document.body.append(el);
  spawned.push(el);
  return el;
}

/** Renders the hook with both elements attached, so floating-ui actually positions. */
function renderFloating(config: FloatingConfig = {}) {
  const reference = spawn(REFERENCE_RECT);
  const floating = spawn();

  const utils = renderHook(() => {
    const floatingResult = useFloating(config);
    useLayoutEffect(() => {
      floatingResult.refs.setReference(reference);
      floatingResult.refs.setFloating(floating);
    }, [floatingResult.refs]);
    return floatingResult;
  });

  return { ...utils, reference, floating };
}

describe("useFloating", () => {
  it("stores the attached elements on refs.reference and refs.floating", async () => {
    const { result, reference, floating } = renderFloating();

    await waitFor(() => expect(result.current.isPositioned).toBe(true));

    expect(result.current.refs.reference.current).toBe(reference);
    expect(result.current.refs.floating.current).toBe(floating);
  });

  it("positions the floating element below the reference by the default 8px offset", async () => {
    const { result } = renderFloating();

    await waitFor(() => expect(result.current.isPositioned).toBe(true));

    // bottom placement: y = reference bottom (120) + 8; x centres on the reference.
    expect(result.current.floatingStyles).toMatchObject({
      position: "absolute",
      transform: "translate(125px, 128px)",
    });
  });

  it("returns the default placement of 'bottom'", () => {
    const { result } = renderHook(() => useFloating());

    expect(result.current.placement).toBe("bottom");
  });

  it("positions above and start-aligned for placement 'top-start'", async () => {
    const { result } = renderFloating({ placement: "top-start" });

    await waitFor(() => expect(result.current.isPositioned).toBe(true));

    expect(result.current.placement).toBe("top-start");
    // top: y = reference top (100) - 8; start: x = reference left (100).
    expect(result.current.floatingStyles.transform).toBe("translate(100px, 92px)");
  });

  it("offsetPx sets the gap between reference and floating element", async () => {
    const { result } = renderFloating({ offsetPx: 16 });

    await waitFor(() => expect(result.current.isPositioned).toBe(true));

    // 8px further from the reference bottom than the default offset of 8.
    expect(result.current.floatingStyles.transform).toBe("translate(125px, 136px)");
  });

  it("isPositioned stays false until both elements are attached", async () => {
    const reference = spawn(REFERENCE_RECT);
    const floating = spawn();
    const { result } = renderHook(() => useFloating());

    expect(result.current.isPositioned).toBe(false);
    expect(result.current.floatingStyles.transform).toBeUndefined();

    act(() => {
      result.current.refs.setReference(reference);
      result.current.refs.setFloating(floating);
    });

    await waitFor(() => expect(result.current.isPositioned).toBe(true));
    expect(result.current.floatingStyles.transform).toBe("translate(125px, 128px)");
  });

  it("removes its autoUpdate scroll/resize listeners on unmount", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { result, unmount } = renderFloating();
    await waitFor(() => expect(result.current.isPositioned).toBe(true));

    // `whileElementsMounted: autoUpdate` tracks both elements' overflow ancestors.
    const added = addSpy.mock.calls.filter(
      ([type]) => type === "scroll" || type === "resize",
    );
    expect(added).toHaveLength(4);
    expect(removeSpy).not.toHaveBeenCalled();

    unmount();

    for (const [type, handler] of added) {
      expect(removeSpy).toHaveBeenCalledWith(type, handler);
    }
    expect(removeSpy).toHaveBeenCalledTimes(added.length);
  });

  it("forwards open and onOpenChange to the floating-ui context", () => {
    const onOpenChange = vi.fn();

    const { result } = renderHook(() => useFloating({ open: true, onOpenChange }));

    expect(result.current.context.open).toBe(true);

    act(() => {
      result.current.context.onOpenChange(false);
    });

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
  });
});
