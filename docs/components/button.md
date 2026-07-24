# Button

The clickable action primitive. Six variants, three sizes, and it re-tints with your
theme without you touching it.

<!-- example:Minimal -->
```tsx
<Button onClick={save}>Save changes</Button>
```
<!-- /example -->

| Prop        | Type                                                                          | Default     |
| ----------- | ----------------------------------------------------------------------------- | ----------- |
| `variant`   | `"primary" \| "secondary" \| "ghost" \| "ghost-inverse" \| "danger" \| "link"` | `"primary"` |
| `size`      | `"sm" \| "md" \| "lg"`                                                        | `"md"`      |
| `as`        | `ElementType`                                                                 | `"button"`  |
| `className` | `string`                                                                      | —           |
| `ref`       | `Ref<HTMLElement>`                                                            | —           |
| …rest       | props of `as`                                                                 | —           |

Three of these have sharp edges — `size` shadows the HTML attribute, `disabled` only
works when `as` is a `<button>`, and `ref` is `HTMLElement`. See [Gotchas](#gotchas).

## Pick a variant

| Variant         | Reach for it when                                          |
| --------------- | ---------------------------------------------------------- |
| `primary`       | The one action you want taken. One per view.               |
| `secondary`     | Supporting actions sitting beside a primary.               |
| `ghost`         | Low-emphasis or repeated actions — toolbars, list rows.    |
| `ghost-inverse` | A ghost over a **fill** — `bg-primary`, an overlay, a `Hero` image. |
| `danger`        | Destructive and hard to undo.                              |
| `link`          | Navigation that must read as inline text.                  |

<!-- example:Variants -->
```tsx
<Button variant="primary">Save changes</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Filter</Button>
<Button variant="danger">Delete account</Button>
<Button variant="link">Learn more</Button>
```
<!-- /example -->

<!-- example:GhostOnFillBackground -->
```tsx
<div className="bg-primary p-r4">
  <Button variant="ghost-inverse">Watch trailer</Button>
</div>
```
<!-- /example -->

`ghost-inverse` inks itself with `fg-on-primary`, which the
[contrast contract](../theme-contract.md) guarantees against a **fill** token — never
against a surface. On a `surface-*` background it is not guaranteed to be legible, and
in the default and `events` themes it is not: those surfaces are light and the ink is
white. Put it on a fill.

## Size

<!-- example:Sizes -->
```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```
<!-- /example -->

Both padding and type scale step up together, and the type tokens are responsive — a
`lg` button is larger on desktop than on mobile with no breakpoint utilities from you.

## Render as something else

<!-- example:AsLink -->
```tsx
<Button as="a" href="/pricing" variant="link" size="sm">
  See pricing
</Button>
```
<!-- /example -->

Use this for real navigation. A `<button onClick={navigate}>` breaks middle-click,
open-in-new-tab, and screen-reader link listings.

## Loading state

There is no `loading` prop — a spinner's placement and the label's wording are
call-site decisions, so Button doesn't guess. Compose it:

<!-- example:Loading -->
```tsx
<Button disabled>
  <Spinner size="sm" />
  Saving…
</Button>
```
<!-- /example -->

## Theme tokens

Button hard-codes no colour, radius, or timing. Every utility below resolves to a
variable a theme can override — change `--C-PRIMARY` in one file and every primary
button in the app re-tints, at runtime, with no rebuild.

| Where               | Utility                                                                | Override                                               |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| Primary fill        | `bg-primary` `hover:bg-primary-hover` `active:bg-primary-active`       | `--C-PRIMARY` `--C-PRIMARY-HOVER` `--C-PRIMARY-ACTIVE` |
| Primary label       | `text-fg-on-primary`                                                   | `--C-TEXT-ON-PRIMARY`                                  |
| Secondary fill      | `bg-secondary` `hover:bg-secondary-hover`                              | `--C-SECONDARY` `--C-SECONDARY-HOVER`                  |
| Labels              | `text-fg-primary` `text-fg-secondary`                                  | `--C-TEXT-PRIMARY` `--C-TEXT-SECONDARY`                |
| Ghost hover wash    | `hover:bg-fg-secondary/10`                                             | `--C-TEXT-SECONDARY`                                   |
| Ghost-inverse wash  | `hover:bg-fg-on-primary/15`                                            | `--C-TEXT-ON-PRIMARY`                                  |
| Danger fill         | `bg-status-error` `hover:bg-status-error/90` `text-fg-inverse`         | `--C-STATUS-ERROR` `--C-TEXT-INVERSE`                  |
| Link label          | `text-accent`                                                          | `--C-ACCENT`                                           |
| Focus ring          | `focus-visible:ring-border-focus`                                      | `--C-BORDER-FOCUS`                                     |
| Corner radius       | `rounded-md`                                                           | `--RADIUS-MD`                                          |
| Type scale          | `text-body-1` `text-body-2` `text-body-3`                              | `--BodyText-1` `--BodyText-2` `--BodyText-3`           |
| Icon / label gap    | `gap-[var(--BUTTON-GAP-SM)]` `gap-[var(--BUTTON-GAP-MD)]` `gap-[var(--BUTTON-GAP-LG)]` | `--BUTTON-GAP-SM` `--BUTTON-GAP-MD` `--BUTTON-GAP-LG` |
| Transition          | `duration-fast`                                                        | `--DURATION-FAST`                                      |

**On the three hover washes.** `ghost`, `ghost-inverse`, and `danger` derive their hover
from their own ink token at low alpha rather than from a dedicated hover variable. That
keeps them theme-following — a `ghost` button washes with whatever `--C-TEXT-SECONDARY`
is in the active theme — but it does mean you can't tune those hovers independently of
the base colour the way you can for `primary` and `secondary`.

`--BUTTON-GAP-*` is owned by this package (`src/tokens.css`), not the CSS foundation, and
is deliberately **not** on the responsive `r`-scale: button padding doesn't reflow at the
breakpoint, so a gap that did would drift out of proportion with it.

## Gotchas

- **`size` shadows the HTML attribute.** `ButtonProps` omits the native `size`, so
  `<Button as="input" size="30">` won't compile. Use `className="w-…"` instead.
- **`disabled` only works on a real `<button>`.** With `as="a"` it does nothing —
  anchors can't be `:disabled`, so both the behaviour and the `opacity-50` styling
  silently no-op. Guard navigation yourself, or don't render the link.
- **`ref` is typed `HTMLElement`,** not `HTMLButtonElement`, because `as` can change
  the element. Narrow it at the call site if you need `.focus()` on a specific type.
- **No per-component CSS.** `Button.css` is an empty placeholder. Both CSS imports are
  still required — the utilities above resolve to tokens from `@batthewz/response-ui-css`.
- **Server-renderable.** No `"use client"`, so it works directly in an RSC tree.

## Accessibility

Focus is `focus-visible` only — keyboard focus shows the ring, mouse clicks don't. The
ring is always 2px and transparent until focused, so **focusing never shifts layout.**

Icon-only buttons need an accessible name; reach for `IconButton`, which enforces it.

## Related

`IconButton` · `CopyButton` · `FormActions` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
