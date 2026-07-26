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

  /* ---------------------------------------------------------------- */
  /*  Landmark naming (#149, #153)                                     */
  /* ---------------------------------------------------------------- */

  it("uses the filename as the region's accessible name", () => {
    render(<CodeBlock code="x" filename="main.rs" copyable={false} />);
    expect(screen.getByRole("region", { name: "main.rs" })).toBeInTheDocument();
  });

  it("is not a landmark when there is nothing to name it (#153)", () => {
    render(<CodeBlock code="x" copyable={false} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("an empty filename does not produce a nameless landmark (#149)", () => {
    const { container } = render(<CodeBlock code="x" filename="" copyable={false} />);

    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(container.querySelector(".code-block")).not.toHaveAttribute("aria-label");
  });

  it("a caller's aria-label names the region even with no filename", () => {
    render(<CodeBlock code="x" aria-label="Install command" copyable={false} />);
    expect(screen.getByRole("region", { name: "Install command" })).toBeInTheDocument();
  });

  it("a caller's aria-labelledby names the region", () => {
    render(
      <>
        <h2 id="snippet-heading">Snippet</h2>
        <CodeBlock code="x" aria-labelledby="snippet-heading" copyable={false} />
      </>
    );
    expect(screen.getByRole("region", { name: "Snippet" })).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  The scrollport is keyboard-reachable (#148)                      */
  /* ---------------------------------------------------------------- */

  it("puts the tab stop on the <pre> that actually scrolls", () => {
    const { container } = render(<CodeBlock code="x" copyable={false} />);

    const pre = container.querySelector("pre.code-block-pre");
    expect(pre).toHaveAttribute("tabindex", "0");

    (pre as HTMLElement).focus();
    expect(document.activeElement).toBe(pre);
  });

  /* ---------------------------------------------------------------- */
  /*  Line endings and the trailing newline (#150, #151)               */
  /* ---------------------------------------------------------------- */

  it("does not leave a stray CR in a line's text (#150)", () => {
    const { container } = render(
      <CodeBlock code={"a\r\nb\r\n"} showLineNumbers copyable={false} />
    );

    const lines = [...container.querySelectorAll(".code-block-line")];
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.textContent)).toEqual(["a", "b"]);
  });

  it("strips the trailing newline in the default (no line numbers) mode too (#151)", () => {
    const { container } = render(<CodeBlock code={"a\nb\n"} copyable={false} />);

    expect(container.querySelector(".code-block-code")?.textContent).toBe("a\nb");
  });

  it("keeps interior blank lines", () => {
    const { container } = render(
      <CodeBlock code={"a\n\nb\n"} showLineNumbers copyable={false} />
    );
    expect(container.querySelectorAll(".code-block-line")).toHaveLength(3);
  });

  /* ---------------------------------------------------------------- */
  /*  Line-number gutter (#154)                                        */
  /* ---------------------------------------------------------------- */

  it("widens the gutter once the line count outgrows it (#154)", () => {
    const twoDigits = "x\n".repeat(99);
    const { container, rerender } = render(
      <CodeBlock code={twoDigits} showLineNumbers copyable={false} />
    );
    const pre = () => container.querySelector("pre.code-block-pre") as HTMLElement;

    // ≤ 99 lines fit the stylesheet's default, so nothing is overridden.
    expect(pre().style.getPropertyValue("--_code-block-gutter")).toBe("");

    rerender(<CodeBlock code={"x\n".repeat(100)} showLineNumbers copyable={false} />);
    expect(pre().style.getPropertyValue("--_code-block-gutter")).toBe("3ch");

    rerender(<CodeBlock code={"x\n".repeat(1000)} showLineNumbers copyable={false} />);
    expect(pre().style.getPropertyValue("--_code-block-gutter")).toBe("4ch");
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
