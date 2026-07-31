import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Toast } from "./Toast";

describe("Toast", () => {
  it("renders message text", () => {
    render(<Toast onDismiss={vi.fn()}>Something happened</Toast>);
    expect(screen.getByText("Something happened")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <Toast onDismiss={vi.fn()} title="Heads up">
        Details here
      </Toast>,
    );
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Details here")).toBeInTheDocument();
  });

  it("applies success variant classes", () => {
    render(
      <Toast variant="success" onDismiss={vi.fn()}>
        Success
      </Toast>,
    );
    const toast = screen.getByRole("status");
    expect(toast.className).toContain("bg-status-success-bg");
  });

  it("applies warning variant classes", () => {
    render(
      <Toast variant="warning" onDismiss={vi.fn()}>
        Warning
      </Toast>,
    );
    const toast = screen.getByRole("status");
    expect(toast.className).toContain("bg-status-warning-bg");
  });

  it("applies error variant classes", () => {
    render(
      <Toast variant="error" onDismiss={vi.fn()}>
        Error
      </Toast>,
    );
    const toast = screen.getByRole("alert");
    expect(toast.className).toContain("bg-status-error-bg");
  });

  it("applies info variant classes", () => {
    render(
      <Toast variant="info" onDismiss={vi.fn()}>
        Info
      </Toast>,
    );
    const toast = screen.getByRole("status");
    expect(toast.className).toContain("bg-status-info-bg");
  });

  it("shows dismiss button", () => {
    render(<Toast onDismiss={vi.fn()}>Message</Toast>);
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("#476: dismissLabel names the dismiss button, and empty falls back", () => {
    const { rerender } = render(
      <Toast onDismiss={vi.fn()} dismissLabel="Schließen">
        Message
      </Toast>,
    );
    expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();

    // Not the `statusLabel=""` convention: this string is the button's only
    // accessible name, so an empty one is a defect rather than an opt-out.
    rerender(
      <Toast onDismiss={vi.fn()} dismissLabel="">
        Message
      </Toast>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("clicking dismiss calls onDismiss", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Toast onDismiss={onDismiss}>Message</Toast>);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  // jsdom resolves no pointer state, so the hover treatment can only be asserted as
  // classes. What matters is the pair: no neutral surface step survives the merge, and
  // the fills that replace them read `currentColor` — which inside a toast is the
  // variant's own `text-status-*`, so one string tints correctly for all four.
  it("dismiss button tints from the variant's ink, never the neutral surfaces", () => {
    render(<Toast onDismiss={vi.fn()}>Message</Toast>);
    const btn = screen.getByRole("button", { name: "Dismiss" });

    expect(btn.className).not.toMatch(/bg-surface-\d/);
    expect(btn).toHaveClass("hover:bg-current/10", "active:bg-current/15");
    // `text-current` is load-bearing: it resolves to `inherit`, which is what puts the
    // variant ink on the button for `bg-current` to read. Without it the button keeps
    // IconButton's own `text-fg-secondary` and every variant would tint the same grey.
    expect(btn).toHaveClass("text-current");
    expect(btn).not.toHaveClass("text-fg-secondary");
  });

  // The glyph deliberately does not join the tint — measured across the four example
  // themes the neutral mark holds 6.9–7.3:1 on these backgrounds, the variant ink 3.1–4.8.
  it("keeps the dismiss glyph on the neutral ink", () => {
    render(<Toast onDismiss={vi.fn()}>Message</Toast>);
    const glyph = screen.getByRole("button", { name: "Dismiss" }).querySelector("svg");

    expect(glyph).toHaveClass("text-fg-secondary");
  });

  it("has role='alert' for error variant", () => {
    render(
      <Toast variant="error" onDismiss={vi.fn()}>
        Error toast
      </Toast>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("has role='status' for non-error variants", () => {
    const { rerender } = render(
      <Toast variant="success" onDismiss={vi.fn()}>
        Toast
      </Toast>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(
      <Toast variant="warning" onDismiss={vi.fn()}>
        Toast
      </Toast>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(
      <Toast variant="info" onDismiss={vi.fn()}>
        Toast
      </Toast>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-live='assertive' for error variant", () => {
    render(
      <Toast variant="error" onDismiss={vi.fn()}>
        Error
      </Toast>,
    );
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("has aria-live='polite' for non-error variants", () => {
    render(
      <Toast variant="success" onDismiss={vi.fn()}>
        Success
      </Toast>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("guards its slide animation for prefers-reduced-motion", () => {
    // The CSS package's reduced-motion block covers the `.fade-*`/`.slide-*`
    // classes, not the `animate-*` utilities this component uses.
    const { rerender } = render(<Toast onDismiss={vi.fn()}>In</Toast>);
    expect(screen.getByRole("status").className).toContain("animate-slide-in-right");
    expect(screen.getByRole("status").className).toContain("motion-reduce:animate-none");

    rerender(
      <Toast onDismiss={vi.fn()} dismissing>
        Out
      </Toast>,
    );
    expect(screen.getByRole("status").className).toContain("animate-slide-out-right");
    expect(screen.getByRole("status").className).toContain("motion-reduce:animate-none");
  });

  it("returns focus to where it was before dismissing", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [shown, setShown] = useState(true);
      return (
        <>
          <button>Before</button>
          {shown && <Toast onDismiss={() => setShown(false)}>Message</Toast>}
        </>
      );
    }

    render(<Harness />);
    const before = screen.getByRole("button", { name: "Before" });
    before.focus();

    await user.tab();
    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    expect(dismiss).toHaveFocus();

    await user.click(dismiss);

    // Without restoration the browser drops focus on <body>.
    expect(before).toHaveFocus();
  });

  it("defaults to info variant", () => {
    render(<Toast onDismiss={vi.fn()}>Default</Toast>);
    const toast = screen.getByRole("status");
    expect(toast.className).toContain("bg-status-info-bg");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });
});

// #104 — variant severity was colour-only, so a success and an error toast were
// identical to a screen reader.
describe("Toast · severity has a text channel", () => {
  it("announces the severity word ahead of the title and the message", () => {
    render(
      <Toast variant="error" title="Heads up" onDismiss={vi.fn()}>
        Payment failed
      </Toast>,
    );
    const word = screen.getByText("Error");
    expect(word.className).toContain("sr-only");
    // Inside the live region, and before the title it qualifies.
    expect(screen.getByRole("alert")).toContainElement(word);
    expect(word.nextElementSibling).toHaveTextContent("Heads up");
  });

  it("labels every variant", () => {
    const cases = [
      ["success", "Success"],
      ["warning", "Warning"],
      ["info", "Information"],
    ] as const;

    for (const [variant, word] of cases) {
      const { unmount } = render(
        <Toast variant={variant} onDismiss={vi.fn()}>
          Notice
        </Toast>,
      );
      expect(screen.getByText(word).className).toContain("sr-only");
      unmount();
    }
  });

  it("statusLabel replaces the default word, and '' removes it", () => {
    const { rerender } = render(
      <Toast variant="error" statusLabel="Fehler" onDismiss={vi.fn()}>
        Nachricht
      </Toast>,
    );
    expect(screen.getByText("Fehler").className).toContain("sr-only");
    expect(screen.queryByText("Error")).not.toBeInTheDocument();

    rerender(
      <Toast variant="error" statusLabel="" onDismiss={vi.fn()}>
        Nachricht
      </Toast>,
    );
    expect(screen.getByRole("alert").querySelector(".sr-only")).toBeNull();
  });
});

// #104, visual half — the hidden word closed the assistive-tech half and left
// the tint as the only channel a sighted colour-blind reader has.
describe("Toast · severity is visible without colour", () => {
  // The dismiss button's own glyph is a hand-rolled <svg> inside a <button>, so
  // excluding what the button owns is what keeps this about the status icon.
  // Depth-agnostic on purpose: both glyphs sit in an alignment wrapper.
  const icon = (root: HTMLElement) =>
    Array.from(root.querySelectorAll("svg")).find((s) => !s.closest("button")) ?? null;

  it("renders one glyph per variant, and it is decorative", () => {
    for (const variant of ["success", "warning", "error", "info"] as const) {
      const { unmount } = render(
        <Toast variant={variant} onDismiss={vi.fn()}>
          Notice
        </Toast>,
      );
      const root = screen.getByRole(variant === "error" ? "alert" : "status");
      const svg = icon(root);
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).not.toHaveAttribute("aria-label");
      expect(svg).not.toHaveAttribute("aria-labelledby");
      expect(svg).not.toHaveAttribute("role");
      expect(svg!.querySelector("title")).toBeNull();
      unmount();
    }
  });

  it("gives each variant a different glyph", () => {
    const seen = new Set<string>();
    for (const variant of ["success", "warning", "error", "info"] as const) {
      const { unmount } = render(
        <Toast variant={variant} onDismiss={vi.fn()}>
          Notice
        </Toast>,
      );
      const root = screen.getByRole(variant === "error" ? "alert" : "status");
      seen.add(icon(root)?.getAttribute("class") ?? "");
      unmount();
    }
    expect(seen.size).toBe(4);
  });

  it("adds no text, so the severity is not announced twice", () => {
    render(
      <Toast variant="error" title="Payment failed" onDismiss={vi.fn()}>
        Card declined
      </Toast>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("ErrorPayment failedCard declined");
  });

  it("statusIcon replaces it, and null drops it", () => {
    const { rerender } = render(
      <Toast variant="error" statusIcon={<i data-testid="mine" aria-hidden="true" />} onDismiss={vi.fn()}>
        Nachricht
      </Toast>,
    );
    expect(screen.getByTestId("mine")).toBeInTheDocument();
    expect(icon(screen.getByRole("alert"))).toBeNull();

    rerender(
      <Toast variant="error" statusIcon={null} onDismiss={vi.fn()}>
        Nachricht
      </Toast>,
    );
    expect(icon(screen.getByRole("alert"))).toBeNull();
  });
});

describe("Toast · classNames slots", () => {
  type ToastSlots = NonNullable<React.ComponentProps<typeof Toast>["classNames"]>;

  function renderToast(classNames?: ToastSlots) {
    return render(
      <Toast title="Saved" onDismiss={vi.fn()} classNames={classNames}>
        All good
      </Toast>,
    );
  }

  /**
   * One slot-override test per slot, and each is the falsifier for its own
   * merge: delete that element's `cn()` and exactly this test must go red.
   */
  it("lands classNames.icon on the glyph's first-line box, beside the base classes", () => {
    const { container } = renderToast({ icon: "self-center" });
    const box = container.querySelector("span.self-center");
    expect(box?.getAttribute("class")).toContain("h-[1lh]");
    expect(box?.getAttribute("class")).toContain("self-center");
  });

  it("lands classNames.body on the message column, beside the base classes", () => {
    const { container } = renderToast({ body: "text-body-3" });
    const body = container.querySelector("div.flex-1");
    expect(body?.getAttribute("class")).toContain("min-w-0");
    expect(body?.getAttribute("class")).toContain("text-body-3");
  });

  it("lands classNames.title on the title line, beside the base class", () => {
    const { container } = renderToast({ title: "text-heading-5" });
    const title = container.querySelector("p.text-heading-5");
    expect(title?.getAttribute("class")).toContain("font-semibold");
    expect(title?.textContent).toBe("Saved");
  });

  it("lands classNames.dismiss on the dismiss button, beside the base classes", () => {
    renderToast({ dismiss: "italic" });
    const button = screen.getByRole("button", { name: "Dismiss" });
    expect(button.className).toContain("shrink-0");
    expect(button.className).toContain("italic");
  });

  it("leaves each internal on its base classes alone when no slot is passed", () => {
    const { container } = renderToast();
    expect(container.querySelector("div.flex-1")?.getAttribute("class")).toBe("flex-1 min-w-0");
    expect(container.querySelector("p.font-semibold")?.getAttribute("class")).toBe("font-semibold");
    expect(screen.getByRole("button", { name: "Dismiss" }).className).not.toContain("italic");
  });

  it("does not put a slot class on the card", () => {
    const { container } = renderToast({
      icon: "self-center",
      body: "text-body-3",
      title: "text-heading-5",
      dismiss: "italic",
    });
    const card = container.firstElementChild?.getAttribute("class") ?? "";
    for (const slot of ["self-center", "text-body-3", "text-heading-5", "italic"]) {
      expect(card).not.toContain(slot);
    }
  });

  /**
   * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
   * compile error. It fails if TypeScript ever stops rejecting the key.
   */
  it("rejects an unknown slot key at compile time", () => {
    const { container } = render(
      <Toast
        onDismiss={vi.fn()}
        // @ts-expect-error — the visually-hidden severity word is (a); `announcer`
        // is a banned key.
        classNames={{ announcer: "not-sr-only" }}
      >
        All good
      </Toast>,
    );
    expect(container.querySelector("span.sr-only")?.getAttribute("class")).toBe("sr-only");
  });

  it("does not leak classNames onto the DOM", () => {
    const { container } = renderToast({ body: "text-body-3" });
    expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
  });
});
