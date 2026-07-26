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
