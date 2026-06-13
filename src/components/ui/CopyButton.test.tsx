import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "./CopyButton";

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

function removeClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: undefined,
    configurable: true,
  });
}

describe("CopyButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("calls writeText with value on click", async () => {
    const writeText = stubClipboard();
    render(<CopyButton value="hello" />);
    await act(async () => {
      screen.getByRole("button").click();
    });
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("flips to copied state then reverts after timeout", async () => {
    stubClipboard();
    render(<CopyButton value="hello" timeout={2000} />);
    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("aria-label", "Copy");
    expect(button).not.toHaveAttribute("data-copied");

    await act(async () => {
      button.click();
    });

    expect(button).toHaveAttribute("aria-label", "Copied");
    expect(button).toHaveAttribute("data-copied", "true");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(button).toHaveAttribute("aria-label", "Copy");
    expect(button).not.toHaveAttribute("data-copied");
  });

  it("uses custom copiedLabel", async () => {
    stubClipboard();
    render(<CopyButton value="hello" copiedLabel="Done!" />);
    const button = screen.getByRole("button");
    await act(async () => {
      button.click();
    });
    expect(button).toHaveAttribute("aria-label", "Done!");
    expect(screen.getByText("Done!")).toBeInTheDocument();
  });

  it("restarts the timer on rapid re-click", async () => {
    stubClipboard();
    render(<CopyButton value="hello" timeout={2000} />);
    const button = screen.getByRole("button");

    await act(async () => {
      button.click();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // still copied
    expect(button).toHaveAttribute("data-copied", "true");

    await act(async () => {
      button.click();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // timer restarted, so still copied past the original window
    expect(button).toHaveAttribute("data-copied", "true");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(button).not.toHaveAttribute("data-copied");
  });

  it("unmount clears the timer (no state update after unmount)", async () => {
    stubClipboard();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<CopyButton value="hello" timeout={2000} />);
    await act(async () => {
      screen.getByRole("button").click();
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("is a safe no-op when clipboard is missing", () => {
    removeClipboard();
    render(<CopyButton value="hello" />);
    const button = screen.getByRole("button");
    expect(() => button.click()).not.toThrow();
    expect(button).toHaveAttribute("aria-label", "Copy");
  });
});
