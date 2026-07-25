# StatCard

A dashboard metric tile: a big number with a label, an optional trend badge, an icon
chip, and an inline sparkline. Every part is theme-tinted and the value can count up
when it scrolls into view.

<!-- example:Minimal -->
```tsx
<StatCard>
  <StatCard.Label>Monthly revenue</StatCard.Label>
  <StatCard.Value>$48,120</StatCard.Value>
  <StatCard.Trend value={12.5} direction="up" />
</StatCard>
```
<!-- /example -->

**Anatomy.** Unlike a stateful compound like [[Tabs](tabs.md)](./tabs.md), `StatCard` holds **no shared
state** — the root is a flex column and each sub-part is an independently styled slot.
Compose the parts you want, in whatever order, and drop the rest. Because there is no
context, the sub-parts also render fine outside a `StatCard` root (they are just styled
`span`/`div`/`svg` elements), though the card's padding and gap come from the root.

| Part                | Element  | Props                                                                    |
| ------------------- | -------- | ------------------------------------------------------------------------ |
| `StatCard`          | `div`    | — (plus `div` props)                                                      |
| `StatCard.Value`    | `span`   | `animateValue?` · `from?` · `to?` · `format?` · `duration?`              |
| `StatCard.Label`    | `span`   | — (plus `span` props)                                                     |
| `StatCard.Trend`    | `span`   | `value` · `direction` · `format?` (no `children`)                        |
| `StatCard.Icon`     | `div`    | — (plus `div` props)                                                      |
| `StatCard.Sparkline`| `svg`    | `direction?` · all `Sparkline` props (`values` required)                 |

All parts spread the props of the element they render, so `className`, `id`, and
`aria-*` pass through.

## Full anatomy

<!-- example:Anatomy -->
```tsx
<StatCard>
  <StatCard.Icon>
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  </StatCard.Icon>
  <StatCard.Label>Monthly revenue</StatCard.Label>
  <StatCard.Value>$48,120</StatCard.Value>
  <StatCard.Trend value={12.5} direction="up" />
  <StatCard.Sparkline direction="up" values={[31, 34, 33, 38, 40, 44, 48]} />
</StatCard>
```
<!-- /example -->

The icon inks itself with `currentColor`, which the `Icon` slot sets to `--C-ACCENT` —
give it any `stroke="currentColor"` glyph and it picks up the accent automatically.

## Counting up

`StatCard.Value` can animate from `from` (default `0`) to `to` when it first scrolls
into view, easing with a cubic ease-out. Pass `format` to control the display — here the
raw number is rendered as currency.

<!-- example:CountUp -->
```tsx
<StatCard>
  <StatCard.Label>Monthly revenue</StatCard.Label>
  <StatCard.Value animateValue to={48120} format={usd.format} />
</StatCard>
```
<!-- /example -->

The animation is **one-shot and view-triggered** (an `IntersectionObserver` fires it
once at 10% visibility). It reads its default duration from `--MOTION-DURATION-SHIFT`
unless you pass `duration` in ms, and is skipped entirely under `prefers-reduced-motion`
— the final value shows immediately. See [Gotchas](#gotchas) for the sharp edges of this
prop.

## Trend

`direction` — not the sign of `value` — drives the arrow, the leading sign, and the
colour. `up` is green with an up arrow, `down` is red with the same arrow rotated 180°,
`neutral` is grey with no arrow. `value` is always rendered as its magnitude (`+12.5%`,
`-0.8%`, `0%`); pass `format` to replace that text entirely.

<!-- example:TrendDirections -->
```tsx
<StatCard>
  <StatCard.Label>New signups</StatCard.Label>
  <StatCard.Value>1,204</StatCard.Value>
  <StatCard.Trend value={12.5} direction="up" />
</StatCard>
<StatCard>
  <StatCard.Label>Refund rate</StatCard.Label>
  <StatCard.Value>3.2%</StatCard.Value>
  <StatCard.Trend value={0.8} direction="down" />
</StatCard>
<StatCard>
  <StatCard.Label>Open rate</StatCard.Label>
  <StatCard.Value>41%</StatCard.Value>
  <StatCard.Trend value={0} direction="neutral" />
</StatCard>
```
<!-- /example -->

## Sparkline

`StatCard.Sparkline` wraps the [Sparkline](sparkline.md) component in a height-capped slot and adds a
`direction` prop that tints the line to match the trend.

<!-- example:SparklineTint -->
```tsx
<StatCard>
  <StatCard.Label>Weekly active users</StatCard.Label>
  <StatCard.Value>12,940</StatCard.Value>
  <StatCard.Sparkline direction="up" values={[8, 9, 7, 11, 10, 13, 14]} />
</StatCard>
```
<!-- /example -->

## Theme tokens

StatCard hard-codes no colour, radius, spacing, or timing. The value, label, trend, and
card chrome read contract variables directly in `StatCard.css`; the sparkline tint is
the one place utilities are used, on the [Sparkline](sparkline.md) it wraps.

| Where                         | Utility / class                                       | Override                                                                          |
| ----------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| Card fill, border, corners    | `.stat-card`                                          | `--C-SURFACE-0` `--C-BORDER-DEFAULT` `--RADIUS-LG`                                 |
| Card padding + row gap        | `.stat-card`                                          | `--R-SIZE-5` `--R-SIZE-2`                                                          |
| Icon chip                     | `.stat-card__icon`                                    | `--C-SURFACE-1` `--C-ACCENT` `--RADIUS-MD` `--R-SIZE-2`                            |
| Value                         | `.stat-card__value`                                   | `--C-TEXT-PRIMARY` `--H3` `--H3-line-height` `--Bold-Weight`                       |
| Label                         | `.stat-card__label`                                   | `--C-TEXT-SECONDARY` `--BodyText-2` `--BodyText-2-line-height` `--Semibold-Weight` |
| Trend up / down / neutral     | `.stat-card__trend`                                   | `--C-STATUS-SUCCESS` `--C-STATUS-ERROR` `--C-TEXT-SECONDARY` `--BodyText-2` `--BodyText-2-line-height` `--Semibold-Weight` `--R-SIZE-6` |
| Trend arrow motion            | `.stat-card__trend-icon`                              | `--MOTION-DURATION-SHIFT` `--MOTION-EASE-SHIFT`                                    |
| Sparkline tint (up/down/flat) | `text-trend-up` `text-trend-down` `text-fg-muted`     | `--C-TREND-UP` `--C-TREND-DOWN` `--C-TEXT-MUTED`                                   |
| Sparkline slot                | `.stat-card__sparkline`                               | `--R-SIZE-2` `--R-SIZE-4`                                                          |

**Trend text and sparkline read different tokens for the same idea.** The trend
arrow/label ink themselves with the **status** tokens (`--C-STATUS-SUCCESS` /
`--C-STATUS-ERROR`), while the sparkline tint uses the **trend** aliases (`--C-TREND-UP`
/ `--C-TREND-DOWN`). By default those aliases point at the status colours, so the two
match — but if you override `--C-TREND-UP` to decouple trend hue from semantic status
(as the [contract](../theme-contract.md#dashboard--trend--chart) invites), the trend
badge will *not* follow; it stays on status. Override both if you want them in step.

## Gotchas

- **`animateValue` freezes after the first run.** The count-up fires once via an
  `IntersectionObserver` and latches (`hasAnimated`). Changing `to` afterwards does
  **not** re-animate or even update the displayed number — it stays stuck on the first
  value it reached. For live-updating metrics, don't use `animateValue`; render the
  number as `children` and update that. (Under `prefers-reduced-motion` the value *does*
  track `to`, since that path is computed in render — an inconsistency, not a fix.)
- **`animateValue` needs `to`.** With `animateValue` set but no `to`, the animation
  silently no-ops and `children` render instead. It is `to`, not `animateValue`, that
  switches the value into number mode.
- **`Trend`'s colour is not derived from the number.** `direction` alone picks the
  arrow, sign, and colour, so `value={-5} direction="up"` renders a green **`+5%`**, and
  a genuinely good drop (churn falling, `direction="down"`) still shows red. Map your
  metric's "good/bad" to `direction` yourself.
- **`Trend` takes no `children`.** Its text is generated from `value` (and `format`);
  the prop type omits `children`, so you can't inject your own node.
- **[Sparkline](sparkline.md)'s `values` is required.** `StatCard.Sparkline` forwards to [Sparkline](sparkline.md),
  which needs a `number[]`; the wrapper adds only `direction`.
- **Client component.** `StatCard` carries `"use client"` (the value animation uses
  effects and observers), so it can't render in an RSC server tree the way [[Button](button.md)](./button.md) can.

## Accessibility

- **The card has no inherent structure.** `StatCard` is a plain `div`; `Value`, [Label](label.md),
  and `Trend` are unlabelled `span`s with no programmatic association between them. A
  screen-reader user hears "Monthly revenue 48,120 +12.5%" as three loose strings. If a
  tile needs to read as a unit, wire it yourself — e.g. an `aria-label` on the root, or
  an `id` on the label referenced by `aria-labelledby`.
- **`animateValue` announces `0` until it runs.** Before the card scrolls into view the
  value renders as `format(from)` — usually `0` — so assistive tech reading off-screen
  or above-the-fold content gets the placeholder, not the real figure. The reduced-motion
  path avoids this (it shows `to` outright); the animated path does not.
- **The trend arrow is decorative.** It is `aria-hidden`, and the direction is conveyed
  by the `+`/`-` sign in the text, so meaning survives without the glyph.

## Related

[Sparkline](sparkline.md) · [Table](table.md) · [Timeline](timeline.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
