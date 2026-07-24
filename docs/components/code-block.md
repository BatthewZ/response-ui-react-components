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
| `className`       | `string` — merged onto the root's `code-block` class          | —            |
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

One trailing newline is stripped before the split, so a string ending in `\n` doesn't get a
numbered empty last line. The copy button is unaffected by any of this: it is handed the raw
`code` prop — trailing newline included — not the split lines, so what you paste is exactly
what you passed. The default (no-numbers) path does no stripping at all, which is where the
two modes part company; see [Gotchas](#gotchas).

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

Every block is a `role="region"` landmark, named by `filename` and falling back to the
literal `"Code block"`. Rest props are spread last, so your own `aria-label` replaces that
name:

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
CSS. A theme may flatten that step (the shipped `tech` theme pins it to 0.6875rem at every
width). `--R-SIZE-5` steps 0.5rem → 0.75rem at the same breakpoint, widening the code padding
and the number gutter on desktop; `--R-SIZE-6` holds at 0.25rem on both sides of it.

Three values are off-contract literals: the line-number gutter is `2.5ch` wide, the code sets
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
- **Only line-number mode trims the trailing newline.** The strip lives inside the
  `showLineNumbers` branch, and the source comment gives its reason: a code string ending in
  `\n` would otherwise render a phantom empty final line carrying its own line number. The
  default path does no stripping — it puts `code` in the DOM verbatim, trailing newline
  included, inside a `white-space: pre` element — so the phantom line is handled in exactly
  one of the two modes. Trim the string yourself if the two have to match.
- **CRLF input leaves a carriage return on every line.** Both the trim and the split are
  LF-only, so `"a\r\nb\r\n"` renders two lines whose text ends in `\r`. Normalise with
  `code.replace(/\r\n/g, "\n")` before passing it.
- **`filename=""` produces an unnamed region.** The fallback is `filename ?? "Code block"`,
  and `??` only catches nullish — an empty string passes through to `aria-label=""` while
  the header span is skipped, leaving a `role="region"` with no accessible name. Pass
  `undefined`, not `""`, when there is no filename.
- **Utility classes lose to the stylesheet for anything it already sets.** The root's rule
  sets the background, border, radius, overflow and `min-width`; this package's CSS declares
  no cascade layer while Tailwind v4 puts utilities in `@layer utilities`, and unlayered
  author styles outrank layered ones outright. So `className="bg-surface-2 rounded-lg"` does
  nothing here. Utilities for properties the stylesheet never touches — width, margin,
  shadow — still apply. Re-tint through the variables above, or write your own unlayered
  rule.
- **The copy button cannot be configured.** CodeBlock hands
  [CopyButton](copy-button.md) only `value` and a positioning class, so `copiedLabel`,
  `timeout` and a per-block `aria-label` are unreachable: every block's button is named
  "Copy". Whether a click lands at all depends on the browser —
  [`navigator.clipboard` needs a secure context](copy-button.md#when-there-is-no-clipboard),
  and CodeBlock surfaces no success or failure signal either.
- **The number gutter is sized for two digits.** It is a fixed `2.5ch` box with the counter
  right-aligned inside it, so from line 100 the number is already wider than its box and
  grows leftwards into the code's own padding.
- **Server-renderable, with a client island.** CodeBlock has no `"use client"` and drops
  into an RSC tree as-is; leaving `copyable` on mounts one
  [CopyButton](copy-button.md) client component per block.

## Accessibility

The code sits in a real `<pre><code>` pair, so indentation and line structure survive into
the accessibility tree rather than being collapsed the way they would be in a `<div>`.

- **Every block is a landmark.** `role="region"` with a name is exposed in a screen reader's
  landmark list. That is useful for one or two samples on a page and noisy for a dozen, and
  the default name is the same `"Code block"` string for all of them —
  [name them](#naming-the-region) or expect a list of identical entries. There is no prop
  that turns the role off, though `role` is a rest prop like any other.
- **The scroller takes no focus.** The horizontally scrolling element is the inner `<pre>`,
  and it is given no `tabIndex`, so whether a keyboard-only user can pan a long line comes
  down to the browser doing it for them: Chrome (127+) and Firefox focus a scroll container
  with no focusable children automatically, WebKit does not. You cannot patch it from the
  call site either — a `tabIndex` you pass lands on the root, which is `overflow: hidden`
  and not the scroller, so arrow keys there scroll the page instead.
- **Line numbers are generated content.** `user-select: none` keeps them out of selections
  and copies, which is the point — but browsers that expose `::before` text to the
  accessibility tree will read the number before its line. They are also inked
  `--C-TEXT-MUTED`, which measures between 2.10:1 and 2.59:1 against `--C-SURFACE-0` across
  the four shipped themes — under the 3:1 large-text floor — so treat a visible line number
  as decoration and don't build prose ("see line 12") on it.
- **The copy button's own behaviour is unchanged** — its name, its focus ring and its
  visually hidden confirmation are all
  [CopyButton's](copy-button.md#accessibility), including the caveat that the confirmation
  may not be announced at all.

## Related

[CopyButton](copy-button.md) · [IconButton](icon-button.md) · [Kbd](kbd.md) ·
[Tabs](tabs.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
