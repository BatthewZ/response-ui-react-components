import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Markdown } from "./Markdown";

/**
 * A document shaped like the hard cases a generated reference actually
 * contains: a table whose cells hold escaped pipes and type syntax that looks
 * like markup, a `jsonc` fence, generator comments, and prose with underscores
 * in it. Every construct here is one the census of a real 566-line reference
 * turned up.
 *
 * It is a **construct census, not a scale replica** — a real generated reference
 * runs to hundreds of table rows and a thousand code spans, and this has a
 * handful of each. Parsing is linear, so the scale is not what breaks; the
 * constructs are. Whether a specific document renders is a question for the
 * package that owns that document, and it can read the file directly.
 */
const HARD_DOCUMENT = `# ViewSpec Reference

<!-- GENERATED:components -->

Prose with \`inline_code_here\` and snake_case_name and *emphasis* and **bold**.

- A bullet whose text wraps onto a second line with
  a continuation indent carrying \`code\` and **bold**.
- A second bullet.

## Root Schema

\`\`\`jsonc
{
  "version": 1,          // REQUIRED
  "title": string
}
\`\`\`

| Component | Props | Notes |
| :-- | :-: | --: |
| \`Grid\` | \`columns?\`: ColumnBreakpoints<GridColumnCount>\\|GridColumnCount | 1–6 only. |
| \`Card\` | \`padding?\`: "r1"\\|"r2"\\|"r3" | Always a \`<div>\`. |

<!-- /GENERATED:components -->

1. First
2. Second
   - nested
`;

describe("Markdown", () => {
  describe("renders the element, not just the AST node", () => {
    it("ordered lists are <ol>, unordered are <ul>, and a non-1 start reaches the DOM", () => {
      const { container } = render(<Markdown>{"3. three\n4. four\n\ntext\n\n- bullet"}</Markdown>);
      const ol = container.querySelector("ol");
      expect(ol).toBeInTheDocument();
      expect(ol).toHaveAttribute("start", "3");
      expect(container.querySelector("ul")).toBeInTheDocument();
    });

    it("bold is <strong> and italic is <em>", () => {
      // A mutation of <strong> to <span> passed the whole suite before this.
      const { container } = render(<Markdown>{"**bold** and *italic*"}</Markdown>);
      expect(container.querySelector("strong")).toHaveTextContent("bold");
      expect(container.querySelector("em")).toHaveTextContent("italic");
    });

    it("a paragraph is a <p>", () => {
      const { container } = render(<Markdown>{"just prose"}</Markdown>);
      expect(container.querySelector("p")).toHaveTextContent("just prose");
    });

    it.each([3, 4, 5])("renders an h%i", (level) => {
      render(<Markdown>{`${"#".repeat(level)} Head${level}`}</Markdown>);
      expect(screen.getByRole("heading", { level, name: `Head${level}` })).toBeInTheDocument();
    });

    it.each(["***", "___"])("renders %s as an <hr>", (rule) => {
      const { container } = render(<Markdown>{rule}</Markdown>);
      expect(container.querySelector("hr")).toBeInTheDocument();
    });

    it("renders a trailing-backslash hard break as <br>", () => {
      const { container } = render(<Markdown>{"a\\\nb"}</Markdown>);
      expect(container.querySelector("br")).toBeInTheDocument();
    });

    it("renders a backtick run as one <code>", () => {
      const { container } = render(<Markdown>{"``a ` b``"}</Markdown>);
      expect(container.querySelector("code")).toHaveTextContent("a ` b");
    });

    it("renders an angle autolink as a link", () => {
      render(<Markdown>{"<https://example.com>"}</Markdown>);
      expect(screen.getByRole("link", { name: "https://example.com" })).toHaveAttribute(
        "href",
        "https://example.com"
      );
    });

    it("renders a tilde fence as a CodeBlock", () => {
      const { container } = render(<Markdown>{"~~~ts\nconst a = 1;\n~~~"}</Markdown>);
      expect(container.querySelector(".code-block")).toBeInTheDocument();
      expect(container.querySelector(".code-block-pre")).toHaveTextContent("const a = 1;");
    });
  });

  it("renders each heading level as the real element", () => {
    render(<Markdown>{"# One\n\n## Two\n\n###### Six"}</Markdown>);
    expect(screen.getByRole("heading", { level: 1, name: "One" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Two" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 6, name: "Six" })).toBeInTheDocument();
  });

  it("renders a fenced block as a CodeBlock, with its language chip", () => {
    const { container } = render(<Markdown>{'```jsonc\n{ "a": 1 }\n```'}</Markdown>);
    const block = container.querySelector(".code-block");
    expect(block).toBeInTheDocument();
    expect(within(block as HTMLElement).getByText("jsonc")).toBeInTheDocument();
    expect(container.querySelector(".code-block-pre")).toHaveTextContent('{ "a": 1 }');
  });

  it("lets a caller turn the copy button off on every fenced block", () => {
    const withButton = render(<Markdown>{"```\na\n```"}</Markdown>);
    expect(withButton.container.querySelector(".code-block-copy")).toBeInTheDocument();
    withButton.unmount();

    const without = render(<Markdown codeBlockProps={{ copyable: false }}>{"```\na\n```"}</Markdown>);
    expect(without.container.querySelector(".code-block-copy")).toBeNull();
  });

  it("renders a table as a real table with header cells and alignment", () => {
    const { container } = render(
      <Markdown>{"| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |"}</Markdown>
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual(["a", "b", "c"]);
    expect(headers[0].className).toContain("text-left");
    expect(headers[1].className).toContain("text-center");
    expect(headers[2].className).toContain("text-right");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("renders lists as list elements, with a nested list inside its item", () => {
    render(<Markdown>{"- outer\n  - inner\n- second"}</Markdown>);
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(2);
    const outerItems = within(lists[0]).getAllByRole("listitem");
    // Three items in total across both levels; the nested list lives in the first.
    expect(outerItems).toHaveLength(3);
    expect(within(outerItems[0]).getByRole("list")).toBe(lists[1]);
  });

  it("renders a tight list item without wrapping it in a paragraph", () => {
    const { container } = render(<Markdown>{"- one\n- two"}</Markdown>);
    expect(container.querySelectorAll("li p")).toHaveLength(0);
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders blockquote, rule, strikethrough and hard breaks", () => {
    const { container } = render(<Markdown>{"> quoted\n\n---\n\n~~gone~~\n\na  \nb"}</Markdown>);
    expect(container.querySelector("blockquote")).toHaveTextContent("quoted");
    expect(container.querySelector("hr")).toBeInTheDocument();
    expect(container.querySelector("del")).toHaveTextContent("gone");
    expect(container.querySelector("br")).toBeInTheDocument();
  });

  it("renders a link with its href and an image with its src", () => {
    render(<Markdown>{"[docs](/guide) and ![a cat](/cat.png)"}</Markdown>);
    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute("href", "/guide");
    expect(screen.getByRole("img", { name: "a cat" })).toHaveAttribute("src", "/cat.png");
  });

  describe("hostile input", () => {
    const DANGEROUS = [
      "javascript:alert(1)",
      "vbscript:msgbox(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "java\tscript:alert(1)",
    ];

    it.each(DANGEROUS)("never puts %j in an href", (url) => {
      const { container } = render(<Markdown>{`[click](${url})`}</Markdown>);
      expect(container.querySelector("a")).toBeNull();
      // The words survive even though the link does not.
      expect(container).toHaveTextContent("click");
    });

    it.each(DANGEROUS)("never puts %j in an img src", (url) => {
      const { container } = render(<Markdown>{`![alt](${url})`}</Markdown>);
      expect(container.querySelector("img")).toBeNull();
      expect(container).toHaveTextContent("alt");
    });

    it("renders a script tag in the source as visible text, never as an element", () => {
      const { container } = render(
        <Markdown>{'Before <script>window.pwned = true;</script> after'}</Markdown>
      );
      expect(container.querySelector("script")).toBeNull();
      expect(container).toHaveTextContent("<script>window.pwned = true;</script>");
    });

    it("renders an event-handler attribute in the source as text, never as an element", () => {
      const { container } = render(<Markdown>{'<img src=x onerror="alert(1)">'}</Markdown>);
      expect(container.querySelector("img")).toBeNull();
      expect(container).toHaveTextContent('<img src=x onerror="alert(1)">');
    });

    it("renders an entity-encoded script as text too", () => {
      // The AST carries text, and React escapes text, so there is no decode
      // step anywhere for a double-encoded payload to survive.
      const { container } = render(<Markdown>{"&lt;script&gt;alert(1)&lt;/script&gt;"}</Markdown>);
      expect(container.querySelector("script")).toBeNull();
      expect(container).toHaveTextContent("&lt;script&gt;alert(1)&lt;/script&gt;");
    });
  });

  describe("malformed input", () => {
    it.each([
      ["empty", ""],
      ["whitespace", "   "],
      ["unclosed fence", "```ts\nconst a = 1;"],
      ["unterminated emphasis", "*never closed"],
      ["heading with no text", "#"],
      ["table with no body", "| a |\n| --- |"],
      ["ragged table row", "| a | b |\n| --- | --- |\n| 1 | 2 | 3 | 4 |"],
      ["lone pipe", "a | b"],
      ["stray brackets", "[unclosed"],
      ["crlf", "# Title\r\n\r\nBody\r\n"],
    ])("renders %s without throwing", (_label, src) => {
      expect(() => render(<Markdown>{src}</Markdown>)).not.toThrow();
    });

    it("keeps every cell of a ragged row rather than dropping the overflow", () => {
      render(<Markdown>{"| a | b |\n| --- | --- |\n| 1 | 2 | 3 |"}</Markdown>);
      expect(within(screen.getByRole("table")).getAllByRole("cell")).toHaveLength(3);
    });
  });

  describe("the hard document", () => {
    it("renders every construct the census predicted", () => {
      const { container } = render(<Markdown>{HARD_DOCUMENT}</Markdown>);

      expect(screen.getByRole("heading", { level: 1, name: "ViewSpec Reference" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Root Schema" })).toBeInTheDocument();
      expect(container.querySelector(".code-block")).toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
      // Three: the bullet list, the ordered list, and its nested list.
      expect(screen.getAllByRole("list")).toHaveLength(3);
      expect(container.querySelectorAll("strong").length).toBeGreaterThan(0);
    });

    it("shows no generator comment to the reader", () => {
      const { container } = render(<Markdown>{HARD_DOCUMENT}</Markdown>);
      expect(container.textContent).not.toContain("GENERATED");
      expect(container.textContent).not.toContain("<!--");
    });

    it("renders an escaped pipe as a literal pipe inside one cell", () => {
      render(<Markdown>{HARD_DOCUMENT}</Markdown>);
      const cells = within(screen.getByRole("table")).getAllByRole("cell");
      // Two rows of three: neither row is shredded by the pipes inside it.
      expect(cells).toHaveLength(6);
      // Backticks are gone because the span became a real <code>; the pipes
      // survived because `\|` is an escape and not a cell boundary.
      expect(cells[1].textContent).toBe("columns?: ColumnBreakpoints<GridColumnCount>|GridColumnCount");
      expect(within(cells[1]).getByText("columns?").tagName).toBe("CODE");
      expect(cells[4].textContent).toBe('padding?: "r1"|"r2"|"r3"');
    });

    it("renders type syntax that looks like a tag as literal text", () => {
      const { container } = render(<Markdown>{HARD_DOCUMENT}</Markdown>);
      expect(container).toHaveTextContent("ColumnBreakpoints<GridColumnCount>|GridColumnCount");
    });

    it("leaves an underscored identifier in prose unemphasised", () => {
      const { container } = render(<Markdown>{HARD_DOCUMENT}</Markdown>);
      expect(container).toHaveTextContent("snake_case_name");
      expect(container.querySelectorAll("em")).toHaveLength(1);
    });
  });

  describe("the caller's hooks into it", () => {
    it("merges className onto the root and forwards a ref to it", () => {
      const ref = createRef<HTMLDivElement>();
      const { container } = render(
        <Markdown ref={ref} className="custom">
          {"# Hi"}
        </Markdown>
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass("markdown", "custom");
      expect(ref.current).toBe(root);
    });

    it("routes every classNames slot to the element it names", () => {
      const { container } = render(
        <Markdown
          classNames={{
            heading: "slot-heading",
            paragraph: "slot-paragraph",
            list: "slot-list",
            listItem: "slot-item",
            blockquote: "slot-quote",
            code: "slot-code",
            codeBlock: "slot-codeblock",
            link: "slot-link",
            image: "slot-image",
            table: "slot-table",
            hr: "slot-hr",
          }}
        >
          {"# H\n\npara `c` [l](/x) ![i](/i.png)\n\n- item\n\n> q\n\n---\n\n```\nf\n```\n\n| a |\n| --- |\n| 1 |"}
        </Markdown>
      );
      for (const slot of [
        "slot-heading",
        "slot-paragraph",
        "slot-list",
        "slot-item",
        "slot-quote",
        "slot-code",
        "slot-codeblock",
        "slot-link",
        "slot-image",
        "slot-table",
        "slot-hr",
      ]) {
        expect(container.querySelector(`.${slot}`), slot).toBeInTheDocument();
      }
    });

    it("spreads the rest onto the root", () => {
      const { container } = render(
        <Markdown id="doc" data-testid="md" aria-label="Reference">
          {"# Hi"}
        </Markdown>
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveAttribute("id", "doc");
      expect(root).toHaveAttribute("aria-label", "Reference");
    });
  });
});
