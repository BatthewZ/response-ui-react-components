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

**Anatomy.** Unlike a stateful compound like [Tabs](tabs.md), `StatCard` holds **no shared
state** — the root is a flex column and each sub-part is an independently styled slot.
Compose the parts you want, in whatever order, and drop the rest. Because there is no
context, the sub-parts also render fine outside a `StatCard` root (they are just styled
`span`/`div`/`svg` elements), though the card's padding and gap come from the root.

| Part                | Element  | Props                                                                    |
| ------------------- | -------- | ------------------------------------------------------------------------ |
| `StatCard`          | `div`    | — (plus `div` props)                                                      |
| `StatCard.Value`    | `span`   | `animateValue?` · `from?` · `to?` · `format?` · `duration?`              |
| `StatCard.Label`    | `span`   | — (plus `span` props)                                                     |
| `StatCard.Trend`    | `span`   | `value` · `direction` · `sentiment?` · `format?` · `classNames?` (no `children`) |
| `StatCard.Icon`     | `div`    | — (plus `div` props)                                                      |
| `StatCard.Sparkline`| `svg`    | `direction?` · `sentiment?` · all `Sparkline` props (`values` required)  |

All parts spread the props of the element they render, so `className`, `id`, and
`aria-*` pass through. `classNames` is the exception: it is consumed, never spread —
see [Slots](#slots).

## Slots

`className` addresses the element each part renders. `classNames` addresses the
elements a part renders *inside* itself — class strings only, and the keys are typed,
so a misspelled one is a compile error rather than a prop that does nothing.

| Part               | Slot        | Element                       | What it addresses                                    |
| ------------------ | ----------- | ----------------------------- | ---------------------------------------------------- |
| `StatCard.Trend`   | `trendIcon` | `svg.stat-card__trend-icon`   | the direction arrow, rendered for `up` and `down` only |

```tsx
<StatCard.Trend value={12.5} direction="up" classNames={{ trendIcon: "size-r3" }} />
```

The slot class is merged after the base class, and both survive the merge — `cn()`
resolves conflicts between utilities, not between a utility and a component class. A
utility touching a property `.stat-card__trend-icon` already sets (`width`, `height`)
replaces it rather than stacking with it because the base class lives in
`@layer components` and yours does not.

**Deliberately not slots.** Three internals here carry a class no `className` reaches,
and each is correct as it stands rather than a gap:

- **The count-up's visually-hidden twin** (`StatCard.Value`). Its only class is
  `sr-only`, and that class is the whole mechanism — see [Accessibility](#accessibility).
  A slot would hand a caller the ability to print the figure twice.
- **The sparkline's pinning wrapper** (`.stat-card__sparkline`). `margin-top: auto`
  means something only as a flex child of `.stat-card`; a caller who wants the chart
  somewhere else moves the element rather than the margin.
- **[Sparkline](sparkline.md)'s own paths and bars.** Their ink is a variable, not a
  class — see that page's [Slots](sparkline.md#slots).

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

The animation is **view-triggered and runs once per target** (an `IntersectionObserver`
fires it at 10% visibility; a changed `to` re-arms it — see [Gotchas](#gotchas)). It reads its default duration from `--MOTION-DURATION-SHIFT`
unless you pass `duration` in ms, and is skipped entirely under `prefers-reduced-motion`
— the final value shows immediately. While the count is still running — and before it
starts, which is most of the page's life for a card below the fold — the ticking figure is
`aria-hidden` and a visually-hidden twin carries `format(to)`, so a screen reader gets the
real number rather than the `from` placeholder. See [Gotchas](#gotchas) for the sharp edges
of this prop.

## Trend

`direction` — not the sign of `value` — drives the arrow and the leading sign. `up` is an
up arrow and `+`, `down` is the same arrow rotated 180° and `-`, `neutral` has no arrow and
no sign. `value` is always rendered as its magnitude (`+12.5%`, `-0.8%`, `0%`); pass
`format` to replace that text entirely.

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

## Sentiment

**Colour is a separate axis from direction.** `direction` states which way the number
moved — a fact about the data. `sentiment` states whether that is good news — a judgement
only you can make. `positive` is green, `negative` red, `neutral` grey.

Left off, `sentiment` is implied from `direction` (`up` → `positive`, `down` → `negative`,
`neutral` → `neutral`), so the common "up is good" metric needs nothing extra. Metrics
where the mapping inverts — churn, latency, error rate, cost, refunds — pass both, and the
arrow and the colour stop having to agree.

<!-- example:TrendSentiment -->
```tsx
<StatCard>
  <StatCard.Label>Monthly churn</StatCard.Label>
  <StatCard.Value>2.4%</StatCard.Value>
  <StatCard.Trend value={0.6} direction="down" sentiment="positive" />
  <StatCard.Sparkline
    direction="down"
    sentiment="positive"
    values={[3.4, 3.1, 3.2, 2.9, 2.7, 2.5, 2.4]}
  />
</StatCard>
<StatCard>
  <StatCard.Label>API error rate</StatCard.Label>
  <StatCard.Value>1.8%</StatCard.Value>
  <StatCard.Trend value={0.9} direction="up" sentiment="negative" />
  <StatCard.Sparkline
    direction="up"
    sentiment="negative"
    values={[0.7, 0.8, 0.9, 1.1, 1.4, 1.6, 1.8]}
  />
</StatCard>
```
<!-- /example -->

The two axes are separate CSS classes too: `--up`/`--down`/`--flat` carry direction (only
the arrow reads them; they are otherwise styling hooks for you), and
`--positive`/`--negative`/`--neutral` carry the colour.

## Sparkline

`StatCard.Sparkline` wraps the [Sparkline](sparkline.md) component in a box pinned to the
bottom of the tile — so a row of tiles lines its charts up however tall each one's text
runs — and adds `direction`/`sentiment` props that tint the line to match the trend.

**Its props are `Sparkline`'s**, so `className`, `ref` and everything else address the
`<svg>`, not the pinning box. That is what makes the tint overridable: `className` is
merged *after* the `direction`/`sentiment` class, so
`<StatCard.Sparkline direction="up" className="text-chart-1" />` paints chart-1 rather
than trend-up. The box itself takes no class from the call site.

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
| Card padding + row gap        | `.stat-card`                                          | `--R-SIZE-5`                                                                       |
| Icon chip                     | `.stat-card__icon`                                    | `--C-SURFACE-2` `--C-ACCENT` `--RADIUS-MD` `--R-SIZE-2`                            |
| Value                         | `.stat-card__value`                                   | `--C-TEXT-PRIMARY` `--H3` `--H3-line-height` `--Bold-Weight`                       |
| Label                         | `.stat-card__label`                                   | `--C-TEXT-SECONDARY` `--BodyText-2` `--BodyText-2-line-height` `--Semibold-Weight` |
| Trend text metrics            | `.stat-card__trend`                                   | `--BodyText-2` `--BodyText-2-line-height` `--Semibold-Weight` `--R-SIZE-6`         |
| Trend colour (sentiment)      | `.stat-card__trend--positive` `--negative` `--neutral` | `--C-STATUS-SUCCESS` `--C-STATUS-ERROR` `--C-TEXT-SECONDARY`                      |
| Trend arrow motion            | `.stat-card__trend-icon`                              | `--MOTION-DURATION-SHIFT` `--MOTION-EASE-SHIFT`                                    |
| Sparkline tint (sentiment)    | `text-trend-up` `text-trend-down` `text-fg-muted`     | `--C-TREND-UP` `--C-TREND-DOWN` `--C-TEXT-MUTED`                                   |
| Sparkline box                 | `.stat-card__sparkline`                               | — (pinned with `margin-top: auto`; the chart fills the tile's width)               |

**Trend text and sparkline read different tokens for the same idea.** The trend
arrow/label ink themselves with the **status** tokens (`--C-STATUS-SUCCESS` /
`--C-STATUS-ERROR`), while the sparkline tint uses the **trend** aliases (`--C-TREND-UP`
/ `--C-TREND-DOWN`). By default those aliases point at the status colours, so the two
match — but if you override `--C-TREND-UP` to decouple trend hue from semantic status
(as the [contract](../theme-contract.md#dashboard--trend--chart) invites), the trend
badge will *not* follow; it stays on status. Override both if you want them in step.

## Gotchas

- **The tile is bounded by its border, not its fill.** `.stat-card` sits on `--C-SURFACE-0`,
  the raised-sheet rung — the same one [Card](card.md) and the [AppShell](app-shell.md)
  chrome use — so a tile dropped into a Card is sheet-on-sheet with no fill contrast at all,
  and `--C-BORDER-DEFAULT` is the whole edge. That is deliberate: the rung says the tile is
  raised, not where it stops. Against the page floor it is only a **1.05–1.16:1** lift off
  `--C-CANVAS`. See [Surfaces](../theme-contract.md#surfaces-layered-backgrounds).
- **`animateValue` re-animates when `to` changes.** The count-up latches per *target*, not
  once for the component's life: reaching `to` stops the run, and a new `to` starts another
  one from the figure on screen (not back at `from`) the next time the card is in view. A
  re-render that does not change `to` never re-runs it. Under `prefers-reduced-motion` the
  value tracks `to` directly, with no run.
- **`animateValue` needs `to`.** With `animateValue` set but no `to`, the animation
  silently no-ops and `children` render instead. It is `to`, not `animateValue`, that
  switches the value into number mode.
- **`Trend`'s arrow is not derived from the number, and its colour is not derived from the
  arrow.** `direction` alone picks the arrow and sign, so `value={-5} direction="up"`
  renders **`+5%`** with an up arrow. Colour comes from `sentiment`, which defaults to the
  `direction`-implied one — so a genuinely good drop is `direction="down"
  sentiment="positive"`: down arrow, `-`, green. (Before 0.12.0 there was no `sentiment`
  and colour rode `direction`, so the only way to green a falling metric was to claim it
  rose, which corrupted the arrow and the sign.)
- **`Trend` takes no `children`.** Its text is generated from `value` (and `format`);
  the prop type omits `children`, so you can't inject your own node.
- **[Sparkline](sparkline.md)'s `values` is required.** `StatCard.Sparkline` forwards to [Sparkline](sparkline.md),
  which needs a `number[]`; the wrapper adds only `direction`.
- **Client component.** `StatCard` carries `"use client"` (the value animation uses
  effects and observers), so it can't render in an RSC server tree the way [Button](button.md) can.

## Accessibility

- **The card has no inherent structure.** `StatCard` is a plain `div`; `Value`, [Label](label.md),
  and `Trend` are unlabelled `span`s with no programmatic association between them. A
  screen-reader user hears "Monthly revenue 48,120 +12.5%" as three loose strings. If a
  tile needs to read as a unit, wire it yourself — e.g. an `aria-label` on the root, or
  an `id` on the label referenced by `aria-labelledby`.
- **`animateValue` announces the real figure, not the placeholder.** While the count-up is
  unsettled — which includes the whole time before the card scrolls into view — the value
  element holds two nodes: the ticking figure, marked `aria-hidden`, and a visually-hidden
  twin carrying `format(to)`. So assistive tech reading off-screen content gets the figure,
  never `format(from)`, and it hears it once rather than on every frame. The moment the run
  lands on `to` the twin goes away and the element is a single text node again, so
  `textContent` and `getByText` see exactly what they saw before. The reduced-motion path
  never needed either node: it shows `to` outright.
- **The trend arrow is decorative.** It is `aria-hidden`, and the direction is conveyed
  by the `+`/`-` sign in the text, so meaning survives without the glyph.

## Related

[Sparkline](sparkline.md) · [Table](table.md) · [Timeline](timeline.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
