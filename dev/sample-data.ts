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

/** A document exercising every block the Markdown component renders, at once. */
export const SAMPLE_MARKDOWN = `## Rendering a document

Markdown becomes **real components** — a fence is a \`CodeBlock\`, a table is a
\`Table\`, and the type scale comes from the tokens, not from this component.

- Tight items sit close together
- A second item with \`inline_code\` and a [link](https://example.com)
- Nested:
  - one level down

1. Ordered lists keep their numbers
2. And their rhythm

> A blockquote takes its rule and its ink from the theme.

| Prop | Type | Default |
| :-- | :-: | --: |
| \`children\` | string | — |
| \`classNames\` | "heading"\\|"paragraph"\\|… | — |

\`\`\`ts
export const theme = document.documentElement.dataset.theme ?? "default";
\`\`\`

---

Raw HTML stays text: <b>not bold</b>, and \`Omit<Props, "href">\` survives intact.
`;
