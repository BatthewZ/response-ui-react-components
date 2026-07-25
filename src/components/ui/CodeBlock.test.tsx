import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CodeBlock } from "./CodeBlock";

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

describe("CodeBlock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the code text", () => {
    render(<CodeBlock code="const x = 1;" copyable={false} />);
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("shows the filename header when provided", () => {
    render(<CodeBlock code="x" filename="app.ts" copyable={false} />);
    expect(screen.getByText("app.ts")).toBeInTheDocument();
  });

  it("shows a lowercased language label", () => {
    render(<CodeBlock code="x" language="TypeScript" copyable={false} />);
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("uses the filename as the region aria-label, defaulting to 'Code block'", () => {
    const { rerender } = render(<CodeBlock code="x" filename="main.rs" copyable={false} />);
    expect(screen.getByRole("region")).toHaveAttribute("aria-label", "main.rs");

    rerender(<CodeBlock code="x" copyable={false} />);
    expect(screen.getByRole("region")).toHaveAttribute("aria-label", "Code block");
  });

  it("renders one .code-block-line per line in line-number mode without a phantom trailing line", () => {
    const { container } = render(
      <CodeBlock code={"a\nb\nc\n"} showLineNumbers copyable={false} />
    );
    const lines = container.querySelectorAll(".code-block-line");
    // Trailing newline is stripped -> exactly 3 lines, not 4.
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent("a");
    expect(lines[2]).toHaveTextContent("c");
  });

  it("renders a copy button that writes the full code when copyable", async () => {
    const writeText = stubClipboard();
    const code = "line one\nline two\nline three\n";
    render(<CodeBlock code={code} showLineNumbers />);

    const button = screen.getByRole("button", { name: "Copy" });
    await act(async () => {
      button.click();
    });

    // CopyButton must receive the raw `code` prop (including the trailing
    // newline) — not the per-line split used for numbering.
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(code);
  });

  it("hides the copy button when copyable is false", () => {
    render(<CodeBlock code="x" filename="a.ts" copyable={false} />);
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("forwards a ref to the block element", () => {
    let node: HTMLDivElement | null = null;
    render(
      <CodeBlock
        code="x"
        copyable={false}
        ref={(el) => {
          node = el;
        }}
      />
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });
});
