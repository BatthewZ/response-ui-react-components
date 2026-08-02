import { Markdown } from "./Markdown";

/** One required child, and it is a string rather than nodes: the component parses,
 *  it does not compose. */
export function Minimal() {
  return <Markdown>{"# Title\n\nA paragraph with **bold**, *italic* and `code` in it."}</Markdown>;
}

/** A fenced block becomes a real [CodeBlock](code-block.md) — the scrollable `<pre>`,
 *  the language chip and the copy button come with it. */
export function FencedCode() {
  return (
    <Markdown>
      {'## Install\n\n```bash\nbun add @batthewz/response-ui-react-components\n```'}
    </Markdown>
  );
}

/** A GFM table becomes a real [Table](table.md), alignment row included. A `\\|` inside
 *  a cell is a literal pipe, not a cell boundary. */
export function Tables() {
  return (
    <Markdown>
      {'| Prop | Type | Default |\n| :-- | :-: | --: |\n| `size` | "sm"\\|"md"\\|"lg" | `"md"` |\n| `open` | boolean | `false` |'}
    </Markdown>
  );
}

/** Lists nest by indentation, and a one-paragraph item renders without a `<p>` so the
 *  bullets keep list rhythm rather than paragraph rhythm. */
export function Lists() {
  return <Markdown>{"- One\n- Two\n  - Nested\n- Three\n\n1. First\n2. Second"}</Markdown>;
}

/** `codeBlockProps` reaches every fenced block at once. `copyable: false` is the
 *  reason it exists — a page of prose rarely wants a button on each snippet. */
export function QuietCodeBlocks() {
  return (
    <Markdown codeBlockProps={{ copyable: false }}>
      {"Run `bun test`, then:\n\n```bash\nbun run build\n```"}
    </Markdown>
  );
}

/**
 * The source held above rather than inline because `verify:component-docs` reads every
 * link-shaped run in a doc — fences included — and would resolve a `javascript:` one as
 * a dead relative path.
 */
const MIXED_LINKS = '[safe](https://example.com) and [unsafe](javascript:alert(1))';

/** A URL that would execute script never reaches the DOM: the link is dropped and its
 *  text is kept, so the author's words survive the refusal. */
export function UnsafeLinksAreRefused() {
  return <Markdown>{MIXED_LINKS}</Markdown>;
}

/** Raw HTML is text, never markup — which is what lets a type signature carrying angle
 *  brackets survive a table cell intact. */
export function RawHtmlIsText() {
  return <Markdown>{"Accepts `Partial<Record<Status, string>>` — and <b>this stays text</b>."}</Markdown>;
}

/** `classNames` reaches the elements the parser generates, since the document's own
 *  content is the only thing that decides they exist. */
export function SlotOverrides() {
  return (
    <Markdown classNames={{ heading: "text-fg-secondary", link: "no-underline" }}>
      {"# Muted heading\n\nAn [undecorated link](https://example.com)."}
    </Markdown>
  );
}
