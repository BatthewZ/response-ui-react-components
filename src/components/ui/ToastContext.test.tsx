import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach,describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "./ToastContext";

/** Helper component that exposes the toast API via buttons. */
function TestHarness() {
  const { toast, dismiss, dismissAll } = useToast();
  return (
    <>
      <button onClick={() => toast("Error toast", { variant: "error" })}>
        Add error toast
      </button>
      <button onClick={() => dismissAll()}>Dismiss all</button>
      <button
        onClick={() => {
          const id = toast("Hello toast");
          // Stash the id so tests can access it
          document.body.dataset.lastToastId = id;
        }}
      >
        Add toast
      </button>
      <button
        onClick={() =>
          toast("Success toast", { variant: "success", title: "Done" })
        }
      >
        Add success toast
      </button>
      <button
        onClick={() =>
          toast("Short toast", { duration: 1000 })
        }
      >
        Add short toast
      </button>
      <button
        onClick={() =>
          toast("Zahlung fehlgeschlagen", { variant: "error", statusLabel: "Fehler" })
        }
      >
        Add translated error toast
      </button>
      <button
        onClick={() => {
          const id = document.body.dataset.lastToastId;
          if (id) dismiss(id);
        }}
      >
        Dismiss last
      </button>
    </>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestHarness />
    </ToastProvider>,
  );
}

describe("ToastContext", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete document.body.dataset.lastToastId;
  });

  it("addToast adds a toast to the container", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add toast" }));

    expect(screen.getByText("Hello toast")).toBeInTheDocument();
  });

  it("toasts auto-dismiss after duration", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add short toast" }));
    expect(screen.getByText("Short toast")).toBeInTheDocument();

    // Past the duration (1000ms) first: the removal timer is scheduled from the
    // commit that marks the toast dismissing, so it cannot exist before then.
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    // Then past the exit animation.
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText("Short toast")).not.toBeInTheDocument();
  });

  it("removeToast removes a specific toast", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add toast" }));
    expect(screen.getByText("Hello toast")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss last" }));

    // Advance past dismiss animation (300ms)
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText("Hello toast")).not.toBeInTheDocument();
  });

  it("multiple toasts render simultaneously", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add toast" }));
    await user.click(screen.getByRole("button", { name: "Add success toast" }));

    expect(screen.getByText("Hello toast")).toBeInTheDocument();
    expect(screen.getByText("Success toast")).toBeInTheDocument();
  });

  it("announces through a container that exists before the first toast", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    // The live region is mounted with the provider, empty. A region inserted
    // together with its message is not announced.
    const region = document.querySelector<HTMLElement>('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region!.children).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Add toast" }));

    const toast = screen.getByText("Hello toast").closest("div[class*='bg-status']");
    expect(toast).not.toBeNull();
    expect(region!.contains(toast!)).toBe(true);
    // The toast must not be its own live region, or the announcement is
    // attributed to a region that did not exist a moment ago.
    expect(toast).not.toHaveAttribute("aria-live");
    expect(toast).not.toHaveAttribute("role");
  });

  it("keeps role='alert' on error toasts, the one insertion case AT special-cases", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add error toast" }));

    const toast = screen.getByRole("alert");
    expect(toast).toHaveAttribute("aria-live", "assertive");
  });

  // #104 — the severity word has to be reachable from the `toast()` call, which
  // is how the component is actually consumed; a prop only a hand-rendered
  // <Toast> can reach is not an override path.
  it("carries the severity word, and a caller's replacement, through toast options", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add error toast" }));
    expect(screen.getByText("Error").className).toContain("sr-only");

    await user.click(screen.getByRole("button", { name: "Add translated error toast" }));
    expect(screen.getByText("Fehler").className).toContain("sr-only");
  });

  it("renders toast with correct variant", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add success toast" }));

    const toast = screen.getByText("Success toast").closest("div[class*='bg-status']");
    expect(toast?.className).toContain("bg-status-success-bg");
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("dismissAll keeps a toast queued while the sweep is in flight", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add toast" }));
    await user.click(screen.getByRole("button", { name: "Dismiss all" }));
    await user.click(screen.getByRole("button", { name: "Add success toast" }));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText("Hello toast")).not.toBeInTheDocument();
    expect(screen.getByText("Success toast")).toBeInTheDocument();
  });

  it("issues ids without crypto.randomUUID (plain http has no secure context)", async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis.crypto, "randomUUID");
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderWithProvider();

      await user.click(screen.getByRole("button", { name: "Add toast" }));

      expect(screen.getByText("Hello toast")).toBeInTheDocument();
      expect(document.body.dataset.lastToastId).toBeTruthy();
    } finally {
      if (original) Object.defineProperty(globalThis.crypto, "randomUUID", original);
    }
  });

  it("waits out the theme's --MOTION-DURATION-EXIT before removing", async () => {
    // grimdark ships 350ms; a fixed 300ms wait truncates its exit animation.
    document.documentElement.style.setProperty("--MOTION-DURATION-EXIT", "600ms");
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderWithProvider();

      await user.click(screen.getByRole("button", { name: "Add toast" }));
      await user.click(screen.getByRole("button", { name: "Dismiss last" }));

      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getByText("Hello toast")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.queryByText("Hello toast")).not.toBeInTheDocument();
    } finally {
      document.documentElement.style.removeProperty("--MOTION-DURATION-EXIT");
    }
  });

  it("cancels every pending timer on unmount", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add toast" }));
    await user.click(screen.getByRole("button", { name: "Dismiss all" }));

    unmount();

    // A timer the provider never recorded survives its own cleanup and writes
    // state into an unmounted tree.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("dismiss button on toast removes it", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "Add toast" }));
    expect(screen.getByText("Hello toast")).toBeInTheDocument();

    // Click the dismiss button rendered inside the Toast component
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText("Hello toast")).not.toBeInTheDocument();
  });
});
