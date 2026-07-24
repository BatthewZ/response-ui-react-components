# Badge

A small inline chip for status and metadata — five theme-tinted variants on a plain
`<span>`, so it drops into a heading, a table cell, or a list row without a wrapper and
re-tints from your theme's status tokens for free.

<!-- example:Minimal -->
```tsx
<Badge>Draft</Badge>
```
<!-- /example -->

| Prop        | Type                                                          | Default     |
| ----------- | ------------------------------------------------------------- | ----------- |
| `variant`   | `"default" \| "success" \| "warning" \| "error" \| "info"`    | `"default"` |
| `children`  | `ReactNode`                                                   | —           |
| `className` | `string`                                                      | —           |
| `ref`       | `Ref<HTMLSpanElement>`                                        | —           |
| …rest       | props of `span` (`role`, `title`, `id`, `aria-*`, `onClick`, …) | —          |

That is the whole surface: no `size`, no `icon`, no `dot`, no `removable`. A badge is a
styled `<span>` you put content into. Rest props land on that span, which is how you add a
`role` or a live region — see [Gotchas](#gotchas).

## Variants

The variant changes **only** the fill and the ink. Geometry, weight, and type are the same
across all five, so a row of mixed badges stays on one baseline.

| Variant   | Reach for it when                                                |
| --------- | ---------------------------------------------------------------- |
| `default` | Neutral metadata — a plan name, a version, a category.           |
| `success` | A finished, healthy, or passing state.                           |
| `warning` | Something degraded or expiring that hasn't failed yet.           |
| `error`   | A failure, rejection, or blocked state.                          |
| `info`    | An in-progress or purely informational state.                    |

<!-- example:Variants -->
```tsx
<div className="flex flex-wrap gap-r6">
  <Badge variant="default">Draft</Badge>
  <Badge variant="success">Deployed</Badge>
  <Badge variant="warning">Degraded</Badge>
  <Badge variant="error">Failed</Badge>
  <Badge variant="info">Queued</Badge>
</div>
```
<!-- /example -->

## Don't lean on colour alone

Nothing but the tint separates the five — no icon, no label, no `aria` hint ships with the
variant. A greyscale or colour-blind reader sees identical chips, and a screen reader hears
only the children. Put the state in the text:

<!-- example:LabelledNotJustTinted -->
```tsx
<div className="flex flex-wrap gap-r6">
  <Badge variant="success">12 checks passed</Badge>
  <Badge variant="error">3 checks failed</Badge>
</div>
```
<!-- /example -->

`<Badge variant="error">3</Badge>` and `<Badge variant="success">3</Badge>` are the same
badge to everyone who can't see the colour. `"3 checks failed"` isn't.

## Composing content

Children render as-is inside an `inline-flex` row. There is no `icon` prop, and the base
classes set no `gap`, so an icon sits flush against the label until you add one:

<!-- example:WithIcon -->
```tsx
<Badge variant="warning" className="gap-r6">
  <TriangleAlert size={12} aria-hidden />
  Certificate expires in 5 days
</Badge>
```
<!-- /example -->

The chip is inline, so it flows with surrounding text rather than forcing its own block:

<!-- example:BesideAHeading -->
```tsx
<h2 className="text-h4">
  Billing API <Badge variant="info">v2</Badge>
</h2>
```
<!-- /example -->

## A badge that changes

Badge renders a bare `<span>` — no `role`, no `aria-live`. A chip that flips from
"Deploying" to "Failed" in place changes silently for assistive tech. Rest props spread onto
the span, so make it its own live region when the change matters:

<!-- example:LiveStatus -->
```tsx
<Badge variant="info" role="status">
  Deploying…
</Badge>
```
<!-- /example -->

Mount the badge **before** the text changes: a live region that appears already populated is
read as ordinary content, not as an update.

## Restyling

`className` is merged with `cn()` rather than concatenated, so a conflicting utility replaces
the built-in one instead of racing it in the cascade:

<!-- example:PillShape -->
```tsx
<Badge className="rounded-full px-r4">Enterprise plan</Badge>
```
<!-- /example -->

## Theme tokens

Badge hard-codes no colour, radius, spacing, or type. Every utility below resolves to a
contract variable — override the `--C-STATUS-*` pair for a variant and every badge of that
variant re-tints at runtime, with no rebuild.

| Where            | Utility                                            | Override                                     |
| ---------------- | -------------------------------------------------- | -------------------------------------------- |
| Default variant  | `bg-surface-2` `text-fg-secondary`                 | `--C-SURFACE-2` `--C-TEXT-SECONDARY`         |
| Success variant  | `bg-status-success-bg` `text-status-success`       | `--C-STATUS-SUCCESS-BG` `--C-STATUS-SUCCESS` |
| Warning variant  | `bg-status-warning-bg` `text-status-warning`       | `--C-STATUS-WARNING-BG` `--C-STATUS-WARNING` |
| Error variant    | `bg-status-error-bg` `text-status-error`           | `--C-STATUS-ERROR-BG` `--C-STATUS-ERROR`     |
| Info variant     | `bg-status-info-bg` `text-status-info`             | `--C-STATUS-INFO-BG` `--C-STATUS-INFO`       |
| Corner radius    | `rounded-sm`                                       | `--RADIUS-SM`                                |
| Horizontal pad   | `px-r5`                                            | `--R-SIZE-5`                                 |
| Vertical pad     | `py-r6`                                            | `--R-SIZE-6`                                 |
| Type scale       | `text-body-3`                                      | `--BodyText-3`                               |
| Label weight     | `font-semibold`                                    | `--Semibold-Weight`                          |

The four status variants use the **tinted** background (`--C-STATUS-*-BG`) with the matching
foreground — the pairing the [theme contract](../theme-contract.md) requires every theme to
define. The contract lists the pair; it names no contrast ratio, so how legible the result is
comes down to the values your theme picks. Badge never paints a saturated `--C-STATUS-*`
fill, so it never needs an `on-*` ink token. The `default` variant is `--C-TEXT-SECONDARY` on
`--C-SURFACE-2`, the ordinary body-text-on-surface pairing.

Of the two padding rungs, only the horizontal one is responsive: `--R-SIZE-5` steps
`0.5rem → 0.75rem` at the 40rem breakpoint, while `--R-SIZE-6` holds at `0.25rem` on both
sides of it. The type moves too — `--BodyText-3` steps `0.75rem → 0.8125rem` — but its paired
line-height stays `1.75rem`, so on desktop a badge gets wider and its label bigger without
the chip getting taller.

One surprise if you know Tailwind's defaults: `font-semibold` does not mean 600 here. It
reads `--Semibold-Weight`, which the default scale sets to **500** below 40rem and **600** at
and above it — and each shipped theme sets it outright, at every width, because
`:root[data-theme=…]` outweighs the breakpoint rule: `tech` 500, `events` 600, `grimdark`
700. Retune it in your theme rather than reaching for a heavier utility, or the badge stops
tracking the rest of the type system.

## Gotchas

- **Variant is colour-only.** The variant map swaps a `bg-*` and a `text-*` class and nothing
  else — no icon, label, `role`, or `aria-*` encodes the state. Two badges with the same
  children and different variants are indistinguishable in greyscale and identical to a
  screen reader. Say the state in the label.
- **No status semantics.** It is a plain `<span>`. Nothing is announced when its text changes,
  and it contributes no role to the accessibility tree. Pass `role="status"` (or wrap it in
  your own live region) when the chip reports something that updates.
- **Taller than the label suggests.** The chip's height comes from the line box, not from
  `py-r6`: `--BodyText-3-line-height` plus `0.25rem` of padding on each edge, regardless of
  how short the label is. Themes move that number a long way — the default scale pairs a
  `0.75rem` font with a `1.75rem` line-height for a ~`2.25rem` chip, `grimdark` sets
  `1.25rem` (~`1.75rem`), `tech` sets `1.125rem` (~`1.625rem`) — so the same badge is
  noticeably shorter in one theme than another. Inline in a paragraph it expands that line's
  box. Pass a `leading-*` utility through `className` for a tighter chip.
- **The default variant vanishes on `surface-2`.** Its fill *is* `bg-surface-2`, so on a
  container painted with the same token there is no visible chip — only the ink shift.
  Use a status variant there, or restyle the fill.
- **No `size` prop.** Every badge is one size. Scale it at the call site with type and padding
  utilities through `className`; `cn()` will collapse the ones that conflict.
- **Non-interactive by default.** `onClick` type-checks because the props are `span` props,
  but a clickable `<span>` is not focusable or keyboard-operable. For a dismissible or
  filtering chip, render a real `<button>` and style it yourself rather than adding a handler
  here.
- **No per-component CSS, yet both package CSS imports are still required.** There is no
  `Badge.css` — Badge is pure utilities in the `.tsx`. `@batthewz/response-ui-css` is what
  makes those utilities resolve to tokens, and
  `@batthewz/response-ui-react-components/styles` is what registers
  `@source "../src/**/*.{ts,tsx}"` with Tailwind — that registration is what makes your build
  emit Badge's classes at all. The css package declares no `@source` for this package, so
  importing it alone leaves you with an unstyled `<span>`.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Badge adds nothing to the accessibility tree: it is an unlabelled `<span>` whose children are
read in place, in document order, as ordinary inline text. That is usually right for metadata
— but it means everything the badge *means* has to be in its children.

- **Status is conveyed by colour alone** (WCAG 1.4.1). The tint is the only variant signal, so
  a badge whose label doesn't name the state ("3", "v2", an environment name) carries no
  meaning to colour-blind or non-visual users. Write self-describing labels.
- **Name or hide composed icons.** An icon you pass as a child renders as-is with no
  accessible name. Mark it `aria-hidden` when the label already says it; give it a label of
  its own when it doesn't.
- **Nothing is announced on change.** See the live-region example above.
- **Small text.** `body-3` is the smallest step on the type scale — `0.75rem` below 40rem in
  the default theme, `0.6875rem` under `tech` — and `font-semibold` resolves to whatever
  `--Semibold-Weight` is, which can be as low as 500 (see [Theme tokens](#theme-tokens)).
  Badges are for glanceable labels; don't put content a reader has to work through inside one.
- **Contrast is your theme's job.** The variant pairs are the ones the theme contract requires
  a theme to define, but it sets no ratio, so contrast is only as good as the values in the
  theme. A custom fill passed through `className` leaves even that pairing behind — the ink
  stays whatever the variant set.

## Related

[Alert](alert.md) · [StatCard](stat-card.md) · [Meter](meter.md) · [Kbd](kbd.md) · `Toast` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
