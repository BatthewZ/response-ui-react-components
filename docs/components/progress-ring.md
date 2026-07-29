# ProgressRing

A circular progress indicator: an SVG ring whose arc sweeps to `value / max`, with an
optional centered slot for a label. Four semantic colors, any pixel size, and it re-tints
and honors reduced-motion from your theme without a line of CSS from you.

<!-- example:Minimal -->
```tsx
<ProgressRing value={72} aria-label="Profile completion">
  72%
</ProgressRing>
```
<!-- /example -->

| Prop        | Type                                             | Default      |
| ----------- | ------------------------------------------------ | ------------ |
| `value`     | `number`                                         | — (required) |
| `max`       | `number`                                         | `100`        |
| `size`      | `number` (pixels — diameter)                     | `64`         |
| `thickness` | `number` (pixels — stroke width)                 | `6`          |
| `color`     | `"accent" \| "success" \| "warning" \| "error"`  | `"accent"`   |
| `children`  | `ReactNode` (centered slot)                      | —            |
| `className` | `string`                                         | —            |
| `ref`       | `Ref<HTMLDivElement>`                            | —            |
| …rest       | props of `div` (minus `children`)                | —            |

`value` is clamped to `[0, max]` for both the arc and `aria-valuenow`. `size` and
`thickness` are raw pixel numbers set inline, not theme tokens — see [Gotchas](#gotchas).

## Color

`accent` (default) is the neutral progress hue; the other three carry status meaning and
draw from the same tokens as [ProgressBar](progress-bar.md) and the status system, so they re-tint with it.

<!-- example:Colors -->
```tsx
<ProgressRing value={60} color="accent" aria-label="Storage used" />
<ProgressRing value={100} color="success" aria-label="Backup complete" />
<ProgressRing value={88} color="warning" aria-label="Quota nearly full" />
<ProgressRing value={96} color="error" aria-label="Over budget" />
```
<!-- /example -->

## Size

`size` is the outer diameter in pixels and `thickness` the stroke width — scale them
together, because the arc radius is `(size − thickness) / 2`.

<!-- example:Sizes -->
```tsx
<ProgressRing value={45} size={32} thickness={4} aria-label="Sync progress" />
<ProgressRing value={45} size={64} thickness={6} aria-label="Sync progress" />
<ProgressRing value={45} size={96} thickness={9} aria-label="Sync progress" />
```
<!-- /example -->

## Center label

`children` render in an absolutely-centered slot layered over the ring. It takes any
node — stack a big number over a caption, or drop in an icon. The slot inherits the
ambient text color; set your own type and ink on the inner elements.

<!-- example:WithLabel -->
```tsx
<ProgressRing value={68} size={128} thickness={8} aria-label="Course completion">
  <div className="text-center">
    <div className="text-h4 font-semibold text-fg-primary">68%</div>
    <div className="text-body-3 text-fg-secondary">complete</div>
  </div>
</ProgressRing>
```
<!-- /example -->

## Custom scale

`max` rescales the arc — the ring fills to `value / max`, so it need not be a percentage.

<!-- example:CustomMax -->
```tsx
<ProgressRing value={3} max={5} color="success" aria-label="Onboarding steps">
  <span className="text-body-2 font-semibold text-fg-primary">3/5</span>
</ProgressRing>
```
<!-- /example -->

## Theme tokens

ProgressRing paints its marks in `ProgressRing.css` (shipped in this package's `styles`
import) and reads every color and motion value from a contract variable — no hard-coded
hues. Override one and every ring in the app re-tints, at runtime, with no rebuild.

| Where                         | CSS class                            | Override                                  |
| ----------------------------- | ------------------------------------ | ----------------------------------------- |
| Track (background ring)       | `.progress-ring__track`              | `--C-SURFACE-3`                           |
| Indicator — `accent` (default)| `.progress-ring__indicator--accent`  | `--C-ACCENT`                              |
| Indicator — `success`         | `.progress-ring__indicator--success` | `--C-STATUS-SUCCESS`                      |
| Indicator — `warning`         | `.progress-ring__indicator--warning` | `--C-STATUS-WARNING`                      |
| Indicator — `error`           | `.progress-ring__indicator--error`   | `--C-STATUS-ERROR`                        |
| Arc sweep animation           | `.progress-ring__indicator`          | `--MOTION-DURATION-SHIFT` `--MOTION-EASE-SHIFT` |

The arc animates its `stroke-dashoffset` on every `value` change over
`--MOTION-DURATION-SHIFT`/`--MOTION-EASE-SHIFT` — the same "shift" motion pair the sliding
Tabs indicator uses. Under `prefers-reduced-motion: reduce` the transition is dropped (the
CSS media query and a matching `--no-animate` class both zero it), so the ring jumps
straight to its new fill. The color and radius are set with no unit tokens: `size` and
`thickness` are your pixel numbers, not `--R-SIZE-*`, so the ring does **not** grow at the
responsive breakpoint the way padding does.

## Gotchas

- **`size`/`thickness` are fixed pixels, not tokens.** They are written to inline `width`,
  `height`, and `stroke-width`, so a ring is the same diameter on mobile and desktop —
  unlike `--R-SIZE-*` spacing, it does not reflow at the breakpoint. Drive `size` from your
  own responsive state if you need it to change.
- **`thickness` ≥ `size` collapses the ring.** The radius is `(size − thickness) / 2`; make
  the stroke as wide as the diameter and the radius hits zero and nothing draws.
- **The centered label is not clamped, the arc is.** `value` is clamped to `[0, max]` for
  the arc and `aria-valuenow`, but whatever you pass as `children` is shown verbatim — hand
  a ring `value={72}` and a label of `"150%"` and the two will disagree. Derive the label
  from the same number.
- **`max <= 0` draws an empty ring.** The fill fraction is guarded to `0`, and
  `aria-valuemax` is set to your `max` unchanged, so the exposed range is invalid. At
  `max === 0` it collapses to a degenerate `min == max == 0`; a negative `max` is worse —
  `aria-valuenow` clamps to `max`, so it lands *below* `aria-valuemin` (`0`), an inverted
  range. Keep `max` positive.
- **The default `accent` arc rides on the track, not the page.** It reads against
  `--C-SURFACE-3` (the track), not the surface behind the whole ring. In a theme where
  `--C-ACCENT` lands close to `--C-SURFACE-3` the arc can wash out against its own track;
  the semantic `success`/`warning`/`error` colors are safer when contrast matters.
- **Client component.** It carries `"use client"` (it reads `usePrefersReducedMotion`), so
  it renders on the client — fine as a leaf in an RSC tree, but it is not itself server-only.
- **Both CSS imports are required.** The `.progress-ring*` rules ship in this package's
  `styles` entry, and they read `--C-*`/`--MOTION-*` tokens from `@batthewz/response-ui-css`
  — import the foundation first, then this package's `styles`.

## Accessibility

The wrapper is `role="progressbar"` with `aria-valuemin={0}`, `aria-valuemax={max}`, and
`aria-valuenow` set to the **clamped** value, so for any `max >= 0` assistive tech hears an
in-range number (see the `max` gotcha for the inverted range a negative `max` produces).
`prefers-reduced-motion` is respected — the arc snaps instead of sweeping.

There is **no default accessible name.** A bare `role="progressbar"` announces only its
percentage with no indication of *what* is progressing, and the visible `children` are a
decorative overlay that does not name the control. Pass `aria-label` (or `aria-labelledby`)
yourself — every example above does. If the ring is purely ornamental, hide it instead with
`aria-hidden`.

## Related

[ProgressBar](progress-bar.md) · [Meter](meter.md) · [Sparkline](sparkline.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
