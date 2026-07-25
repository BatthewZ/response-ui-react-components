# ProgressBar

A horizontal determinate progress track — one `role="progressbar"` div holding a single
fill div whose width is `value / max`. Four semantic colours, three heights, three fill
styles, and it honours `prefers-reduced-motion` from your theme without a line of CSS
from you.

<!-- example:Minimal -->
```tsx
<ProgressBar value={64} aria-label="Uploading design-system.zip" />
```
<!-- /example -->

**Anatomy.** `ProgressBar` is the whole widget: a track `<div>` with `overflow: hidden`
and a pill radius, containing exactly one fill `<div>` sized by an inline `width`
percentage. Its prop type **omits `children`**, so nothing renders inside it — the two
sub-parts are pre-styled `<span>`s you place *beside* the bar, not within it.
`ProgressBar.Label` is the caption ink, `ProgressBar.Value` the tabular-numerals readout.
Neither reads context, neither is required, and neither is wired to the bar: see
[Gotchas](#gotchas).

| Part                | Renders                                             | Props                                                                    |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| `ProgressBar`       | `<div role="progressbar">` + one fill `<div>`        | `value` · `max?` · `variant?` · `color?` · `size?` · `animate?` (+ all `div` props except `children`) |
| `ProgressBar.Label` | `<span class="progress-bar__label">`                 | all `span` props                                                          |
| `ProgressBar.Value` | `<span class="progress-bar__value">`                 | all `span` props                                                          |

| Prop        | Type                                            | Default      |
| ----------- | ----------------------------------------------- | ------------ |
| `value`     | `number`                                        | — (required) |
| `max`       | `number`                                        | `100`        |
| `variant`   | `"default" \| "gradient" \| "striped"`          | `"default"`  |
| `color`     | `"accent" \| "success" \| "warning" \| "error"` | `"accent"`   |
| `size`      | `"sm" \| "md" \| "lg"`                          | `"md"`       |
| `animate`   | `boolean`                                       | `true`       |
| `className` | `string`                                        | —            |
| `ref`       | `Ref<HTMLDivElement>`                           | —            |
| …rest       | props of `div` (minus `children`)               | —            |

The fill percentage is `Math.min(100, Math.max(0, (value / max) * 100))`, guarded to `0`
when `max <= 0`, so the *visual* bar is always within `[0, 100]%`. The ARIA numbers are
not clamped — see [Gotchas](#gotchas).

## Label and value

Because the root takes no `children`, a captioned bar is two blocks you compose yourself:
a header row holding the [Label](label.md) and the `Value`, then the bar beneath it. Put an `id` on
the [Label](label.md) and point the bar's `aria-labelledby` at it — that association is the one
thing the component does not do for you.

<!-- example:WithLabelAndValue -->
```tsx
<div>
  <div className="flex items-baseline justify-between">
    <ProgressBar.Label id="upload-label">Uploading design-system.zip</ProgressBar.Label>
    <ProgressBar.Value>64%</ProgressBar.Value>
  </div>
  <ProgressBar value={64} aria-labelledby="upload-label" />
</div>
```
<!-- /example -->

`ProgressBar.Value` is a styled `<span>` and nothing more: the `"64%"` above is text you
wrote, not a readout derived from `value`. It sets `font-variant-numeric: tabular-nums`
so a ticking percentage doesn't jitter, and it is the only part of the widget that is
`--C-TEXT-PRIMARY`; the [Label](label.md) is the quieter `--C-TEXT-SECONDARY`.

## Size

`size` sets the track height only — it changes no type, padding or radius. The three
heights map onto the responsive `--R-SIZE-*` scale, and two of the three grow at the
40rem breakpoint (see [Theme tokens](#theme-tokens)). The track is a `width: 100%` block,
so consecutive bars need a wrapper to space them; the examples below use
[Stack](stack.md).

<!-- example:Sizes -->
```tsx
<Stack gap="r5">
  <ProgressBar value={45} size="sm" aria-label="Sync progress, thin" />
  <ProgressBar value={45} size="md" aria-label="Sync progress, default" />
  <ProgressBar value={45} size="lg" aria-label="Sync progress, thick" />
</Stack>
```
<!-- /example -->

## Colour

`accent` (default) is the neutral progress hue; the other three draw from the
`--C-STATUS-*` family — the same tokens [ProgressRing](progress-ring.md) paints its arc
with, so the two re-tint together. These change the fill hue and **nothing else**: no
attribute, no announced text.

<!-- example:Colors -->
```tsx
<Stack gap="r5">
  <ProgressBar value={60} color="accent" aria-label="Storage used" />
  <ProgressBar value={100} color="success" aria-label="Backup complete" />
  <ProgressBar value={88} color="warning" aria-label="Quota nearly full" />
  <ProgressBar value={96} color="error" aria-label="Over budget" />
</Stack>
```
<!-- /example -->

## Variant

`default` is a flat fill. `striped` layers a fixed 45° white-at-15% texture *over*
whatever `color` painted, so the two compose. `gradient` does not compose: it uses the
`background` shorthand and is declared after the colour rules, so it wipes the colour and
always ramps `--C-ACCENT` → `--C-ACCENT-HOVER`.

<!-- example:Variants -->
```tsx
<Stack gap="r5">
  <ProgressBar value={70} variant="default" aria-label="Import, plain" />
  <ProgressBar value={70} variant="gradient" aria-label="Import, gradient" />
  <ProgressBar value={70} variant="striped" color="warning" aria-label="Import, striped" />
</Stack>
```
<!-- /example -->

## Custom scale

`max` rescales the fill and becomes `aria-valuemax`, so the bar need not be a percentage.

<!-- example:CustomMax -->
```tsx
<ProgressBar value={3} max={5} color="success" aria-label="Onboarding steps" />
```
<!-- /example -->

## Motion

The fill transitions its `width` over `--MOTION-DURATION-SHIFT`/`--MOTION-EASE-SHIFT`
whenever `value` changes. `animate={false}` adds a `progress-bar__fill--no-animate` class
that zeroes that transition, so the fill snaps — useful when you are stepping a bar
programmatically and don't want the eased tail.

<!-- example:NoAnimation -->
```tsx
<ProgressBar value={82} animate={false} aria-label="Rendering frames" />
```
<!-- /example -->

Reduced motion is handled twice over, belt-and-braces: the component reads
`usePrefersReducedMotion()` and applies the same `--no-animate` class, *and*
`ProgressBar.css` drops the transition inside a `@media (prefers-reduced-motion: reduce)`
block. Either path alone would do it; neither depends on the other.

## Carrying status to assistive tech

`role`, `aria-valuenow`, `aria-valuemin` and `aria-valuemax` are written before the rest
props are spread, so anything you pass wins. That is the supported escape hatch for the
fact that `color` is purely visual — `aria-valuetext` replaces the bare number a screen
reader would otherwise announce.

<!-- example:AnnouncedStatus -->
```tsx
<ProgressBar
  value={96}
  color="error"
  aria-label="Storage used"
  aria-valuetext="96 percent — over quota"
/>
```
<!-- /example -->

## Theme tokens

ProgressBar uses **no Tailwind utilities** — every mark is drawn in `ProgressBar.css`
(shipped in this package's `styles` entry) reading contract variables directly. Override
one and every bar in the app re-tints at runtime, no rebuild.

| Where                              | CSS class                        | Override                                        |
| ---------------------------------- | -------------------------------- | ----------------------------------------------- |
| Track background                   | `.progress-bar`                  | `--C-SURFACE-1`                                 |
| Track and fill corners             | `.progress-bar`                  | `--RADIUS-FULL`                                 |
| Height — `sm` · `md` · `lg`        | `.progress-bar--sm` `.progress-bar--md` `.progress-bar--lg` | `--R-SIZE-6` · `--R-SIZE-5` · `--R-SIZE-4`      |
| Fill — `accent` (default)          | `.progress-bar__fill--accent`    | `--C-ACCENT`                                    |
| Fill — `success`                   | `.progress-bar__fill--success`   | `--C-STATUS-SUCCESS`                            |
| Fill — `warning`                   | `.progress-bar__fill--warning`   | `--C-STATUS-WARNING`                            |
| Fill — `error`                     | `.progress-bar__fill--error`     | `--C-STATUS-ERROR`                              |
| Fill — `gradient` ramp             | `.progress-bar__fill--gradient`  | `--C-ACCENT` → `--C-ACCENT-HOVER`               |
| Width transition                   | `.progress-bar__fill`            | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT` |
| Label ink · weight                 | `.progress-bar__label`           | `--C-TEXT-SECONDARY` · `--Semibold-Weight`      |
| Value ink · weight                 | `.progress-bar__value`           | `--C-TEXT-PRIMARY` · `--Bold-Weight`            |
| Label / value type                 | `.progress-bar__label` `.progress-bar__value` | `--BodyText-2` · `--BodyText-2-line-height`     |
| Label / value bottom margin        | `.progress-bar__label` `.progress-bar__value` | `--R-SIZE-6`                                    |

Two of the three height tokens are responsive and one is not, which is why the sizes
don't scale uniformly: `--R-SIZE-4` (`lg`) steps `0.75rem → 1.25rem` and `--R-SIZE-5`
(`md`) steps `0.5rem → 0.75rem` at the `width >= 40rem` breakpoint, but `--R-SIZE-6`
(`sm`, and the label/value margin) holds at `0.25rem` on both sides of it. A consequence
worth knowing: `md` above 40rem is exactly as tall as `lg` below it. `--BodyText-2` and
both weight tokens step up at the same breakpoint, so the label and value get slightly
larger and heavier on wide screens.

The striped texture is the one mark that is **not** themeable — its stripes are a
hard-coded `oklch(1 0 0 / 0.15)` in the stylesheet, not a variable, so they are always
white at 15% over your fill and there is no token to change them.

## Gotchas

- **The root takes no `children`.** `children` is `Omit`-ed from the prop type, so
  `<ProgressBar value={64}>…</ProgressBar>` is a compile error. `ProgressBar.Label` and
  `ProgressBar.Value` go beside the bar, and you own the layout between them.
- **`ProgressBar.Label` does not label the bar.** It is a bare styled `<span>` — it sets
  no `id`, and the root sets no `aria-labelledby`. A bar with a [Label](label.md) sitting next to it
  still announces with **no accessible name**. Wire the two yourself, as the example above
  does, or pass `aria-label`.
- **`ProgressBar.Value` is not derived from `value`.** It renders whatever text you give
  it. Hand a bar `value={64}` and a `Value` of `"80%"` and the two will disagree with no
  warning; compute both from one number.
- **`aria-valuenow` is not clamped.** Only the width is. `value={150}` on `max={100}`
  paints a full bar but announces `150`, past its own `aria-valuemax`; `value={-10}`
  paints an empty bar and announces `-10`, below `aria-valuemin={0}`.
  [ProgressRing](progress-ring.md) clamps this and ProgressBar does not, so the two
  behave differently on the same out-of-range input.
- **`variant="gradient"` silently discards `color`.** The gradient rule sets the
  `background` shorthand — which resets `background-color` — and sits after the four
  colour rules at equal specificity, so it always wins.
  `<ProgressBar variant="gradient" color="error" />` renders the accent ramp, not red.
  Use `striped` (or `default`) when the colour is load-bearing.
- **`striped` stripes do not move.** There is no `@keyframes` anywhere in the package for
  them, and `animate` governs only the width transition. `background-size: 200% 100%` is
  set on the fill but nothing animates `background-position`, so the texture is static.
- **`value={NaN}` renders a *full* bar.** The clamp propagates `NaN`, the inline style
  becomes `width: NaN%`, and the CSSOM rejects that outright — leaving the fill at its
  default `width: auto`, which is the whole track. A `loaded / total` computation with
  `total === 0` therefore reads as 100% complete. Guard the division.
- **`max <= 0` exposes an invalid range.** The fill fraction is guarded to `0`, but
  `aria-valuemax` is set to your `max` unchanged, so `aria-valuemin={0}` is greater than
  or equal to it. Keep `max` positive.
- **The empty part of the track is close to invisible in every shipped theme.** It is
  `--C-SURFACE-1`, measured against `--C-SURFACE-0` (the [Card](card.md) surface) at
  **1.05:1 default · 1.03:1 `events` · 1.02:1 `tech` · 1.07:1 `grimdark`**, and against the
  page canvas at 1.05 / 1.03 / 1.08 / 1.17:1 — so a bar at low `value` reads as a stub
  floating on nothing, and the total it is measured against cannot be seen. Override
  `--C-SURFACE-1`, or pass an inline `style={{ backgroundColor: … }}`, when the total
  needs to be legible. ([ProgressRing](progress-ring.md) uses `--C-SURFACE-2` for the
  equivalent track — still only 1.10:1 on `--C-SURFACE-0` in the default theme, but the two
  siblings do not match out of the box either way.)
- **In `events` and `grimdark` the *filled* part is barely visible too.** The default
  `accent` fill measures **2.63:1** on its own track in `events` and **2.77:1** in
  `grimdark` — under the 3:1 floor WCAG 1.4.11 sets for a graphical object that carries
  meaning. It is fine in the default theme (4.95:1) and `tech` (14.56:1). Pair the bar with
  a `ProgressBar.Value` readout rather than relying on the fill edge.
- **`className` reaches the track only, and loses to the track's own rules.** There is no
  prop that classes the inner fill. And because `ProgressBar.css` ships unlayered while
  Tailwind utilities live in `@layer utilities` (measured: the utilities layer ends well
  before the first `.progress-bar` rule in the compiled sheet), a utility that touches a
  property the stylesheet already sets on the track — `background-color`, `border-radius`,
  `width`, `overflow`, or the `height` set by the size modifier — does not win. Utilities
  for properties the stylesheet leaves
  alone (margin, for instance) land normally; for the rest, use inline `style`, which is
  spread through and beats both.
- **Client component.** `ProgressBar.tsx` opens with `"use client"` because it calls
  `usePrefersReducedMotion`, so it is a client leaf in an RSC tree, not server-only. The
  sub-parts ship from the same module and inherit the directive.
- **Both CSS imports are required.** The `.progress-bar*` rules live in this package's
  `styles` entry, and they read `--C-*`/`--R-SIZE-*`/`--MOTION-*` from
  `@batthewz/response-ui-css` — import the foundation first, then this package's `styles`.

## Accessibility

The root renders `role="progressbar"` with `aria-valuenow={value}`, `aria-valuemin={0}`
and `aria-valuemax={max}`. There is no `min` prop, so the exposed floor is always zero.
`prefers-reduced-motion` is respected — the fill snaps rather than easing.

- **There is no default accessible name.** A bare `role="progressbar"` announces a number
  with no indication of *what* is progressing. Every example on this page passes
  `aria-label` or `aria-labelledby`; do the same, or hide a purely decorative bar with
  `aria-hidden`.
- **`color` is conveyed by colour alone.** Switching to `error` changes the fill hue and
  nothing else — no `data-*` attribute, no `aria-valuetext`, no text alternative. A
  screen-reader or colourblind user hears the identical announcement at `success` and at
  `error`. If the status is load-bearing, carry it in the accessible name or in
  `aria-valuetext`, as the example above does.
- **The announced number can leave the announced range.** `aria-valuenow` is the raw
  `value` (see Gotchas), so out-of-range input produces a contradictory announcement even
  though the bar looks correct.
- **There is no indeterminate mode.** `value` is required and always produces a
  determinate bar; there is no way to express "working, duration unknown". Use
  [Spinner](spinner.md) for that.
- **Rest props override the ARIA attributes.** They are spread last, so
  `aria-valuetext`, `aria-describedby`, or even `role` can be supplied by you — a
  deliberate escape hatch rather than an oversight.

## Related

[ProgressRing](progress-ring.md) · [Meter](meter.md) · [Sparkline](sparkline.md) ·
[Spinner](spinner.md) · [Skeleton](skeleton.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
