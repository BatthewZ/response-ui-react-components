# Badge

A small inline chip for status and metadata — five variants on a plain `<span>`, each
with its own glyph as well as its own tint, so it drops into a heading, a table cell, or
a list row without a wrapper and re-tints from your theme's status tokens for free.

<!-- example:Minimal -->
```tsx
<Badge>Draft</Badge>
```
<!-- /example -->

| Prop        | Type                                                          | Default     |
| ----------- | ------------------------------------------------------------- | ----------- |
| `variant`   | `"default" \| "success" \| "warning" \| "error" \| "info"`    | `"default"` |
| `statusLabel` | `string`                                                    | the word for `variant` |
| `statusIcon` | `ReactNode`                                                  | the glyph for `variant` |
| `children`  | `ReactNode`                                                   | —           |
| `className` | `string`                                                      | —           |
| `ref`       | `Ref<HTMLSpanElement>`                                        | —           |
| …rest       | props of `span` (`role`, `title`, `id`, `aria-*`, `onClick`, …) | —          |

That is the whole surface: no `size`, no `dot`, no `removable`, and no general-purpose
icon slot. A badge is a styled `<span>` you put content into. `statusIcon` is not that
slot — it names the *variant*, defaults from it, and is the visual twin of `statusLabel`;
an icon of your own is still a child. Rest props land on that span, which is how you add
a `role` or a live region — see [Gotchas](#gotchas).

## Variants

The variant changes the fill, the ink, and — for the four status variants — the glyph in
front of the label: `CircleCheck`, `TriangleAlert`, `CircleX`, `Info` from `lucide-react`,
the peer dependency the package already requires. `default` carries no state, so it is
iconless as well as wordless. Geometry, weight, and type are the same across all five, so
a row of mixed badges stays on one baseline.

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

The four status variants ship two channels, one per audience.

**To a screen reader:** a visually-hidden word — "Success", "Warning", "Error",
"Information" — read before the children, so it hears "Error, 3" rather than "3".
`statusLabel` replaces it (`statusLabel="Échec"`), `statusLabel=""` removes it, and
passing one to a `default` badge names a state the variant has no word for.

**On screen:** a glyph before the label, one shape per variant, so the chips are
distinguishable in greyscale. `statusIcon` replaces it, `statusIcon={null}` removes it —
the same defaulting and the same removal as `statusLabel`, on purpose.

The glyph is `aria-hidden`: the word already reaches assistive tech, and naming the icon
too would read the variant twice. Mark your own `statusIcon` the same way.

Neither channel is a substitute for a label that says what it means. Put the state in the
text where it has to be *read*:

<!-- example:LabelledNotJustTinted -->
```tsx
<div className="flex flex-wrap gap-r6">
  <Badge variant="success">12 checks passed</Badge>
  <Badge variant="error">3 checks failed</Badge>
</div>
```
<!-- /example -->

`<Badge variant="error">3</Badge>` and `<Badge variant="success">3</Badge>` announce
differently and carry different glyphs — but a shape still has to be decoded, where
`"3 checks failed"` just reads.

## Composing content

Children render as-is inside an `inline-flex` row, after the variant's own glyph. The base
classes set `gap-r6`, so a further icon of your own is spaced from the label without any
work — pass `statusIcon={null}` when yours is meant to replace the variant's rather than
join it:

<!-- example:WithIcon -->
```tsx
<Badge variant="warning" statusIcon={<Clock size={12} aria-hidden />}>
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
| Glyph/label gap  | `gap-r6`                                           | `--R-SIZE-6`                                 |
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
sides of it. The type moves too — `--BodyText-3` steps `0.75rem → 0.8125rem`.

**One utility is off the contract, deliberately.** `leading-none` names no variable because
its job is to *stop* one applying: `text-body-3` emits `--BodyText-3` **and**
`--BodyText-3-line-height`, and that second half is a paragraph leading, not a chip height —
`1.75rem` against a `0.75rem` font on the default scale, which stood every badge at
`2.25rem`. With the leading reset the chip is its label plus `py-r6`, in any theme. To
loosen it again, pass your own `leading-*` through `className`; `cn()` will replace this one.

One surprise if you know Tailwind's defaults: `font-semibold` does not mean 600 here. It
reads `--Semibold-Weight`, which the default scale sets to **500** below 40rem and **600** at
and above it — and each of the example themes sets it outright, at every width, because
`:root[data-theme=…]` outweighs the breakpoint rule: `tech` 500, `events` 600, `grimdark`
700. Retune it in your theme rather than reaching for a heavier utility, or the badge stops
tracking the rest of the type system.

## Gotchas

- **The glyph is the variant's only non-colour channel.** Pass `statusIcon={null}` and two
  badges with the same children and different variants are indistinguishable in greyscale
  again. Remove it only where the visible label already says the state.
- **The glyph is drawn in `currentColor`** at `size={12}`, the chip's own `text-body-3`
  scale, so it inks the variant's `--C-STATUS-*` foreground — the same token as the label
  beside it, and no new colour pairing.
- **A status badge is now wider than it was.** The glyph plus `gap-r6` adds roughly
  `1rem` to every non-`default` chip. In a fixed-width column, budget for it or drop the
  glyph.
- **The hidden word is part of the badge's text.** It renders as the span's first child, so
  `textContent`, `innerText` and `getByText`-style queries see it. Pass `statusLabel=""`
  where that is a problem — and note that a chip whose visible label repeats the word
  ("Failed") will otherwise be read as "Error, Failed".
- **No status semantics.** It is a plain `<span>`. Nothing is announced when its text changes,
  and it contributes no role to the accessibility tree. Pass `role="status"` (or wrap it in
  your own live region) when the chip reports something that updates.
- **The chip's height is its padding, not its theme's leading.** `leading-none` holds the
  line box to the font size, so the chip is the label plus `0.25rem` on each edge — the same
  proportion in any theme. Without it the height was `--BodyText-3-line-height`, which the
  default scale sets to `1.75rem` against a `0.75rem` font (a `2.25rem` chip, measured) while
  `tech` sets `1.125rem` — the same badge, two thirds the height, for no reason a caller
  could see. A taller chip is a `leading-*` or `py-*` utility through `className`.
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

Badge contributes no role: it is a `<span>` whose children are read in place, in document
order, as ordinary inline text — preceded by the variant's visually-hidden word.

- **Both halves of WCAG 1.4.1 are covered.** `statusLabel` puts "Error" in front of a badge
  reading "3" for a screen reader; `statusIcon` puts a distinct shape in front of it for a
  colour-blind one. Measured, the glyph is the variant foreground on the variant tinted
  background — the pairing the label already uses: **success 4.57 · warning 3.07 · error
  4.41 · info 4.75** in the default theme, `events` the same but info 5.20, `tech` 13.39 /
  11.78 / 5.35 / 8.47, `grimdark` 6.70 / 7.97 / 4.59 / 3.53. All clear the 3:1 floor WCAG
  1.4.11 sets for a meaningful graphical object. Measured against the default theme and the
  worked examples; these numbers do not transfer to your own theme — re-check them against
  your values.
- **The variant glyph is `aria-hidden`, and yours should be too.** The hidden word already
  names the variant; a named icon beside it would announce it twice. An icon you pass as a
  *child* renders as-is with no accessible name — mark it `aria-hidden` when the label says
  it, and give it a label of its own when it doesn't.
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

[Alert](alert.md) · [StatCard](stat-card.md) · [Meter](meter.md) · [Kbd](kbd.md) · [Toast](toast.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
