# Card

The container primitive. It drops content onto a themed surface with a border, rounded
corners, a shadow, and responsive padding — two props to dial elevation and inset, and it re-tints
with your theme untouched.

<!-- example:Minimal -->
```tsx
<Card>
  <h3 className="text-h5 text-fg-primary">Monthly report</h3>
  <p className="text-body-2 text-fg-secondary">
    Your team shipped 42 pull requests and closed 18 issues this month.
  </p>
</Card>
```
<!-- /example -->

| Prop        | Type                                            | Default |
| ----------- | ----------------------------------------------- | ------- |
| `padding`   | `"r1" \| "r2" \| "r3" \| "r4" \| "r5" \| "r6"`  | `"r3"`  |
| `shadow`    | `"sm" \| "md" \| "lg"`                          | `"md"`  |
| `className` | `string`                                        | —       |
| `ref`       | `Ref<HTMLDivElement>`                           | —       |
| …rest       | any other `div` props                           | —       |

There is no `variant` and no text colour — Card is deliberately thin. It gives you a
surface and gets out of the way. A couple of that thinness's edges are worth knowing
before you lean on it: see [Gotchas](#gotchas).

## Padding

`padding` insets the content from the responsive spacing scale. The scale is **inverted** —
`r1` is the roomiest and `r6` the tightest — and it steps up at the 640px breakpoint, so a
card is more generous on desktop than on mobile with no work from you.

<!-- example:Padding -->
```tsx
<Card padding="r5">
  <p className="text-body-2 text-fg-primary">Tight — r5</p>
</Card>
<Card padding="r3">
  <p className="text-body-2 text-fg-primary">Default — r3</p>
</Card>
<Card padding="r1">
  <p className="text-body-2 text-fg-primary">Roomy — r1</p>
</Card>
```
<!-- /example -->

## Elevation

`shadow` is how a card reads as *lifted*; `--C-BORDER-DEFAULT` is what makes it a bounded
region at all. The fill does neither — `--C-SURFACE-0` lifts **1.05–1.16:1** off `--C-CANVAS`
across the four measured themes, which is a hint, and it is nothing whatsoever against a
backdrop on the same rung.

<!-- example:Elevation -->
```tsx
<Card shadow="sm">
  <p className="text-body-2 text-fg-primary">Resting — sm</p>
</Card>
<Card shadow="md">
  <p className="text-body-2 text-fg-primary">Raised — md</p>
</Card>
<Card shadow="lg">
  <p className="text-body-2 text-fg-primary">Floating — lg</p>
</Card>
```
<!-- /example -->

## Composition

Card renders one `<div>` and nothing inside it — no header slot, no divider, no title
prop. Structure is yours to build with ordinary markup, which keeps the component out of
your layout decisions.

<!-- example:Composed -->
```tsx
<Card padding="r2">
  <header className="text-h5 text-fg-primary">Invite teammates</header>
  <p className="text-body-2 text-fg-secondary">
    Anyone with the link can join the Design workspace.
  </p>
  <footer className="text-body-3 text-fg-muted">Link expires in 7 days.</footer>
</Card>
```
<!-- /example -->

## Theme tokens

Card hard-codes no colour, radius, shadow, or spacing. Every utility below resolves to a
contract variable a theme can override — change the variable in one file and every card
re-tints at runtime, with no per-component CSS in the loop.

| Where     | Utility                                              | Override                                                             |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Surface   | `bg-surface-0`                                       | `--C-SURFACE-0`                                                     |
| Border    | `border` `border-border-default`                     | `--C-BORDER-DEFAULT`                                                |
| Corners   | `rounded-lg`                                         | `--RADIUS-LG`                                                       |
| Elevation | `shadow-sm` `shadow-md` `shadow-lg`                  | `--SHADOW-SM` `--SHADOW-MD` `--SHADOW-LG`                          |
| Padding   | `p-r1` `p-r2` `p-r3` `p-r4` `p-r5` `p-r6`            | `--R-SIZE-1` `--R-SIZE-2` `--R-SIZE-3` `--R-SIZE-4` `--R-SIZE-5` `--R-SIZE-6` |

Card fixes the surface at `--C-SURFACE-0`, the raised-sheet rung the
[theme contract](../theme-contract.md#surfaces-layered-backgrounds) names for cards,
dialogs, menus and the app-shell chrome. Surface `0→3` runs raised → recessed, so a panel
nested *inside* a card belongs on `--C-SURFACE-1`, and `--C-CANVAS` is not a rung at all —
it is the page floor, and sits between rungs 1 and 2. Override the token, not the
component, if you want cards to sit on a different surface globally.

## Gotchas

- **The `r`-scale is inverted.** `padding="r1"` is the *largest* inset, `r6` the smallest —
  the number is a rung on the responsive scale, not a pixel size. There is no zero-padding
  option; the tightest you can go is `r6` (0.25rem).
- **The border is the boundary; the fill is not.** `--C-SURFACE-0` is the raised-sheet rung —
  the lightest of the four surfaces in every theme, light or dark — but it lifts only
  **1.05–1.16:1** off `--C-CANVAS`, a hint at best, and exactly nothing when the backdrop is
  on the same rung. That case is not hypothetical: dialogs, popovers, menus and drawers are
  all rung 0, so a card dropped into any of them is sheet-on-sheet, and without the border it
  is bounded only by `shadow`, which on a dark theme is black on near-black. Border, shadow
  and fill now all point the same way in every theme, but a 1.05–1.16:1 step can only say the
  card is raised, never where it ends.
- **Card sets no text colour.** It paints a surface but leaves the ink to inheritance, and
  the CSS foundation sets no global text colour either — the default `color` stays at the UA
  `canvastext`. The dark examples stay legible anyway: `grimdark` and `tech` pair their
  dark surface with `color-scheme: dark`, which flips `canvastext` to a light ink, so even
  unstyled text reads on the dark sheet. The drop-out risk is narrower — a *custom* dark
  theme that darkens the surface but omits `color-scheme` leaves the ink dark-on-dark, and app
  content that hardcodes a light-theme text colour keeps it when it inherits into the card.
  Colour the card's own content with `text-fg-primary` / `text-fg-secondary` (the examples
  do), or nest it in a region that already does.
- **`overflow-hidden` clips every child to the corner radius,** which is what makes rounded
  media work — but paired with the always-on padding it means nothing inside can reach the
  card's edge. There is no flush / edge-to-edge mode; for a bleed image header reach for
  [MediaCard](media-card.md).
- **`min-w-0` is deliberate.** As a flex or grid child the card can hold wide content — a
  long unbroken string, a table — and `min-w-0` lets it shrink and wrap rather than blow out
  its container's width.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Card renders a plain `<div>` with no role — correct for a generic grouping element, which
carries no implicit semantics. If a card needs to be an announced landmark, render it as a
`<section>` (via your own wrapper) or add `role="region"` with an `aria-labelledby` pointing
at its heading; those props pass straight through.

Give the card's title a real heading element so the document outline stays intact — the
examples use `<h3>`. And don't make the whole card clickable by spreading an `onClick` onto
it: a bare div isn't focusable or keyboard-operable and won't be announced as actionable.
Put a real [Button](./button.md) or link inside instead.

## Related

[MediaCard](media-card.md) · [StatCard](./stat-card.md) · [HoverCard](hover-card.md) · [EmptyState](empty-state.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
