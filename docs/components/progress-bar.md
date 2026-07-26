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
Neither reads context and neither wires itself to the bar — the root's type asks *you* for
that association, and will not compile without it: see [Naming the bar](#naming-the-bar).

| Part                | Renders                                             | Props                                                                    |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| `ProgressBar`       | `<div role="progressbar">` + one fill `<div>`        | `value` · one of `aria-label` / `aria-labelledby` / `aria-hidden` · `max?` · `variant?` · `color?` · `size?` · `animate?` · `statusLabel?` (+ all `div` props except `children`) |
| `ProgressBar.Label` | `<span class="progress-bar__label">`                 | all `span` props                                                          |
| `ProgressBar.Value` | `<span class="progress-bar__value">`                 | all `span` props                                                          |

| Prop        | Type                                            | Default      |
| ----------- | ----------------------------------------------- | ------------ |
| `value`     | `number`                                        | — (required) |
| `aria-label` **or** `aria-labelledby` **or** `aria-hidden` | `string` / `string` / `true` | — (one required) |
| `max`       | `number`                                        | `100`        |
| `variant`   | `"default" \| "gradient" \| "striped"`          | `"default"`  |
| `color`     | `"accent" \| "success" \| "warning" \| "error"` | `"accent"`   |
| `size`      | `"sm" \| "md" \| "lg"`                          | `"md"`       |
| `animate`   | `boolean`                                       | `true`       |
| `statusLabel` | `string`                                      | the word for `color` |
| `className` | `string`                                        | —            |
| `ref`       | `Ref<HTMLDivElement>`                           | —            |
| …rest       | props of `div` (minus `children`)               | —            |

The fill percentage is `Math.min(100, Math.max(0, (value / max) * 100))`, guarded to `0`
when `max <= 0`, so the *visual* bar is always within `[0, 100]%`. The ARIA numbers track
it — see [Gotchas](#gotchas).

## Naming the bar

A bar carries no text, so it has nothing to take an accessible name from, and
`ProgressBar.Label` cannot give it one: the root omits `children`, so the label is the
bar's **sibling** and no context can reach across. Rather than let that go unsaid, the
root's type requires one of three things — pick the one that fits and the compiler stops
asking:

| You pass | For |
| --- | --- |
| `aria-label="Uploading design-system.zip"` | A bar with no visible caption. |
| `aria-labelledby="upload-label"` | A bar captioned by a `ProgressBar.Label` you gave that `id`. |
| `aria-hidden` | A bar that is pure decoration, hidden from assistive tech entirely. |

Omit all three and `<ProgressBar value={64} />` does not compile — TypeScript reports
`aria-label` as missing, which is the right answer for most bars. This is the whole of the
association work: the sub-part still does not wire itself, but a bar can no longer ship
announcing "64" and nothing else.

## Label and value

Because the root takes no `children`, a captioned bar is two blocks you compose yourself:
a header row holding the [Label](label.md) and the `Value`, then the bar beneath it. Put an `id` on
the [Label](label.md) and point the bar's `aria-labelledby` at it.

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

A status `color` announces itself: `success`, `warning` and `error` set
`aria-valuetext` to the percentage plus the status word — `"96%, Error"` — while the
neutral `accent` sets nothing. `statusLabel` replaces the word for a translation, and
`statusLabel=""` removes it when your own label already says it.

`role`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext` are all
written before the rest props are spread, so a phrasing of your own still wins outright:

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
- **`ProgressBar.Label` does not label the bar by itself.** It is a bare styled `<span>` —
  it sets no `id`, and the root reads no context, because the two are siblings. What stops
  a bar going unnamed is the *type*: one of `aria-label`, `aria-labelledby` or
  `aria-hidden` is required (see [Naming the bar](#naming-the-bar)). Give the
  [Label](label.md) an `id` and point at it.
- **`ProgressBar.Value` is not derived from `value`.** It renders whatever text you give
  it. Hand a bar `value={64}` and a `Value` of `"80%"` and the two will disagree with no
  warning; compute both from one number.
- **`aria-valuenow` is clamped, like the width.** `value={150}` on `max={100}` announces
  `100` and `value={-10}` announces `0`, so the announcement never sits outside the range
  it is announced against — and an out-of-range `value` is narrowed silently rather than
  reported.
- **`variant="gradient"` silently discards `color`.** The gradient rule sets the
  `background` shorthand — which resets `background-color` — and sits after the four
  colour rules at equal specificity, so it always wins.
  `<ProgressBar variant="gradient" color="error" />` renders the accent ramp, not red —
  though `aria-valuetext` still announces "Error", so the two channels disagree. Use
  `striped` (or `default`) when the colour is load-bearing.
- **`striped` stripes do not move.** There is no `@keyframes` anywhere in the package for
  them, and `animate` governs only the width transition. `background-size: 200% 100%` is
  set on the fill but nothing animates `background-position`, so the texture is static.
- **`value={NaN}` renders an *empty* bar.** A non-finite `value` is floored to `0` before
  it reaches the style, because `width: NaN%` is rejected by the CSSOM and leaves the
  fill at `width: auto` — the whole track. So a `loaded / total` computation with
  `total === 0` reads as 0% rather than as complete; it is still worth guarding the
  division, since neither number is the one you meant.
- **`max <= 0` exposes no range at all.** A `max` that describes no range cannot be
  announced, so the fill is guarded to `0` and `aria-valuenow`/`aria-valuemin`/
  `aria-valuemax` are all omitted — ARIA's indeterminate progressbar. A status
  `statusLabel` is then announced on its own, without a percentage. Keep `max` positive
  if you want a number announced.
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

The root renders `role="progressbar"` with `aria-valuenow` (the *clamped* `value`),
`aria-valuemin={0}` and `aria-valuemax={max}` — all three omitted when `max` describes no
range. There is no `min` prop, so the exposed floor is always zero.
`prefers-reduced-motion` is respected — the fill snaps rather than easing.

- **There is no default accessible name, and the type will not let you skip one.** A bare
  `role="progressbar"` announces a number with no indication of *what* is progressing, so
  the root requires `aria-label`, `aria-labelledby`, or `aria-hidden` for a decorative bar
  ([Naming the bar](#naming-the-bar)). Nothing is defaulted — an English default would be
  worse than the compile error.
- **`color` is named to assistive tech, but still only a hue on screen.** A status
  `color` emits `aria-valuetext` — `"96%, Error"` — so `success` and `error` no longer
  announce identically. `statusLabel` replaces that word (`""` removes it), and `accent`
  stays silent because it names no status. The word rides `aria-valuetext` rather than a
  visually-hidden child because `role="progressbar"` makes its children presentational,
  the same reason [Avatar](avatar.md) labels its presence dot through the name. **Nothing
  about this helps a sighted colourblind reader** — the bar itself still differs only in
  tint, so put the status in a visible label when it is load-bearing.
- **The announced number cannot leave the announced range.** `aria-valuenow` is clamped
  into `[0, max]` alongside the fill width (see Gotchas), so an out-of-range `value` is
  narrowed silently rather than announced as something impossible.
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
