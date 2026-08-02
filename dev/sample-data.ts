import type { MultiSelectItem } from "../src";

/** Sample data used by more than one dev view. View-local data stays in its view. */

export const SKILL_OPTIONS: MultiSelectItem[] = [
  { value: "react", label: "React" },
  { value: "typescript", label: "TypeScript" },
  { value: "css", label: "CSS" },
  { value: "node", label: "Node.js" },
  { value: "graphql", label: "GraphQL" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go", disabled: true },
];

export const COLOR_PRESETS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#6366f1", "#8b5cf6", "#ec4899", "#64748b",
];

/**
 * One of every construct the Markdown component renders — all six heading
 * levels, both list kinds tight and loose, every inline node including the hard
 * break and the image, and the two that render as *nothing*: a dropped HTML
 * comment and an escape. Kept exhaustive on purpose: this tile is the only place
 * the whole grammar is on screen at once, so a construct that is not here is a
 * construct nobody looks at.
 */
export const SAMPLE_MARKDOWN = `# Rendering a document

Markdown becomes **real components** — a fence is a \`CodeBlock\`, a table is a
\`Table\`, and the type comes from the tokens, not from this component. Inline it
carries *emphasis*, **weight**, ~~a correction~~, \`inline_code\`, a
[link](https://example.com "with a title"), a bare <https://example.com>
autolink, and a hard break at the end of this line,\\
which continues without starting a new paragraph.

<!-- Dropped rather than escaped: a comment has no rendering under CommonMark. -->

## Headings carry the scale

### Third level

#### Fourth level

##### Fifth level

###### Sixth level

## Lists of both kinds

- Tight items sit close together
- A second item with \`inline_code\` and a [link](https://example.com)
- Nested:
  - one level down

5. A list starts where the author says it does

6. A loose item may hold more than one block

   Such as this second paragraph, which takes the rhythm of its item rather than
   the document's.

7. And the numbering carries on

> A blockquote takes its rule and its ink from the theme.
>
> Its own blocks sit tighter than the document's, because the rule already marks
> where the quote begins and ends.

## Tables, code and images

| Prop | Type | Default |
| :-- | :-: | --: |
| \`children\` | string | — |
| \`classNames\` | "heading"\\|"paragraph"\\|… | — |

\`\`\`ts
export const theme = document.documentElement.dataset.theme ?? "default";
\`\`\`

![A wide photograph, scaled to the column](https://picsum.photos/seed/response-ui/960/320 "Images keep their title")

---

Raw HTML stays text: <b>not bold</b>, and \`Omit<Props, "href">\` survives intact.
So does an escaped \\*asterisk\\*, which is why prose about syntax can be written
in the syntax it describes.
`;
