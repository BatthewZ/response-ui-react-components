# CodeBlock

A read-only block of code: a bordered, token-tinted surface, an optional header carrying a
filename, a language chip and a copy button, and optional line numbers that never reach the
clipboard. It renders the string you hand it as text — there is no syntax highlighting
anywhere in it.

<!-- example:Minimal -->
```tsx
<CodeBlock code="bun add @batthewz/response-ui-react-components" />
```
<!-- /example -->

| Prop              | Type                                                        | Default      |
| ----------------- | ----------------------------------------------------------- | ------------ |
| `code`            | `string` — rendered as text, and copied byte-for-byte        | — (required) |
| `language`        | `string` — a header label, lowercased for display            | —            |
| `filename`        | `string` — header label, and the region's accessible name    | —            |
| `showLineNumbers` | `boolean`                                                    | `false`      |
| `copyable`        | `boolean`                                                    | `true`       |
| `copyButtonProps` | every [CopyButton](copy-button.md) prop except `value`        | —            |
| `className`       | `string` — merged onto the root's `code-block` class          | —            |
| `classNames`      | `{ header?, filename?, language?, pre?, code?, line? }` — see [Slots](#slots) | — |
| `ref`             | `Ref<HTMLDivElement>`                                        | —            |
| …rest             | every `div` prop except `children`                           | —            |

`children` is omitted from the type, so the only content is `code`; nothing can be nested
inside the block. Everything else is a real `<div>` prop, spread **after** the component's
own `role` and `aria-label` — so an `id`, a `data-*` attribute or a handler passes straight
through, and an `aria-label` of yours wins. See [Naming the region](#naming-the-region).

## The header bar

The header renders when there is anything to put in it — a `filename`, a `language`, or the
copy button — and since `copyable` defaults to `true`, by default there is. The slots fill
from the left and the copy button is pushed to the right edge.

<!-- example:WithFilenameAndLanguage -->
```tsx
<CodeBlock
  filename="src/app/theme.ts"
  language="TypeScript"
  code={"export const theme = document.documentElement.dataset.theme ?? 'default';"}
/>
```
<!-- /example -->

`language` is lowercased for display, so `"TypeScript"` and `"typescript"` render the same
chip. That is all it does: it is a caption, not a hint to a highlighter, and it reaches the
DOM nowhere else. See [Gotchas](#gotchas).

Turn the copy button off with no labels to show and the header disappears with it, leaving
the code on a bordered surface and nothing else:

<!-- example:StaticNoHeader -->
```tsx
<CodeBlock code="GET /api/v1/teams/42/members" copyable={false} />
```
<!-- /example -->

`copyable={false}` is also what keeps a block free of any client component, whether or not
it has labels: [CopyButton](copy-button.md) carries `"use client"` and CodeBlock does not,
so a block with a filename and a language chip but no copy button still renders a header
and still ships zero JavaScript.

## Line numbers

`showLineNumbers` splits `code` on `\n` and wraps each line in its own element. The number
is a CSS counter drawn in a `::before` marked `user-select: none`, so it is never part of a
text selection and never lands in the clipboard.

<!-- example:LineNumbers -->
```tsx
<CodeBlock
  filename="scripts/release.sh"
  language="bash"
  showLineNumbers
  code={"bun run typecheck\nbun run test\nbun run build\nnpm publish --access public"}
/>
```
<!-- /example -->

`code` is normalised before it is rendered: CRLF and lone CR become LF, and one trailing
newline is stripped, so a string ending in `\n` doesn't get a phantom empty last line (with
its own number in line-number mode). Both modes do this, so the two agree. The copy button is
unaffected: it is handed the raw `code` prop — line endings and trailing newline included —
not the rendered text, so what you paste is exactly what you passed.

## Inside a narrow parent

The root sets `min-width: 0` and clips its own overflow; the `<pre>` inside it is the
scroller. In a flex or grid parent that combination lets the block shrink to its column and
pan a long line internally. Without the `min-width: 0`, a flex item's automatic minimum size
is its content — one long line would set the column's width and push the whole row wide.

<!-- example:InsideAFlexParent -->
```tsx
<div className="flex max-w-md">
  <CodeBlock
    filename="query.sql"
    language="SQL"
    code={"select id, email from users where team_id = $1 order by created_at desc limit 50;"}
  />
</div>
```
<!-- /example -->

Long lines are never wrapped: the code element is `white-space: pre`, so the only way to see
the end of a line is to scroll it. That has a keyboard cost — see
[Accessibility](#accessibility).

## Naming the region

A block becomes a `role="region"` landmark **when it has a name** — a `filename`, or your own
`aria-label` / `aria-labelledby`. With none of those it is a plain `<div>`, because an unnamed
entry in a landmark list is noise. Rest props are spread last, so your own `aria-label`
replaces the filename:

<!-- example:NamedRegion -->
```tsx
<CodeBlock
  language="bash"
  aria-label="Install the CSS foundation"
  code="bun add @batthewz/response-ui-css"
/>
```
<!-- /example -->

Worth doing whenever more than one block shares a page, since otherwise they all announce
identically.

## Slots

`className` addresses the root. `classNames` addresses the six elements inside it. Class
strings only, and the keys are typed, so a misspelled one is a compile error rather than a
prop that does nothing.

| Slot       | Element                        | What it addresses                                |
| ---------- | ------------------------------ | ------------------------------------------------ |
| `header`   | `div.code-block-header`        | the header bar, present when `filename`, `language` or `copyable` gives it something to hold |
| `filename` | `span.code-block-filename`     | the filename label, when `filename` is set        |
| `language` | `span.code-block-language`     | the language tag, when `language` is set          |
| `pre`      | `pre.code-block-pre`           | the scrollport — the element a keyboard user focuses and scrolls |
| `code`     | `code.code-block-code`         | the code element inside it                        |
| `line`     | every `span.code-block-line`   | each numbered line, under `showLineNumbers`       |

```tsx
<CodeBlock
  code={snippet}
  filename="server.ts"
  showLineNumbers
  classNames={{ pre: "max-h-80", line: "hover:bg-surface-2" }}
/>
```

`line` lands on **every** line — `showLineNumbers` generates them from `code`, so no key can
name one. The copy button takes no slot: it is another component, and `copyButtonProps` is
its channel, with `className` merged onto `code-block-copy` rather than replacing it. Prefer
a token where the change is a value — the block re-tints from the variables in
[Theme tokens](#theme-tokens).

## Theme tokens

CodeBlock uses **no Tailwind utilities** — its `.tsx` names only its own `code-block*`
classes and all the styling lives in `CodeBlock.css`, which reads contract variables
directly. Override any of these and every code block in the app re-tints at runtime, with no
rebuild.

| Where                          | Override                                          |
| ------------------------------ | ------------------------------------------------- |
| Block border · header rule     | `--C-BORDER-DEFAULT`                              |
| Block background               | `--C-SURFACE-0`                                   |
| Header bar background          | `--C-SURFACE-1`                                   |
| Language chip background       | `--C-SURFACE-2`                                   |
| The code itself                | `--C-TEXT-PRIMARY`                                |
| Filename and chip ink          | `--C-TEXT-SECONDARY`                              |
| Line numbers                   | `--C-TEXT-MUTED`                                  |
| Corners                        | `--RADIUS-MD` (block) · `--RADIUS-SM` (chip)      |
| Mono face — header and code    | `--DEFAULT-MONO-FONT`                             |
| Type size — header and code    | `--BodyText-3`                                    |
| Chip weight                    | `--Semibold-Weight`                               |
| Code padding · header and chip inline padding · header gap · number gutter | `--R-SIZE-5` |
| Header and chip block padding  | `--R-SIZE-6`                                      |

The whole component sits on one type step. `--BodyText-3` is the smallest of the three body
sizes — 0.75rem, stepping to 0.8125rem at the 40rem breakpoint — and both the header labels
and the code read it, so you cannot size the code independently of the chip without your own
CSS. A theme may flatten that step (the `tech` worked example pins it to 0.6875rem at every
width). `--R-SIZE-5` steps 0.5rem → 0.75rem at the same breakpoint, widening the code padding
and the number gutter on desktop; `--R-SIZE-6` holds at 0.25rem on both sides of it.

Three values are off-contract literals: the line-number gutter is `2.5ch` wide by default —
the component overrides it through `--_code-block-gutter` once the line count needs more
digits — the code sets
`tab-size: 2`, and its line height is a hard `1.6` rather than `--BodyText-3-line-height` — a
listing wants tighter leading than prose does. The type declarations also carry CSS fallbacks
— `var(--BodyText-3, 0.75rem)` in the header, `var(--BodyText-3, 0.8125rem)` in the code (the
two ends of the responsive step), `var(--Semibold-Weight, 600)` on the chip — which apply
only if `@batthewz/response-ui-css` was never imported.

## Gotchas

- **`language` does not highlight anything.** It renders a lowercased chip and nothing more:
  no `class="language-ts"`, no `data-language`, no token spans, so a highlighter that keys
  off either convention finds nothing to hook. `code` is rendered as a text child — markup
  inside it is escaped, never parsed — and `children` is omitted from the type, so there is
  no way to hand the block pre-highlighted markup either. Highlighting has to happen above
  CodeBlock, in an element of your own.
- **The header is on by default.** `copyable` defaults to `true` and the header renders if
  *any* of `filename`, `language` or `copyable` is truthy, so a bare
  `<CodeBlock code="…" />` still draws a header bar holding a lone copy button.
  `copyable={false}` with neither label is the only way to remove it.
- **Exactly one trailing newline is stripped.** A string ending in `\n\n` still renders a
  blank final line — the strip is there to absorb the newline a heredoc or a file read leaves
  behind, not to trim whitespace. Interior blank lines are untouched in both modes.
- **`filename=""` is the same as no filename.** The empty string names nothing, so the block
  renders no filename span and is not a landmark. Pass an `aria-label` if it needs a name.
- **Utility classes now win over the stylesheet.** The root's rule sets the background,
  border, radius, overflow and `min-width`, and `className="bg-surface-2 rounded-lg"` replaces
  the first two: this package's CSS is in `@layer components`, which Tailwind orders **below**
  `@layer utilities`, so a utility beats a component rule at any specificity. It used to lose,
  because this package's CSS was unlayered. Re-tinting through the variables above is still the
  way to move every block at once.
- **The copy button is configured through one bag, not through CodeBlock props.**
  `copyButtonProps` goes straight to [CopyButton](copy-button.md), so `aria-label`,
  `copiedLabel`, `timeout` and `onCopyError` are all reachable per block — without CodeBlock
  growing a prop each time CopyButton gains one. Two keys are not yours to set: `value` is
  typed out (the button copies `code`), and `className` is *merged* onto `code-block-copy`
  rather than replacing it, so the header layout survives. Whether a click lands at all still
  depends on the browser —
  [`navigator.clipboard` needs a secure context](copy-button.md#when-there-is-no-clipboard) —
  and `onCopyError` is now the way to hear about it from a block.
- **The number gutter widens in whole characters.** It is a `2.5ch` box up to 99 lines, then
  one `ch` per digit (`3ch` from line 100, `4ch` from 1000), applied to the whole block so
  every line's code starts at the same column. The code shifts right when a block crosses a
  power of ten.
- **Server-renderable, with a client island.** CodeBlock has no `"use client"` and drops
  into an RSC tree as-is; leaving `copyable` on mounts one
  [CopyButton](copy-button.md) client component per block.

## Accessibility

The code sits in a real `<pre><code>` pair, so indentation and line structure survive into
the accessibility tree rather than being collapsed the way they would be in a `<div>`.

- **A named block is a landmark; an unnamed one is not.** `role="region"` is applied only
  when the block has a `filename`, an `aria-label` or an `aria-labelledby`, so a page of
  unnamed samples adds nothing to the landmark list and a named one is findable.
  [Name them](#naming-the-region) when they are worth navigating to.
- **The scroller takes focus.** The horizontally scrolling `<pre>` carries `tabIndex={0}`, so
  a keyboard-only user can tab to it and pan a long line with the arrow keys in every browser
  rather than relying on the automatic scroll-container focus Chrome and Firefox do and
  WebKit does not. It draws a `--C-BORDER-FOCUS` ring on `:focus-visible`, and it inherits the
  block's accessible name when there is one.
- **Line numbers are generated content.** `user-select: none` keeps them out of selections
  and copies, which is the point — but browsers that expose `::before` text to the
  accessibility tree will read the number before its line. They are also inked
  `--C-TEXT-MUTED`, which measures between **4.85:1 and 5.23:1** against `--C-SURFACE-0` across
  the four measured themes since `@batthewz/response-ui-css` **v0.10.0** — over AA, where it read
  2.10–2.59 before. They are legible now, but they are still `aria-hidden` decoration by
  construction, so don't build prose ("see line 12") on a number a screen reader never reads.
- **The copy button's own behaviour is CopyButton's** — its focus ring and its visually
  hidden confirmation are [documented there](copy-button.md#accessibility), including the
  caveat that the confirmation may not be announced at all. Its *name* is yours: several
  blocks on one page all read "Copy" otherwise, so give each one an
  `copyButtonProps={{ "aria-label": … }}` naming what it copies.

Measured against the default theme and the worked examples; these numbers do not transfer to
your own theme — re-check them against your values.

## Related

[CopyButton](copy-button.md) · [IconButton](icon-button.md) · [Kbd](kbd.md) ·
[Tabs](tabs.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
