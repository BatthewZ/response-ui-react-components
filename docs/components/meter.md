# Meter

A segmented capacity gauge for a measurement inside a known range — disk usage, memory
pressure, a battery. It renders `role="meter"` (deliberately **not** `progressbar`),
fills left-to-right in discrete segments, and re-tints the whole filled run to a single
semantic colour once the value crosses a `warningAt` or `criticalAt` threshold you set.

<!-- example:Minimal -->
```tsx
<Meter value={72} aria-label="Disk usage" />
```
<!-- /example -->

| Prop         | Type                                | Default    |
| ------------ | ----------------------------------- | ---------- |
| `value`      | `number`                            | (required) |
| `min`        | `number`                            | `0`        |
| `max`        | `number`                            | `100`      |
| `segments`   | `number`                            | `10`       |
| `warningAt`  | `number`                            | —          |
| `criticalAt` | `number`                            | —          |
| `statusLabels` | `Partial<Record<"ok" \| "warning" \| "critical", string>>` | `{ warning: "Warning", critical: "Critical" }` |
| `aria-label` | `string`                            | (required) |
| `className`  | `string`                            | —          |
| `style`      | `CSSProperties`                     | —          |
| `ref`        | `Ref<HTMLDivElement>`               | —          |
| …rest        | props of `div` (minus `children`)   | —          |

`value` and `aria-label` are the only required props — the rest have defaults, and
`children` is omitted from the type because the bars are generated from `segments`. One
prop has a sharp edge: `style.gridTemplateColumns` is ignored. See [Gotchas](#gotchas).

## Thresholds and status colour

The filled run takes one colour, chosen by the highest threshold `value` has reached:
accent below `warningAt`, warning at or above it, error at or above `criticalAt`. Both
thresholds are optional — with neither set the meter is always the accent colour. The
`data-status` attribute (`"ok" | "warning" | "critical"`) is exposed on the root for your
own styling hooks.

<!-- example:Thresholds -->
```tsx
<Meter value={48} warningAt={70} criticalAt={90} aria-label="CPU load" />
<Meter value={78} warningAt={70} criticalAt={90} aria-label="Memory" />
<Meter value={95} warningAt={70} criticalAt={90} aria-label="Swap" />
```
<!-- /example -->

Thresholds are compared against the **raw** `value`, not the fraction — on a custom
range they are absolute numbers in that range, not percentages. `criticalAt` is tested
first, so if the two ever cross, critical wins.

The crossed threshold is also **named**, not just tinted: the word joins `aria-label`, so
the meter above announces "Swap, Critical". `statusLabels` merges over the defaults —
`{ critical: "Kritisch" }` translates one, `{ ok: "Normal" }` gives the untriggered state a
word of its own, and `{ critical: "" }` drops the suffix for a name that already says it.
The word goes in the name rather than a hidden child because `role="meter"` makes its
children presentational, exactly as `role="img"` does on [Avatar](avatar.md)'s presence dot.

## Custom range

`min` and `max` move the window. The fill reflects where `value` sits inside it, so
`62` on a `40–90` range is a little under half.

<!-- example:CustomRange -->
```tsx
<Meter value={62} min={40} max={90} aria-label="Water temperature" />
```
<!-- /example -->

## Granularity

`segments` controls how many bars render (and drives the inline `grid-template-columns`).
More segments read as a finer, more continuous bar; fewer read as coarse steps.

<!-- example:Granularity -->
```tsx
<Meter value={40} segments={5} aria-label="Signal strength" />
<Meter value={40} segments={20} aria-label="Battery" />
```
<!-- /example -->

## The reserved end segment

A value below `max` never paints the last segment, and a value above `min` always paints
at least one — so a nearly-full meter never *looks* full, and a barely-started one is
never invisible.

<!-- example:NeverFalselyFull -->
```tsx
<Meter value={99} aria-label="Storage" />
```
<!-- /example -->

## Theme tokens

Meter has no CSS of its own — it is pure Tailwind utilities, and every colour, corner,
and gap below resolves to a contract variable a theme can override. Change `--C-ACCENT`
in one file and every healthy meter in the app re-tints at runtime, no rebuild.

| Where                         | Utility             | Override             |
| ----------------------------- | ------------------- | -------------------- |
| Fill, below thresholds        | `bg-accent`         | `--C-ACCENT`         |
| Fill, at/above `warningAt`    | `bg-status-warning` | `--C-STATUS-WARNING` |
| Fill, at/above `criticalAt`   | `bg-status-error`   | `--C-STATUS-ERROR`   |
| Empty segment track           | `bg-surface-2`      | `--C-SURFACE-2`      |
| Segment corners               | `rounded-sm`        | `--RADIUS-SM`        |
| Gap between segments          | `gap-r6`            | `--R-SIZE-6`         |

Segment thickness is `h-r3` and the gap is `gap-r6`, both on the `--R-SIZE-*` scale, but
only the thickness actually scales: `--R-SIZE-3` grows from `1rem` to `1.5rem` above the
40rem breakpoint, so bars get taller with no work from you. The gap (`gap-r6` /
`--R-SIZE-6`) is a constant `0.25rem` at both the base and the ≥40rem breakpoint, so
segments never move further apart. There is no dedicated empty-vs-filled contrast token: the fill (accent or status)
against `bg-surface-2` is the only thing distinguishing painted from unpainted, so a
theme that makes accent or a status colour close to `--C-SURFACE-2` will flatten the
meter.

## Gotchas

- **`style.gridTemplateColumns` is silently ignored.** The component spreads your `style`
  and then overwrites `gridTemplateColumns` from `segments`, so it always wins. Change the
  segment count, not the grid template.
- **The last segment is reserved, which distorts low `segments`.** Because a sub-`max`
  value can't fill the final bar and a supra-`min` value must fill at least one, small
  counts are dominated by the guards: `segments={1}` is effectively binary (empty until
  `value === max`), and `segments={2}` only ever shows 0, 1, or 2. Use enough segments
  (the default is 10) for the fill to be meaningful.
- **`aria-valuenow` is clamped to the range.** `value={150}` on a `0–100` meter announces
  `100`, because the announcement has to sit inside the range it is announced against —
  the fill saturates there too. An out-of-range `value` is therefore silently narrowed
  rather than reported.
- **`max <= min` renders a meter with at most one filled segment.** A zero or negative
  range collapses the fraction to `0` rather than throwing or dividing by zero, but the
  min-guard still fires — any `value > min` paints exactly one segment, and the meter is
  fully empty only when `value <= min`.
- **Status is named to assistive tech, but still only tinted on screen.** Crossing
  `warningAt`/`criticalAt` appends the `statusLabels` word to `aria-label` and flips
  `data-status`, so a screen-reader user hears "Disk usage, Critical" — but the visible
  meter changes hue and nothing else. A sighted colourblind reader is no better off; add
  your own visible cue (or key one off `data-status`) when the distinction is
  load-bearing.
- **No per-component CSS; server-renderable.** There is no `Meter.css` and no
  `"use client"`, so it drops straight into an RSC tree — but the `@batthewz/response-ui-css`
  import is still required for the utilities above to resolve to tokens.

## Accessibility

Renders `role="meter"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
`aria-label` is a **required** prop — the type won't let you render a Meter without a
name, so it can never ship nameless. The individual segment `<span>`s are `aria-hidden`,
so assistive tech announces one measured value rather than ten separate bars.

The warning/critical status reaches assistive tech through the **name**: the
`statusLabels` word for the crossed threshold is appended to `aria-label`, so the meter
announces "Disk usage, Critical" rather than a bare percentage. That closes the
screen-reader half of WCAG 1.4.1 and no more — on screen the status is still a hue
change, so a sighted colourblind reader sees the same meter either way. Pair it with a
visible cue of your own when that matters.

## Related

[ProgressBar](progress-bar.md) · [ProgressRing](./progress-ring.md) · [Sparkline](./sparkline.md) ·
[StatCard](./stat-card.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
