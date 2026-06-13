import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useControllableState } from "./use-controllable-state";

describe("useControllableState", () => {
  it("returns the controlled value over the default", () => {
    const { result } = renderHook(() =>
      useControllableState({ value: "controlled", defaultValue: "default" })
    );
    expect(result.current[0]).toBe("controlled");
  });

  it("returns the default value when uncontrolled", () => {
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: "default" })
    );
    expect(result.current[0]).toBe("default");
  });

  it("ignores internal updates when controlled and reflects new controlled value", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) =>
        useControllableState({ value, defaultValue: "default", onChange }),
      { initialProps: { value: "a" } }
    );

    act(() => {
      result.current[1]("b");
    });

    // Setter does not mutate internal state in controlled mode.
    expect(result.current[0]).toBe("a");
    expect(onChange).toHaveBeenCalledWith("b");

    // Reads track the controlled value as the parent updates it.
    rerender({ value: "c" });
    expect(result.current[0]).toBe("c");
  });

  it("updates and persists internal state when uncontrolled", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: 0, onChange })
    );

    act(() => {
      result.current[1](1);
    });
    expect(result.current[0]).toBe(1);
    expect(onChange).toHaveBeenCalledWith(1);

    act(() => {
      result.current[1](2);
    });
    expect(result.current[0]).toBe(2);
  });

  it("fires onChange with the resolved value in both modes", () => {
    const uncontrolledOnChange = vi.fn();
    const { result: uncontrolled } = renderHook(() =>
      useControllableState({ defaultValue: 0, onChange: uncontrolledOnChange })
    );
    act(() => {
      uncontrolled.current[1](5);
    });
    expect(uncontrolledOnChange).toHaveBeenCalledWith(5);

    const controlledOnChange = vi.fn();
    const { result: controlled } = renderHook(() =>
      useControllableState({
        value: 10,
        defaultValue: 0,
        onChange: controlledOnChange,
      })
    );
    act(() => {
      controlled.current[1](99);
    });
    expect(controlledOnChange).toHaveBeenCalledWith(99);
  });

  it("resolves a functional updater against the latest value (uncontrolled)", () => {
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: 1 })
    );

    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    expect(result.current[0]).toBe(2);

    act(() => {
      result.current[1]((prev) => prev + 10);
    });
    expect(result.current[0]).toBe(12);
  });

  it("resolves a functional updater against the latest controlled value", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) =>
        useControllableState({ value, defaultValue: 0, onChange }),
      { initialProps: { value: 5 } }
    );

    rerender({ value: 7 });

    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    // prev resolves from the latest controlled value (7), not the default.
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("keeps a stable setter identity across renders", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, defaultValue: 0 }),
      { initialProps: { value: 1 } }
    );

    const firstSetter = result.current[1];
    rerender({ value: 2 });
    expect(result.current[1]).toBe(firstSetter);
  });

  it("does not flip modes mid-life when the controlled value becomes undefined", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number | undefined }) =>
        useControllableState({ value, defaultValue: 0 }),
      { initialProps: { value: 1 as number | undefined } }
    );

    // Starts controlled.
    expect(result.current[0]).toBe(1);

    // Even if the parent drops the controlled value, the mode stays locked.
    rerender({ value: undefined });
    act(() => {
      result.current[1](42);
    });
    // Still controlled — internal state is never adopted.
    expect(result.current[0]).toBe(undefined);
  });
});
