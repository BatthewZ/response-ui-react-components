import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders text content", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("default variant applies correct styling", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("bg-surface-2");
    expect(badge.className).toContain("text-fg-secondary");
  });

  // The children differ from the variant's own visually-hidden word on purpose:
  // identical text would make `getByText` ambiguous between the two nodes.
  it("success variant applies correct styling", () => {
    render(<Badge variant="success">Deployed</Badge>);
    const badge = screen.getByText("Deployed");
    expect(badge.className).toContain("bg-status-success-bg");
    expect(badge.className).toContain("text-status-success");
  });

  it("warning variant applies correct styling", () => {
    render(<Badge variant="warning">Degraded</Badge>);
    const badge = screen.getByText("Degraded");
    expect(badge.className).toContain("bg-status-warning-bg");
    expect(badge.className).toContain("text-status-warning");
  });

  it("error variant applies correct styling", () => {
    render(<Badge variant="error">Failed</Badge>);
    const badge = screen.getByText("Failed");
    expect(badge.className).toContain("bg-status-error-bg");
    expect(badge.className).toContain("text-status-error");
  });

  it("info variant applies correct styling", () => {
    render(<Badge variant="info">Queued</Badge>);
    const badge = screen.getByText("Queued");
    expect(badge.className).toContain("bg-status-info-bg");
    expect(badge.className).toContain("text-status-info");
  });

  it("forwards className prop", () => {
    render(<Badge className="custom-class">Styled</Badge>);
    expect(screen.getByText("Styled").className).toContain("custom-class");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>Ref</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current).toBe(screen.getByText("Ref"));
  });
});

// #44 — the variant was tint only, so `<Badge variant="error">3</Badge>` and its
// success twin announced identically.
describe("Badge · variant has a text channel", () => {
  it("emits a visually-hidden variant word ahead of the children", () => {
    const cases = [
      ["success", "Success"],
      ["warning", "Warning"],
      ["error", "Error"],
      ["info", "Information"],
    ] as const;

    for (const [variant, word] of cases) {
      const { unmount } = render(<Badge variant={variant}>3</Badge>);
      const hidden = screen.getByText(word);
      expect(hidden.className).toContain("sr-only");
      expect(screen.getByText("3").firstElementChild).toBe(hidden);
      unmount();
    }
  });

  it("adds nothing for the neutral default variant", () => {
    render(<Badge>Draft</Badge>);
    expect(screen.getByText("Draft").textContent).toBe("Draft");
  });

  it("statusLabel replaces the default word, and '' removes it", () => {
    const { rerender } = render(
      <Badge variant="error" statusLabel="Échec">
        3
      </Badge>,
    );
    expect(screen.getByText("Échec").className).toContain("sr-only");

    rerender(
      <Badge variant="error" statusLabel="">
        3 checks failed
      </Badge>,
    );
    expect(screen.getByText("3 checks failed").textContent).toBe("3 checks failed");
  });

  it("names the default variant when a caller asks it to", () => {
    render(<Badge statusLabel="Draft state">v2</Badge>);
    expect(screen.getByText("Draft state").className).toContain("sr-only");
  });
});

// #45 — `text-body-3` carries `--BodyText-3-line-height`, which the default scale
// sets to 1.75rem against a 0.75rem font, so the chip stood 2.25rem tall (measured
// in Firefox: 36px, = 28px leading + 2 x 4px `py-r6`). Vitest runs with `css: false`,
// so this asserts the class that resets it, not the resulting height.
describe("Badge · the chip is sized by its padding, not its leading", () => {
  it("resets the leading the type step brings with it", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New").className).toContain("leading-none");
  });
});
