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

describe("#152 · reaching the copy button", () => {
  it("copyButtonProps names the button per block and keeps the positioning class", () => {
    render(
      <CodeBlock
        code="bun add x"
        copyButtonProps={{ "aria-label": "Kopieren: install", copiedLabel: "Kopiert" }}
      />,
    );

    const button = screen.getByRole("button", { name: "Kopieren: install" });
    // The bag must not replace the class the header layout depends on.
    expect(button.className).toContain("code-block-copy");
  });

  it("still copies the block's own code, which the bag cannot override", async () => {
    const writeText = stubClipboard();
    render(<CodeBlock code="the real code" copyButtonProps={{ timeout: 10 }} />);

    await act(async () => {
      screen.getByRole("button", { name: "Copy" }).click();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("the real code");
  });

  describe("classNames slots", () => {
    /**
     * One slot-override test per slot, and each is the falsifier for its own
     * merge: delete that element's `cn()` and exactly this test must go red.
     */
    it("lands classNames.header on the header row, beside the base class", () => {
      const { container } = render(
        <CodeBlock code="x" filename="a.ts" classNames={{ header: "justify-start" }} />,
      );
      const header = container.querySelector(".code-block-header");
      expect(header?.getAttribute("class")).toContain("code-block-header");
      expect(header?.getAttribute("class")).toContain("justify-start");
    });

    it("lands classNames.filename on the filename, beside the base class", () => {
      const { container } = render(
        <CodeBlock code="x" filename="a.ts" classNames={{ filename: "italic" }} />,
      );
      const filename = container.querySelector(".code-block-filename");
      expect(filename?.getAttribute("class")).toContain("code-block-filename");
      expect(filename?.getAttribute("class")).toContain("italic");
    });

    it("lands classNames.language on the language tag, beside the base class", () => {
      const { container } = render(
        <CodeBlock code="x" language="TS" classNames={{ language: "uppercase" }} />,
      );
      const language = container.querySelector(".code-block-language");
      expect(language?.getAttribute("class")).toContain("code-block-language");
      expect(language?.getAttribute("class")).toContain("uppercase");
    });

    it("lands classNames.pre on the scrollport, beside the base class", () => {
      const { container } = render(<CodeBlock code="x" classNames={{ pre: "max-h-40" }} />);
      const pre = container.querySelector("pre");
      expect(pre?.getAttribute("class")).toContain("code-block-pre");
      expect(pre?.getAttribute("class")).toContain("max-h-40");
    });

    it("lands classNames.code on the <code>, beside the base class", () => {
      const { container } = render(<CodeBlock code="x" classNames={{ code: "text-body-3" }} />);
      const code = container.querySelector("code");
      expect(code?.getAttribute("class")).toContain("code-block-code");
      expect(code?.getAttribute("class")).toContain("text-body-3");
    });

    it("lands classNames.line on every numbered line, beside the base class", () => {
      const { container } = render(
        <CodeBlock code={"a\nb\nc"} showLineNumbers classNames={{ line: "bg-surface-2" }} />,
      );
      const lines = container.querySelectorAll(".code-block-line");
      expect(lines).toHaveLength(3);
      for (const line of lines) {
        expect(line.getAttribute("class")).toContain("code-block-line");
        expect(line.getAttribute("class")).toContain("bg-surface-2");
      }
    });

    it("leaves each internal on its base class alone when no slot is passed", () => {
      const { container } = render(
        <CodeBlock code={"a\nb"} filename="a.ts" language="ts" showLineNumbers />,
      );
      expect(container.querySelector(".code-block-header")?.getAttribute("class")).toBe(
        "code-block-header",
      );
      expect(container.querySelector(".code-block-filename")?.getAttribute("class")).toBe(
        "code-block-filename",
      );
      expect(container.querySelector(".code-block-language")?.getAttribute("class")).toBe(
        "code-block-language",
      );
      expect(container.querySelector("pre")?.getAttribute("class")).toBe("code-block-pre");
      expect(container.querySelector("code")?.getAttribute("class")).toBe("code-block-code");
      expect(container.querySelector(".code-block-line")?.getAttribute("class")).toBe(
        "code-block-line",
      );
    });

    it("does not put a slot class on the root", () => {
      const { container } = render(
        <CodeBlock
          code={"a\nb"}
          filename="a.ts"
          language="ts"
          showLineNumbers
          classNames={{
            header: "justify-start",
            filename: "italic",
            language: "uppercase",
            pre: "max-h-40",
            code: "text-body-3",
            line: "bg-surface-2",
          }}
        />,
      );
      expect(container.firstElementChild?.getAttribute("class")).toBe("code-block");
    });

    /**
     * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
     * compile error. It fails if TypeScript ever stops rejecting the key.
     */
    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        <CodeBlock
          code="x"
          // @ts-expect-error — `copy` is not a slot; the copy button takes `copyButtonProps`.
          classNames={{ copy: "italic" }}
        />,
      );
      expect(container.querySelector("pre")?.getAttribute("class")).toBe("code-block-pre");
    });

    it("does not leak classNames onto the DOM", () => {
      const { container } = render(<CodeBlock code="x" classNames={{ pre: "max-h-40" }} />);
      expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
    });
  });
});

