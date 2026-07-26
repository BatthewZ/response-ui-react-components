import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Alert } from "./Alert";

describe("Alert", () => {
  it("interrupts for error and waits its turn for the rest", () => {
    const { rerender } = render(<Alert variant="error">Boom</Alert>);
    // `role="alert"` implies assertive; an explicit `polite` alongside it
    // silently downgraded every variant, error included.
    const errorAlert = screen.getByRole("alert");
    expect(errorAlert).toHaveAttribute("aria-live", "assertive");

    for (const variant of ["success", "warning", "info"] as const) {
      rerender(<Alert variant={variant}>Notice</Alert>);
      const alert = screen.getByRole("status");
      expect(alert).toHaveAttribute("aria-live", "polite");
      expect(alert).not.toHaveAttribute("role", "alert");
    }
  });

  it("renders with a live-region role", () => {
    render(<Alert>Something happened</Alert>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByText("Alert message")).toBeInTheDocument();
  });

  it("applies success variant classes", () => {
    render(<Alert variant="success">Success</Alert>);
    const alert = screen.getByRole("status");
    expect(alert.className).toContain("bg-status-success-bg");
    expect(alert.className).toContain("text-status-success");
  });

  it("applies warning variant classes", () => {
    render(<Alert variant="warning">Warning</Alert>);
    const alert = screen.getByRole("status");
    expect(alert.className).toContain("bg-status-warning-bg");
    expect(alert.className).toContain("text-status-warning");
  });

  it("applies error variant classes", () => {
    render(<Alert variant="error">Error</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("bg-status-error-bg");
    expect(alert.className).toContain("text-status-error");
  });

  it("applies info variant classes by default", () => {
    render(<Alert>Info</Alert>);
    const alert = screen.getByRole("status");
    expect(alert.className).toContain("bg-status-info-bg");
    expect(alert.className).toContain("text-status-info");
  });

  it("forwards className prop", () => {
    render(<Alert className="custom-alert">Styled</Alert>);
    const alert = screen.getByRole("status");
    expect(alert.className).toContain("custom-alert");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Alert ref={ref}>Ref alert</Alert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(screen.getByRole("status"));
  });

  it("lets a caller override the live-region wiring", () => {
    render(
      <Alert role="note" aria-live="off">
        Static notice
      </Alert>,
    );
    const alert = screen.getByRole("note");
    expect(alert).toHaveAttribute("aria-live", "off");
  });
});

// #1 — severity was carried by the tint and nothing else, so an error and a
// success alert with the same message were byte-identical to a screen reader.
describe("Alert · severity has a text channel", () => {
  it("announces the severity word ahead of the message", () => {
    render(<Alert variant="error">Payment failed</Alert>);
    const alert = screen.getByRole("alert");
    const word = screen.getByText("Error");
    expect(word.className).toContain("sr-only");
    // First child: the severity is read before the message, not after it.
    expect(alert.firstElementChild).toBe(word);
  });

  it("labels every variant", () => {
    const cases = [
      ["success", "Success"],
      ["warning", "Warning"],
      ["info", "Information"],
    ] as const;

    for (const [variant, word] of cases) {
      const { unmount } = render(<Alert variant={variant}>Notice</Alert>);
      expect(screen.getByText(word).className).toContain("sr-only");
      unmount();
    }
  });

  it("statusLabel replaces the default word", () => {
    render(
      <Alert variant="error" statusLabel="Fehler">
        Zahlung fehlgeschlagen
      </Alert>,
    );
    expect(screen.getByText("Fehler").className).toContain("sr-only");
    expect(screen.queryByText("Error")).not.toBeInTheDocument();
  });

  it("statusLabel='' drops it for a message that already names the severity", () => {
    render(
      <Alert variant="error" statusLabel="">
        Error: payment failed
      </Alert>,
    );
    expect(screen.getByRole("alert").querySelector(".sr-only")).toBeNull();
  });
});

// #1, visual half — the severity word closed the assistive-tech half and left the
// tint as the only channel a sighted colour-blind reader has. The glyph is the
// second *visible* channel; it is decorative because `statusLabel` already
// announces the severity, and a named icon would announce it twice.
describe("Alert · severity is visible without colour", () => {
  const icon = (root: HTMLElement) => root.querySelector("svg");

  it("renders one glyph per variant, and it is decorative", () => {
    const cases = ["success", "warning", "error", "info"] as const;
    for (const variant of cases) {
      const { unmount } = render(<Alert variant={variant}>Notice</Alert>);
      const root = screen.getByRole(variant === "error" ? "alert" : "status");
      const svg = icon(root);
      expect(svg).not.toBeNull();
      // Every route into the accessible name, closed. The word already reaches
      // the live region; a named glyph would make it announce twice.
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).not.toHaveAttribute("aria-label");
      expect(svg).not.toHaveAttribute("aria-labelledby");
      expect(svg).not.toHaveAttribute("role");
      expect(svg!.querySelector("title")).toBeNull();
      unmount();
    }
  });

  it("the glyph is a different one per variant", () => {
    const seen = new Set<string>();
    for (const variant of ["success", "warning", "error", "info"] as const) {
      const { unmount } = render(<Alert variant={variant}>Notice</Alert>);
      const root = screen.getByRole(variant === "error" ? "alert" : "status");
      seen.add(icon(root)?.getAttribute("class") ?? "");
      unmount();
    }
    expect(seen.size).toBe(4);
  });

  it("adds no text, so the severity is not announced twice", () => {
    render(<Alert variant="error">Payment failed</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("ErrorPayment failed");
  });

  it("statusIcon replaces the default glyph", () => {
    render(
      <Alert variant="error" statusIcon={<i data-testid="mine" aria-hidden="true" />}>
        Boom
      </Alert>,
    );
    expect(screen.getByTestId("mine")).toBeInTheDocument();
    expect(screen.getByRole("alert").querySelector("svg")).toBeNull();
  });

  it("statusIcon={null} drops it, the twin of statusLabel=''", () => {
    render(
      <Alert variant="error" statusIcon={null}>
        Boom
      </Alert>,
    );
    expect(screen.getByRole("alert").querySelector("svg")).toBeNull();
  });
});
