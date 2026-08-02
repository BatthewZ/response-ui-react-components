# Markdown

Renders a **documented subset** of Markdown as real components. Fenced blocks become
[CodeBlock](code-block.md), tables become [Table](table.md), and everything else becomes the
semantic element it should be — so a rendered document is the same design system as the rest
of the app, and re-tints with the theme like everything else.

Nothing here ever builds an HTML string. The parser produces an AST and the component renders
React elements from it, so `dangerouslySetInnerHTML` appears nowhere in the path and there is
no sanitizer to configure wrongly.

<!-- example:Minimal -->
```tsx
<Markdown>{"# Title\n\nA paragraph with **bold**, *italic* and `code` in it."}</Markdown>
```
<!-- /example -->

| Prop             | Type                                                              | Default      |
| ---------------- | ----------------------------------------------------------------- | ------------ |
| `children`       | `string` — the markdown source                                     | — (required) |
| `codeBlockProps` | every [CodeBlock](code-block.md) prop except `code` and `language` | —            |
| `className`      | `string` — merged onto the root's `markdown` class                 | —            |
| `classNames`     | `{ heading?, paragraph?, list?, listItem?, blockquote?, code?, codeBlock?, link?, image?, table?, hr? }` — see [Slots](#slots) | — |
| `ref`            | `Ref<HTMLDivElement>`                                              | —            |
| …rest            | every `div` prop except `children`                                 | —            |

`children` is typed `string` rather than `ReactNode`: this component parses, it does not
compose. Nesting elements inside it is a type error rather than a silently ignored child.

## The subset is the contract

This is **not** a CommonMark implementation, and the line is drawn on purpose — see
[Why a subset](#why-a-subset). What renders:

| Construct | Notes |
| --- | --- |
| ATX headings `#`–`######` | A closing run of `#` is trimmed. `#nospace` is a paragraph. |
| Paragraphs | A single newline is a space; a blank line ends the block. |
| Fenced code ` ``` ` / `~~~` | The **first word** of the info string becomes `language`; the rest is ignored. Up to three spaces of indent. An unclosed fence runs to the end. |
| GFM tables | Alignment row (`:--`, `:-:`, `--:`) honoured. One column is a table. |
| Lists, ordered and unordered | Nest by indentation. A non-1 start is kept. A different bullet character or ordered delimiter starts a new list. A blank line between items makes the list *loose*, not two lists. |
| Blockquotes `>` | **Every** line needs its own marker. |
| Thematic breaks | `---`, `***`, `___`. |
| Emphasis | `**bold**`, `*em*`, `_em_`, `~~strike~~`. |
| Inline code | Backtick runs of any length, so `` ``a ` b`` `` works. |
| Links and images | `[text]` followed by `(url "title")`; the image form prefixes `!`. |
| Autolinks | Angle-wrapped `http`, `https`, `mailto` and `tel` only — a bare URL stays text. |
| Hard breaks | Two trailing spaces, or a trailing backslash. |
| Backslash escapes | Any ASCII punctuation, including `\|` inside a table cell. |

What does not, each because it is a well of complexity with no demand behind it here:
reference links and their definitions, setext headings (`===` underlines), lazy continuation,
indented (4-space) code blocks, footnotes, task lists, and raw HTML.

## Raw HTML is text

A tag in the source renders as the characters that spell it, never as an element:

<!-- example:RawHtmlIsText -->
```tsx
<Markdown>{"Accepts `Partial<Record<Status, string>>` — and <b>this stays text</b>."}</Markdown>
```
<!-- /example -->

That is a feature before it is a restriction. Generated API references are full of type
syntax — `ColumnBreakpoints<GridColumnCount>`, `Omit<ComponentPropsWithRef<"a">, "href">` —
sitting in table cells as prose. A renderer that honoured raw HTML would swallow each of
those as an unknown tag and delete half the cell. This one shows them.

The single exception is the **HTML comment**, which is dropped rather than escaped. A comment
has no visible rendering under CommonMark either, and escaping it would put
`<!-- GENERATED:components -->` on the page, which no author has ever wanted. A comment
occupying whole lines takes its trailing newline with it, so a comment between two table rows
does not split the table.

## Fenced blocks and tables are the real components

<!-- example:FencedCode -->
```tsx
<Markdown>
  {'## Install\n\n```bash\nbun add @batthewz/response-ui-react-components\n```'}
</Markdown>
```
<!-- /example -->

<!-- example:Tables -->
```tsx
<Markdown>
  {'| Prop | Type | Default |\n| :-- | :-: | --: |\n| `size` | "sm"\\|"md"\\|"lg" | `"md"` |\n| `open` | boolean | `false` |'}
</Markdown>
```
<!-- /example -->

Reusing them rather than restyling their look here is deliberate: a second source of truth for
what a table looks like is exactly what this repo refuses. It has a cost — [Table](table.md)
carries `"use client"`, so a document containing one pulls a client component — and that cost
is the accepted side of the trade.

`codeBlockProps` reaches every fenced block at once. Its `code` and `language` come from the
fence, so they are not yours to set:

<!-- example:QuietCodeBlocks -->
```tsx
<Markdown codeBlockProps={{ copyable: false }}>
  {"Run `bun test`, then:\n\n```bash\nbun run build\n```"}
</Markdown>
```
<!-- /example -->

## Lists

<!-- example:Lists -->
```tsx
<Markdown>
  {"- One\n- Two\n  - Nested\n- Three\n\n1. First\n\n   Its second paragraph.\n\n2. Second"}
</Markdown>
```
<!-- /example -->

An item holding exactly one paragraph renders its content directly, with no `<p>` — the
tight-list rule. Without it every simple bullet acquires paragraph rhythm, which reads as a
spacing bug rather than as markdown.

A blank line between two items makes the list **loose**: it stays one list, and each item keeps
its paragraph, which is the looser rhythm the blank line asked for. It does not split into one
list per item — that would announce "list, 1 item" to a screen reader once per bullet, and
blank-separated bullets are the dominant shape in generated prose.

## Untrusted input

The reason to render an AST rather than a string is that the XSS surface is absent rather
than mitigated. There is still one place untrusted input reaches an attribute — a URL — and
both `href` and `src` are gated:

<!-- example:UnsafeLinksAreRefused -->
```tsx
<Markdown>{MIXED_LINKS}</Markdown>
```
<!-- /example -->

The gate is an **allowlist**, not a list of bad schemes. `http:`, `https:`, `mailto:` and
`tel:` are permitted; so is `data:` restricted to `image/png|jpeg|jpg|gif|webp|avif`. A URL
with no scheme is relative — `/docs`, `./sibling.md`, `#anchor` — and always allowed, since it
cannot name a protocol at all. Everything else is refused.

A denylist was the first attempt and it was wrong: `javascript:`/`vbscript:`/`data:text/html`
is the list everyone writes, and it waves through `data:image/svg+xml,<svg onload=…>` and
`data:application/xhtml+xml`, both of which carry script. Enumerating what is dangerous loses
to a scheme registry that keeps growing; enumerating what is safe does not. `image/svg+xml` is
excluded from the `data:` allowance for the same reason — SVG is a document, not a bitmap.

The comparison happens after stripping the characters a browser ignores while parsing a
scheme — controls, spaces and zero-width marks — because `java&#9;script:` really does
navigate and testing the raw string is trivially bypassed.

A refused URL **drops the element and keeps the text**. A link becomes its own label and an
image becomes its alt text: the author's words survive the refusal, and there is no `<a>` that
goes nowhere or broken-image icon left behind.

Two residual surfaces, stated rather than left to be discovered. A permitted `data:image/*`
URL is checked on its *declared* type only, so a mislabelled payload is allowed through — inert,
because browsers refuse to decode it and disable script in SVG-as-`<img>` regardless, but it is
the gate's edge. And a protocol-relative `//example.com` is a relative URL by this rule, so it
is allowed: no script, but an off-site link.

## Why a subset

Markdown's grammar is hostile in specific places: nested lists containing fenced code
containing lists, lazy continuation, reference links, HTML blocks, and CommonMark's
left-flanking delimiter runs. Implementing all of it is a large, permanent maintenance
commitment; implementing 80% of it and *implying* all of it is worse, because the missing 20%
arrives as bug reports.

So the subset above is the promise, and it is sized to the demand: rendering generated
references and model output, which lean on headings, tables, fences, inline code and lists,
and essentially never on reference links or setext underlines.

One consequence worth stating plainly: an underscore inside a word is not emphasis, so
`snake_case_name` renders intact. Asterisks keep CommonMark's behaviour, so `a*b*c` does
emphasise. Intraword underscores are the single most common way a naive renderer mangles
technical prose.

## Slots

Every element this component draws comes from the document's own content, so no `className` a
caller writes can reach one — there is nothing to hang it on. `classNames` is that route, and
each key lands on **every** element of its kind, since no key can name one heading out of ten.

<!-- example:SlotOverrides -->
```tsx
<Markdown classNames={{ heading: "text-fg-secondary", link: "no-underline" }}>
  {"# Muted heading\n\nAn [undecorated link](https://example.com)."}
</Markdown>
```
<!-- /example -->

`code` is the inline span; `codeBlock` is the fenced [CodeBlock](code-block.md)'s root. They
are separate keys because they are separate things, and one key for both would make an inline
tint silently restyle every block on the page.

## Theme tokens

`Markdown.css` holds only what Preflight strips and the foundation deliberately never restores
— list markers, a blockquote indent, a rule colour, and the rhythm between blocks. It restates
no heading scale: `@batthewz/response-ui-css` already gives bare `h1`–`h6` the responsive
sizes, their paired line-heights, the weight and `--HEADING-FONT`.

Body copy is the one piece of type the root does set, as a utility. `p` carries no size in the
foundation — it is zeroed and left alone — so prose would otherwise inherit Preflight's
`line-height: 1.5` rather than the design language's. `text-body-1` on the container gives
paragraphs, list items and quotes `--BodyText-1` and its paired line-height in one declaration.
Headings are unaffected, because an element's own rule beats an inherited value, and so is
[CodeBlock](code-block.md), which pins its own leading. A [Table](table.md) **is** affected: it
leaves cell line-height to inherit, so rows in a document are taller than the same table on a
dashboard. That is intended — a table inside a document keeps the document's rhythm — and
`classNames.table` is the way back to the app's row height.

Utilities, read from `Markdown.tsx`:

| Where                       | Utility                                       | Override             |
| --------------------------- | --------------------------------------------- | -------------------- |
| Body type                   | `text-body-1`                                 | `--BodyText-1`, `--BodyText-1-line-height` |
| Body ink                    | `text-fg-primary`                             | `--C-TEXT-PRIMARY`   |
| Inline code background      | `bg-surface-2`                                | `--C-SURFACE-2`      |
| Inline code ink             | `text-fg-primary`                             | `--C-TEXT-PRIMARY`   |
| Inline code family          | `font-[family-name:var(--DEFAULT-MONO-FONT)]` | `--DEFAULT-MONO-FONT` |
| Inline code corners         | `rounded-sm`                                  | `--RADIUS-SM`        |
| Link ink                    | `text-accent`                                 | `--C-ACCENT`         |
| Link hover ink              | `hover:text-accent-hover`                     | `--C-ACCENT-HOVER`   |
| Link focus ring             | `focus-visible:outline-border-focus`          | `--C-BORDER-FOCUS`   |
| Image corners               | `rounded-md`                                  | `--RADIUS-MD`        |

Variables `Markdown.css` reads directly, for the elements no utility can reach:

| Where                       | Override             |
| --------------------------- | -------------------- |
| Space between blocks        | `--R-SIZE-4`         |
| Space under a heading       | `--R-SIZE-5`         |
| Space above a heading       | `--R-SIZE-3`         |
| List indent                 | `--R-SIZE-3`         |
| Space between list items, and above a nested list | `--R-SIZE-6` |
| Space inside a quote or a multi-block list item | `--R-SIZE-5` |
| List marker ink             | `--C-TEXT-MUTED`     |
| Blockquote rule             | `--C-BORDER-STRONG`  |
| Blockquote indent           | `--R-SIZE-4`         |
| Blockquote ink              | `--C-TEXT-SECONDARY` |
| Thematic break              | `--C-BORDER-DEFAULT` |

Ordered markers ask for **tabular figures**, which is a request the theme's font either answers
or ignores. Markers are right-aligned, so the periods line up on their own and only the digits'
left edges go ragged — visible from ten onwards, and between a `1` and a `2` before that. A face
carrying a `tnum` table evens the columns exactly; one without it renders identically with the
declaration and without, so a theme whose numerals look ragged is telling you about its font,
not about this component.

`--markdown-flow` is a local alias declared on `.markdown`, and it reads as **the space above
me**: it is set on the element that wants it and inherits down, so one rule spends it for the
whole document and a block that agrees with the rhythm says nothing at all. Setting it at the
call site — `style={{ "--markdown-flow": "var(--R-SIZE-3)" }}` — retunes the space between
top-level blocks; the tighter steps under a heading, between list items and inside a quote name
their own token, so they hold.

It is not a `gap`, deliberately. `gap` is uniform by construction and flex margins add rather
than collapse, so the heading asymmetry — which is what binds a heading to the prose beneath it
— would come back as `calc()` against no token at each breakpoint, and `ul`/`ol` would move
into flex layout, where list semantics stop being a settled question.

## Gotchas

- **`children` must be a string.** Passing elements is a type error, not a silent drop.
- **A table needs its delimiter row.** `a | b | c` with nothing under it is a paragraph, which
  is what keeps a stray pipe in prose harmless.
- **A ragged row keeps its extra cells.** Losing one silently is worse than an unaligned one,
  and a generated table is exactly where an off-by-one shows up.
- **Blockquotes take no lazy continuation.** A bare line after a quoted one is a new block, so
  a heading following a quote escapes it rather than being swallowed.
- **A heading keeps a trailing `#` that is part of its text.** `# Notes on C#` renders `C#`;
  only a run preceded by whitespace is trimmed as a closing sequence.
- **A table needs its delimiter row to have the same number of cells as its header**, so a line
  containing a pipe followed by `---` is a paragraph and a rule, not an empty table.
- **Nesting is capped at 32 levels** and a link label at 999 characters, both to bound the work
  a hostile or malformed document can demand. Past either limit the content is kept as text
  rather than parsed — nothing is dropped. Real documents nest two or three levels.
- **No syntax highlighting**, the same ruling [CodeBlock](code-block.md) already made: a
  highlighter is a parser, and its output needs a colour vocabulary the token contract does
  not define.
