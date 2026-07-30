# MasonryGrid

A Pinterest-style column layout for content of uneven height — notes, photos, dashboard
tiles — built on CSS multi-column rather than JavaScript measurement, so it reflows on
resize with no layout pass of its own. Items fade in as they scroll into view, staggered
by their position in the list.

<!-- example:Minimal -->
```tsx
<MasonryGrid columns={3} gap="r4">
  <MasonryGrid.Item>
    <Card>Ship the OKLCH ramp</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>
      Design review — the dark end of the surface ramp collapses at surface-2, so the
      card edge disappears against the page. Add one more step.
    </Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Rewrite the onboarding copy</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>
      Retro actions: cut the Friday deploy freeze, move the contrast audit into CI.
    </Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Audit focus rings</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Bump the CSS package to 0.9.0 before the release branch cuts.</Card>
  </MasonryGrid.Item>
</MasonryGrid>
```
<!-- /example -->

**Anatomy.** `MasonryGrid` is the `<div>` that carries the column count and the gutter.
Every child gets wrapped in a context provider that hands it two things — the grid's
`animate`/`animation` setting, and its **index**, which becomes a `50ms` per-item entrance
offset. `MasonryGrid.Item` reads that context and renders the `break-inside: avoid` box that
keeps one card from being sliced in half at a column boundary; when animation is on it
renders through [ScrollReveal](scroll-reveal.md) instead of a bare `<div>`.

| Part               | Renders                                                       | Props                                                                   |
| ------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `MasonryGrid`      | `<div class="masonry-grid">`                                   | `columns?` · `gap?` · `animate?` · `animation?` (+ all `div` props)      |
| `MasonryGrid.Item` | `<div class="masonry-grid__item">`, via a scroll reveal when animating | all `div` props — but see the passthrough gotcha                 |

## Root props

| Prop        | Type                                                                          | Default     |
| ----------- | ----------------------------------------------------------------------------- | ----------- |
| `columns`   | `1 \| 2 \| 3 \| 4`, or `{ base?, sm?, md?, lg?, xl? }` of the same          | `1`     |
| `gap`       | `"r1"…"r6"` — the responsive spacing scale, same as `Grid`/`Row`/`Stack`      | `"r4"`      |
| `animate`   | `boolean` — wrap every item in a scroll reveal                                 | `true`      |
| `animation` | `"fade-up" \| "fade-in" \| "fade-left" \| "fade-right" \| "scale"`              | `"fade-up"` |
| `className` | `string` — merged onto the root                                                | —           |
| `style`     | `CSSProperties` — passed through untouched                                     | —           |
| `ref`       | `Ref<HTMLDivElement>`                                                          | —           |
| …rest       | `div` props — `id`, `role`, `aria-*`, `data-*`, handlers, all reach the DOM     | —           |

A bare `number` is shorthand for `{ base: n }`. There is no prop for the reveal's
`threshold`, `delay`, `rootMargin` or `once` — items always reveal once, at 10% visibility,
against the unpadded viewport.

## Columns and breakpoints

`columns` is mobile-first: each key sets the count from its own min-width upward, and later
breakpoints override earlier ones. Every emitted class has the same specificity, so it is the
order of the rules inside `MasonryGrid.css` that decides — which means the order you write the
keys in makes no difference.

| Key    | Applies from | Counts with a CSS rule |
| ------ | ------------ | ---------------------- |
| `base` | always       | 1 · 2 · 3 · 4          |
| `sm`   | `40rem`      | 1 · 2 · 3 · 4          |
| `md`   | `48rem`      | 1 · 2 · 3 · 4          |
| `lg`   | `64rem`      | 1 · 2 · 3 · 4          |
| `xl`   | `80rem`      | 1 · 2 · 3 · 4          |

<!-- example:ResponsiveColumns -->
```tsx
<MasonryGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }}>
  <MasonryGrid.Item>
    <Card>Q3 roadmap</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>
      Changelog — 0.8.3 fixes the Radio focus indicator and adds the theme-contract
      guard to CI.
    </Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Support inbox digest</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Uptime is 99.98% for the month, with one 4-minute incident on the 12th.</Card>
  </MasonryGrid.Item>
</MasonryGrid>
```
<!-- /example -->

**Every count from `1` to `4` has a real rule at every breakpoint**, so a key can narrow the
grid back to a single column as well as widen it. Counts above `4` are a compile error — the
prop is typed `1 | 2 | 3 | 4` — not a silent one-column fallback. Both edges are covered under
[Gotchas](#gotchas).

## Gap

`gap` sets the column gutter *and* the space beneath every item, from a single value. Omit it
and both fall back to `--R-SIZE-4`.

<!-- example:CustomGap -->
```tsx
<MasonryGrid columns={2} gap="r6">
  <MasonryGrid.Item>
    <Card>Weekly metrics</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Signups are up 12% week over week, driven mostly by the docs launch.</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Churn held flat</Card>
  </MasonryGrid.Item>
</MasonryGrid>
```
<!-- /example -->

## The entrance

With `animate` left at its default, each `MasonryGrid.Item` renders as a
[ScrollReveal](scroll-reveal.md) with `delay={index * 50}` — so the sixth item waits 250ms
after it enters the viewport, and the twenty-first waits a full second. The offset is per
item, measured from when *that* item intersects, not from a shared start.

<!-- example:ScaleEntrance -->
```tsx
<MasonryGrid columns={3} animation="scale">
  <MasonryGrid.Item>
    <Card>Ada Lovelace</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Grace Hopper</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Katherine Johnson</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Radia Perlman</Card>
  </MasonryGrid.Item>
</MasonryGrid>
```
<!-- /example -->

Because the visual flow of a multi-column box runs **down** each column before moving across,
the cascade reads as a column-by-column wave rather than a left-to-right one.

Set `animate={false}` for a grid that is present from the first paint — the right choice for
anything above the fold and anything that must stay readable when the bundle never runs.
Item attributes like `id` and `data-*` land on either path:

<!-- example:NoAnimation -->
```tsx
<MasonryGrid columns={3} animate={false}>
  <MasonryGrid.Item id="note-release" data-status="blocked">
    <Card>
      <Badge variant="error">Blocked</Badge> Release checklist
    </Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Migrate the token tables to the generated table script.</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item>
    <Card>Draft the 0.9.0 announcement</Card>
  </MasonryGrid.Item>
</MasonryGrid>
```
<!-- /example -->

## Labelling the grid

The root is an ordinary `<div>` with rest props spread onto it, so everything you put on it
lands:

<!-- example:LabelledRegion -->
```tsx
<MasonryGrid
  columns={{ base: 1, md: 2 }}
  animate={false}
  id="pinboard"
  role="list"
  aria-label="Pinned notes"
>
  <MasonryGrid.Item role="listitem">
    <Card>Contrast audit — 4 of 6 themes fail AA on muted text.</Card>
  </MasonryGrid.Item>
  <MasonryGrid.Item role="listitem">
    <Card>Ship the renderer draft</Card>
  </MasonryGrid.Item>
</MasonryGrid>
```
<!-- /example -->

The `role="listitem"` on each item lands too, on either path — with `animate` on, the item's
rest props are spread onto the reveal's rendered element. See the first gotcha for how
`className`, `style` and `ref` merge there.

## Theme tokens

The column count lives in `MasonryGrid.css`; the spacing is Tailwind utilities driven by the
`gap` prop.

| Where                                        | Override                       |
| -------------------------------------------- | ------------------------------ |
| Column gutter (root)                          | `gap-r4` → `--R-SIZE-4`        |
| Space under every item                        | `mb-r4` → `--R-SIZE-4`         |

Both default to `r4` and move together with the `gap` prop. `--R-SIZE-4` is on the responsive
`r`-scale and steps up at the 40rem breakpoint (`0.75rem` → `1.25rem`), so the gutter widens on
desktop without a breakpoint utility from you. Retint it and every other `--R-SIZE-4` consumer
moves with it; for a grid-only value pass `gap`, or override a single half from the call site.

One variable in the CSS is **component-local, not a contract token**, and is spelled in
lowercase to say so: `--masonry-columns`, which the responsive column classes set. You can also
write it yourself through `style` to reach a count the classes do not ship.

The gap is **not** a variable. `gap` resolves to a `gap-r*` utility on the root and an `mb-r*`
utility on each item, because CSS multi-column has no row-gap and the block-direction half has
to be a margin on the child. Both are ordinary utilities, so either half can be overridden from
the call site — `className="gap-r1"` on the root, `className="mb-r1"` on an item — which a
single custom property could not offer.

MasonryGrid sets no colour, no background and no radius at all — an item is transparent, and
whatever you put inside it brings its own surface. The entrance timing is not MasonryGrid's
either: it comes from the shared `fade-up` / `fade-in` / `fade-left` / `fade-right` /
`scale-in` classes in `@batthewz/response-ui-css`, which read `--MOTION-DURATION-ENTER` and
`--MOTION-EASE-ENTER`. Those are **shared** enter tokens, so retiming them retimes every
entrance in the system; the only MasonryGrid-specific knob is the fixed 50ms-per-index offset,
which is applied inline and is not themeable.

## Gotchas

- **An item's props land on both paths.** `MasonryGrid.Item` types itself as a `<div>` and
  spreads its rest props onto [ScrollReveal](scroll-reveal.md) when animating, or onto a plain
  `<div>` under `animate={false}`. Either way `id`, `role`, `aria-*`, `data-*` and handlers
  reach the element. On the animating path `className`, `style` and `ref` are merged with the
  reveal's own instead of replacing them, and each item's stagger `delay` is derived from its
  index (`index * 50`ms) — so the **first** item has no delay of its own and an
  `animationDelay` in your `style` lands unopposed, while a later item's own delay wins for
  as long as it is animating. See
  [ScrollReveal's gotchas](scroll-reveal.md#gotchas).
- **`columns` stops at 4, and the type says so.** `MasonryGrid.css` defines rules for `1`–`4`
  at each breakpoint and the prop is typed to match, so `columns={6}` is a compile error rather
  than a grid that silently shows one column. For a wider grid, set the local variable
  directly: `style={{ "--masonry-columns": 6 } as CSSProperties}`. Note that [Grid](grid.md)
  takes a same-shaped `columns` prop but ships rules for `1`–`6`, so the two components accept
  overlapping objects and disagree above 4.
- **Narrowing back to one column works.** `columns={{ base: 3, md: 1 }}` emits
  `masonry-grid--base-3 masonry-grid--md-1` and drops to a single column from `48rem` up.
- **Your `key`s on the children are honoured.** The root wraps each child in a provider keyed
  by the child's own key, so prepending to a grid mounts only the new item and leaves the rest
  — uncontrolled input values, video playback, component state — intact.
- **A child that is not a `MasonryGrid.Item` gets no masonry behaviour.** The root accepts any
  child and only wraps it in a provider — `break-inside: avoid` and the bottom margin are applied
  by `MasonryGrid.Item` and nothing else. Drop a bare `<Card>` in and the browser is free to slice
  it across a column break, and it will carry no gap either.
- **A fragment counts as one child.** `Children.toArray` does not flatten fragments, so two
  items inside a `<>…</>` share a single index and therefore a single stagger step.
  Return an array of items, not a fragment of them.
- **`gap` drives two properties on two elements.** The root gets `gap-r*` (which multi-column
  reads as `column-gap`) and every item gets `mb-r*`. Override one and the other keeps the prop's
  value, so a lopsided gutter is reachable — that is the price of multi-column having no row-gap.
- **Every item but the last has a bottom margin.** Each item carries `mb-r*` plus `last:mb-0`, so
  there is no trailing gap under the grid — though exactly which item a multicol box treats as
  last is engine-nuanced. Both are ordinary utilities in `@layer utilities`, and `last:mb-0` is
  `(0,1,1)` against the margin's `(0,1,0)`, so the reset wins on specificity. Clearing the margin
  from the call site works normally: `className="mb-0"` on an item replaces `mb-r*` outright,
  because `cn()` dedupes them as one class group. No `!` needed.
- **Always a client boundary.** `MasonryGrid` carries `"use client"`, so a server component can
  import it but the grid always ships JavaScript.

## Accessibility

The root is a plain `<div>` with no role, no label and no list semantics, and rest props do
reach it — so `role`, `aria-label` and friends are yours to add, as the labelling example does.

- **The default renders the whole grid at `opacity: 0` until the bundle executes.** Every
  animating item ships with `scroll-reveal-hidden`, cleared from an effect. A browser with **no
  `IntersectionObserver`** now reveals the grid statically, and with **scripting switched off** a
  `@media (scripting: none)` rule resolves the class to `opacity: 1`. The case still uncovered is
  scripting enabled but the bundle never executing — a hydration error, a blocked script — where
  the effect never runs and the grid stays invisible; the browser reports `scripting: enabled`
  there, so no media query can catch it. MasonryGrid gives you a real opt-out: `animate={false}`
  renders plain `<div>`s that are visible immediately. Use it for anything that must always be
  readable.
- **Reduced motion is honoured on both paths.** Under `prefers-reduced-motion: reduce` the
  media-query hook short-circuits the observer *and* the shared CSS resolves `.scroll-reveal-hidden`
  to `opacity: 1`, so those readers see a static, fully visible grid even without JavaScript.
  Nothing in `MasonryGrid.css` animates at all.
- **Roles and labels on an item reach the DOM on both paths.** `aria-label`,
  `aria-describedby`, `role` and `tabIndex` on a `MasonryGrid.Item` land on the rendered
  element whether the grid animates or not — [ScrollReveal](scroll-reveal.md) spreads its rest
  props onto the element it renders. Item-level semantics do not require `animate={false}`.
- **Visual order follows DOM order.** A multi-column box fills down one column before starting
  the next, so the reading order a screen reader and the Tab key follow is the same order the
  eye follows. That is *not* left-to-right across a row — if your content is ranked ("newest
  first"), readers will find item 2 below item 1, not beside it. Reach for
  [Grid](grid.md) when row-major order is what you mean.
- **The 50ms stagger is not capped.** In a long grid the offset keeps growing with the index, so
  the last item of a fifty-item feed waits 2.45 seconds after entering the viewport before it
  appears. Readers who have not requested reduced motion still get that delay; `animate={false}`
  is the only way to remove it.

## Related

[Grid](grid.md) · [Row](row.md) · [Stack](stack.md) · [Card](card.md) ·
[MediaCard](media-card.md) · [ScrollReveal](scroll-reveal.md) · [Swimlane](swimlane.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
