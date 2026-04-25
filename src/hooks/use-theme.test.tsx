import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY, THEMES, useTheme } from "./use-theme";

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
  });

  it("returns the current theme as 'default' when no data-theme attribute is set", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("default");
  });

  it("returns all available themes", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.themes).toBe(THEMES);
    expect(result.current.themes).toEqual(["default", "events", "grimdark", "tech"]);
  });

  it("reads the current theme from data-theme attribute", () => {
    document.documentElement.setAttribute("data-theme", "grimdark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("grimdark");
  });

  it("falls back to 'default' for an unrecognized data-theme value", () => {
    document.documentElement.setAttribute("data-theme", "nonexistent");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("default");
  });

  it("setTheme updates the data-theme attribute and persists to localStorage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("tech");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("tech");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("tech");
  });

  it("setTheme('default') removes the data-theme attribute and localStorage entry", () => {
    document.documentElement.setAttribute("data-theme", "events");
    localStorage.setItem(STORAGE_KEY, "events");

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("default");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("updates theme reactively when data-theme attribute changes externally", async () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("default");

    // Simulate an external mutation (e.g., from another part of the app)
    act(() => {
      document.documentElement.setAttribute("data-theme", "events");
    });

    // MutationObserver is async; flush microtasks
    await vi.waitFor(() => {
      expect(result.current.theme).toBe("events");
    });
  });

  it("handles localStorage errors gracefully (e.g., private browsing)", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });

    const { result } = renderHook(() => useTheme());

    // Should not throw
    act(() => {
      result.current.setTheme("grimdark");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("grimdark");

    setItemSpy.mockRestore();
  });
});
