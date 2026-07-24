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
| `min`         | `number`                      | `Math.min(...values)`    |
| `max`         | `number`                      | `Math.max(...values)`    |
| `aria-label`  | `string`                      | `"Sparkline of N values"`|
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

By default each Sparkline scales to its own min and max, so two charts with different
ranges look identical. Pass the same `min`/`max` to both to make their heights
comparable — and to give a `bar` chart headroom so its lowest bar isn't zero-height.

<!-- example:FixedScale -->
```tsx
<Sparkline min={0} max={100} values={[41, 44, 43, 48, 52]} aria-label="Team A, 0–100" />
<Sparkline min={0} max={100} values={[62, 60, 65, 63, 68]} aria-label="Team B, 0–100" />
```
<!-- /example -->

## Theme tokens

Sparkline touches only two contract variables — both for the draw-in animation. Colour is
deliberately **not** a token: it rides `currentColor` so the chart inherits its ink from
whatever text-colour utility you put on it (see [Tinting](#tinting)), rather than from a
`--C-*` override you'd have to set per instance.

| Where                    | Utility / class                                              | Override                                        |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------------- |
| Line / area / bar ink    | `.sparkline-line` `.sparkline-area` `.sparkline-bar` via `--sparkline-color` | `currentColor`                 |
| Draw-in / fade-in motion | `.sparkline--animate`                                       | `--MOTION-DURATION-SHIFT` `--MOTION-EASE-SHIFT` |

To tint from your theme rather than per call site, point a text utility at a theme
variable — e.g. `text-chart-1` resolves to `--C-CHART-1`, `text-trend-up` to
`--C-TREND-UP` (both optional dashboard tokens; see the
[chart palette](../theme-contract.md#dashboard--trend--chart)). Or set
`--sparkline-color` directly in a wrapping rule if you need to override just the chart.

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
- **The lowest `bar` is zero-height by default.** Bars measure from the domain minimum,
  which defaults to the smallest value, so the smallest bar collapses to nothing. Give a
  `min` below your data (e.g. `min={0}`) for a visible baseline.
- **`values` is required and shadows the SVG attribute.** `svg` has a native `values`
  presentation attribute (typed `string`); the prop type omits it so `values: number[]`
  wins. There's also no `children` — content is generated from `values`.
- **Empty and single-value inputs are safe.** `values={[]}` renders an empty labelled
  `<svg>` (no path, no bars); a single value renders a centred point, and a flat series
  (`max === min`) draws a centreline. None throw or emit `NaN`.
- **Client component.** Sparkline carries `"use client"` — it reads
  `usePrefersReducedMotion` to gate the draw-in — so it can't render in an RSC server tree
  the way [`Button`](./button.md) can.

## Accessibility

- **It's an `img` by default.** The `<svg>` is `role="img"` with an `aria-label`, so it is
  exposed to assistive tech as a single labelled graphic — its internal paths and bars are
  not. The role is a default a consumer can override (see the decorative note below).
- **The default label counts, it doesn't describe.** With no `aria-label` the name is
  `"Sparkline of N values"`, which tells a screen-reader user nothing about the trend.
  **Pass an `aria-label` that states what the data shows** (`"Revenue, last 7 days"`), as
  every example here does.
- **Purely decorative? Silence it.** A sparkline sitting beside a visible number (as in
  [`StatCard`](./stat-card.md)) is redundant to assistive tech. There's no built-in
  decorative mode, but `role` spreads through, so pass `role="presentation"` (or
  `aria-hidden`) to drop it from the tree — note `aria-label` is consumed by the component
  and can't be cleared that way.
- **Motion is gated twice.** The draw-in is skipped both in JS (`usePrefersReducedMotion`)
  and in CSS (`@media (prefers-reduced-motion: reduce)`) when the user asks for reduced
  motion; the final chart shows immediately.

## Related

[StatCard](./stat-card.md) · `Meter` · `ProgressRing` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
