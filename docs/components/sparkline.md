# Sparkline

A tiny inline trend chart — a `number[]` in, a self-scaling `<svg>` out. Three shapes
(`line`, `area`, `bar`), no axes or labels, and it inks itself with `currentColor` so a
single text-colour utility tints it to match the surrounding text.

<!-- example:Minimal -->
```tsx
<Sparkline values={[12, 18, 15, 22, 19, 25, 28]} aria-label="Revenue, last 7 days" />
```
<!-- /example -->

| Prop          | Type                          | Default                  |
| ------------- | ----------------------------- | ------------------------ |
| `values`      | `number[]`                    | — (required)             |
| `variant`     | `"line" \| "area" \| "bar"`   | `"line"`                 |
| `width`       | `number`                      | `120`                    |
| `height`      | `number`                      | `32`                     |
| `strokeWidth` | `number`                      | `2`                      |
| `min`         | `number`                      | `Math.min(...values)` — `bar`: `Math.min(0, ...values)` |
| `max`         | `number`                      | `Math.max(...values)` — `bar`: `Math.max(0, ...values)` |
| `aria-label`  | `string`                      | a description of the series (below) |
| `ref`         | `Ref<SVGSVGElement>`          | —                        |
| …rest         | `svg` props (minus `children`, `values`) | —             |

`width`/`height` set both the `viewBox` coordinate system the chart is drawn in **and**
its default rendered size in px — a `<Sparkline width={120} height={32}/>` with no CSS
renders at 120×32px. Because `preserveAspectRatio="none"`, any CSS size overrides that box
and stretches the drawing non-uniformly. See [Gotchas](#gotchas).

## Variants

`line` is a stroked path, `area` adds a translucent fill of the same hue beneath it, and
`bar` draws one column per value. All three read the same `values`.

<!-- example:Variants -->
```tsx
<Sparkline variant="line" values={[8, 9, 7, 11, 10, 13, 14]} aria-label="Sessions, line" />
<Sparkline variant="area" values={[8, 9, 7, 11, 10, 13, 14]} aria-label="Sessions, area" />
<Sparkline variant="bar" values={[8, 9, 7, 11, 10, 13, 14]} aria-label="Sessions, bars" />
```
<!-- /example -->

## Tinting

Sparkline hard-codes no colour. Every shape paints with `currentColor`, so a text-colour
utility on the `<svg>` — `text-trend-up`, `text-chart-2`, `text-fg-muted`, anything that
sets `color` — tints the whole chart. The `area` fill is the same hue at reduced opacity.

<!-- example:Tinting -->
```tsx
<Sparkline
  className="text-trend-up"
  values={[20, 22, 21, 26, 28, 31, 35]}
  aria-label="Signups trending up"
/>
<Sparkline
  className="text-chart-2"
  variant="area"
  values={[35, 31, 33, 27, 24, 22, 19]}
  aria-label="Churn trending down"
/>
```
<!-- /example -->

## Sizing

<!-- example:Sizing -->
```tsx
<Sparkline
  width={240}
  height={64}
  strokeWidth={3}
  values={[4, 6, 5, 9, 7, 12, 10, 14, 13, 18]}
  aria-label="Daily active users, last 10 days"
/>
```
<!-- /example -->

## Shared scale

By default a `line` or `area` scales to its own min and max, so two charts with different
ranges look identical. Pass the same `min`/`max` to both to make their heights comparable.

<!-- example:FixedScale -->
```tsx
<Sparkline min={0} max={100} values={[41, 44, 43, 48, 52]} aria-label="Team A, 0–100" />
<Sparkline min={0} max={100} values={[62, 60, 65, 63, 68]} aria-label="Team B, 0–100" />
```
<!-- /example -->

## Bars measure from zero

A bar's *length* is its value, so the `bar` variant widens its default domain to include
zero rather than starting at `min(values)`. That is what makes the columns comparable to
each other — but it also means a series that lives in a narrow band far from zero draws as
a row of near-identical full-height bars. That is the chart telling the truth: the metric
really is flat. Reach for a `line` and an explicit domain to show variation *within* the
band.

<!-- example:NarrowBand -->
```tsx
<Sparkline
  variant="bar"
  values={[99.9, 100, 99.8, 100, 99.95]}
  aria-label="Uptime as bars — honest, but every column is full height"
/>
<Sparkline
  min={99.5}
  max={100}
  values={[99.9, 100, 99.8, 100, 99.95]}
  aria-label="Uptime against a 99.5–100% domain"
/>
```
<!-- /example -->

## Theme tokens

Sparkline touches only two contract variables — both for the draw-in animation. Colour is
deliberately **not** a token: it rides `currentColor` so the chart inherits its ink from
whatever text-colour utility you put on it (see [Tinting](#tinting)), rather than from a
`--C-*` override you'd have to set per instance.

| Where                    | Utility / class                                              | Override                                        |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------------- |
| Line / area / bar ink    | `.sparkline-line` `.sparkline-area` `.sparkline-bar` via `--sparkline-color` | `currentColor` (the fallback at each read — nothing declares the variable) |
| Draw-in / fade-in motion | `.sparkline--animate`                                       | `--MOTION-DURATION-SHIFT` `--MOTION-EASE-SHIFT` |

To tint from your theme rather than per call site, point a text utility at a theme
variable — e.g. `text-chart-1` resolves to `--C-CHART-1`, `text-trend-up` to
`--C-TREND-UP` (both optional dashboard tokens; see the
[chart palette](../theme-contract.md#dashboard--trend--chart)).

`--sparkline-color` is a **public write channel and it inherits**, so any of these reach
the chart: your theme's `:root`, a rule on any ancestor, an arbitrary-property utility
(`className="[--sparkline-color:var(--C-CHART-3)]"`), or an inline `style`. (Only the
last two used to work. `Sparkline.css` declared the default *on* `.sparkline`,
and a declaration on the element beats an inherited one at every cascade layer, so a
theme setting the variable at `:root` lost permanently. The default now lives in each
read's `var(--sparkline-color, currentColor)` fallback, which is identical where nothing
sets it and reachable where something does.)

Set it at `:root` and it wins over `text-*` on the chart — the variable is read first and
`currentColor` is only its fallback. So pick one: a text utility for per-instance tinting,
the variable for a house palette.

## Slots

**Sparkline exposes no `classNames` slots, and that is a ruling rather than an
omission.** It renders one addressable element — the `<svg>` — and `className` is
already on it. The paths, bars and points inside are generated from `values`, and the
one thing a caller wants to change about them is their ink, which is a *value*: it rides
`--sparkline-color` (above), reachable from the same element `className` reaches. The
rest of what those classes carry is the chart itself — the area's `fill-opacity`, the
line's dash pattern normalised against `pathLength=1` — where a caller's class would not
be an override so much as a different chart, and in the dash pattern's case a broken one
(see [Gotchas](#gotchas)).

[StatCard](stat-card.md) wraps this component and adds nothing to that surface: its
`StatCard.Sparkline` forwards `className` and `ref` straight through to the `<svg>`.

## Gotchas

- **`preserveAspectRatio="none"`.** The SVG stretches non-uniformly to fill its rendered
  box, so sizing it with a CSS `className` (`className="w-full"`) rather than the `width`
  prop distorts the geometry — and, because the stroke stretches with it, the line reads
  thicker on one axis than the other. Size it via `width`/`height` and keep the CSS box in
  the same proportion.
- **`strokeWidth` also sets the vertical padding.** It doubles as the top/bottom inset
  (`pad`) that stops a thick line clipping at the edges, so a larger `strokeWidth`
  compresses the drawing area. For the `bar` variant, where there's no stroke, it *only*
  pads — a wider `strokeWidth` shortens the bars.
- **`bar` measures from zero; `line`/`area` scale to the data.** A bar's *length* reads as
  magnitude, so its default domain is widened to include zero and bars grow from the zero
  line (negative values hang below it). Line and area encode *position*, not magnitude, so
  they still fit themselves to `min(values)`–`max(values)`. An explicit `min`/`max`
  overrides either; if it excludes zero, the bar baseline clamps to the floor of the
  drawing area. **Consequence:** a series in a narrow band far from zero (uptime at
  99.8–100%) draws as near-identical full-height bars — that is honest, and it is a sign
  the data wants a `line` with an explicit domain instead. (Before 0.12.0 bars measured
  from `min(values)`, which rendered the smallest datum as an invisible zero-height rect
  and inflated a 0.2pt spread into full-scale swings.)
- **`values` is required and shadows the SVG attribute.** `svg` has a native `values`
  presentation attribute (typed `string`); the prop type omits it so `values: number[]`
  wins. There's also no `children` — content is generated from `values`.
- **Empty and single-value inputs are safe.** `values={[]}` renders an empty labelled
  `<svg>` (no path, no bars); a single value renders a centred point, and a flat series
  (`max === min`) draws a centreline. None throw or emit `NaN`.
- **Client component.** Sparkline carries `"use client"` — it reads
  `usePrefersReducedMotion` to gate the draw-in — so it can't render in an RSC server tree
  the way [Button](button.md) can.

## Accessibility

- **It's an `img` by default.** The `<svg>` is `role="img"` with an `aria-label`, so it is
  exposed to assistive tech as a single labelled graphic — its internal paths and bars are
  not. An explicit `role` of your own still wins, and `aria-hidden` removes both (below).
- **The default label describes the series.** With no `aria-label` the name is built from the
  data: `"Sparkline: 4 values, 12 to 28, rising, low 12, high 28"` — where the series starts
  and ends, which way it went, and its extremes. `rising`/`falling`/`level` is read off the
  **ends**, not the extremes, so a series that peaks in the middle and closes down is
  `falling`. Degenerate inputs still name themselves: `"Sparkline: no data"` for `values={[]}`
  and `"Sparkline: one value, 7"` for a single datum. It is a fallback, and English: it says
  what the numbers *do*, never what they *mean*, so **pass an `aria-label` that states what
  the data shows** (`"Revenue, last 7 days"`), as every example here does. (Before 0.10.1 the
  default was `"Sparkline of N values"`, which told a screen-reader user nothing at all.)
- **`aria-labelledby` replaces it.** Point it at a visible caption and no generated
  `aria-label` is emitted alongside — the element is named by yours and nothing competes with
  it in the tree.
- **Purely decorative? `aria-hidden` is the mode.** A sparkline sitting beside a visible
  number (as in [StatCard](stat-card.md)) is redundant to assistive tech.
  Pass `aria-hidden` and the `<svg>` renders with **no `role` and no `aria-label`** — nothing
  left in the accessibility tree to announce. `role="presentation"` also works, because an
  explicit `role` rides the rest spread and wins, but it leaves the generated `aria-label` on
  the element; `aria-hidden` is the clean one.
- **Motion is gated twice.** The draw-in is skipped both in JS (`usePrefersReducedMotion`)
  and in CSS (`@media (prefers-reduced-motion: reduce)`) when the user asks for reduced
  motion; the final chart shows immediately.

## Related

[StatCard](./stat-card.md) · [Meter](meter.md) · [ProgressRing](progress-ring.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
