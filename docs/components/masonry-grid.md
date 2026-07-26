# MasonryGrid

A Pinterest-style column layout for content of uneven height — notes, photos, dashboard
tiles — built on CSS multi-column rather than JavaScript measurement, so it reflows on
resize with no layout pass of its own. Items fade in as they scroll into view, staggered
by their position in the list.

<!-- example:Minimal -->
```tsx
<MasonryGrid columns={3} gap="1rem">
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
| `gap`       | `string` — any CSS length; written to the element as `--masonry-gap`           | —           |
| `animate`   | `boolean` — wrap every item in a scroll reveal                                 | `true`      |
| `animation` | `"fade-up" \| "fade-in" \| "fade-left" \| "fade-right" \| "scale"`              | `"fade-up"` |
| `className` | `string` — merged onto the root                                                | —           |
| `style`     | `CSSProperties` — spread **before** `gap`, so an explicit `gap` wins           | —           |
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
| `base` | always       | 2 · 3 · 4              |
| `sm`   | `40rem`      | 2 · 3 · 4              |
| `md`   | `48rem`      | 2 · 3 · 4              |
| `lg`   | `64rem`      | 2 · 3 · 4              |
| `xl`   | `80rem`      | 2 · 3 · 4              |

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

**Only 2, 3 and 4 exist.** A count of `1` is skipped on purpose — one column is the CSS
default — and any count above `4` emits a class (`masonry-grid--base-5`) that `MasonryGrid.css`
never defines, so it silently falls back to one column. Both edges are covered under
[Gotchas](#gotchas).

## Gap

`gap` sets the column gutter *and* the space beneath every item, from a single value. Omit it
and both fall back to `--R-SIZE-4`.

<!-- example:CustomGap -->
```tsx
<MasonryGrid columns={2} gap="2rem">
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
anything above the fold, anything that must survive a page with no JavaScript, and anything
whose items need their own attributes:

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

The `role="listitem"` on each item only survives because this grid sets `animate={false}`.
See the first gotcha.

## Theme tokens

MasonryGrid uses **no Tailwind utilities** — the layout lives in `MasonryGrid.css`, which
reads exactly one contract variable.

| Where                                          | Override       |
| ---------------------------------------------- | -------------- |
| Column gutter, and the space under every item   | `--R-SIZE-4`   |

It is on the responsive `r`-scale and steps up at the 40rem breakpoint (`0.75rem` →
`1.25rem`), so the gutter widens on desktop without a breakpoint utility from you. Retint it
and every other `--R-SIZE-4` consumer moves with it; for a grid-only value use the `gap` prop.

Two variables in the CSS are **component-local, not contract tokens**, and are spelled in
lowercase to say so. `--masonry-gap` is what the `gap` prop writes inline. `--masonry-columns`
is what the responsive column classes set; you can also write it yourself through `style` to
reach a count the classes do not ship.

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
  child and only wraps it in a provider — the `break-inside: avoid` and the bottom margin live
  on `.masonry-grid__item`, which only `MasonryGrid.Item` applies. Drop a bare `<Card>` in and
  the browser is free to slice it across a column break.
- **A fragment counts as one child.** `Children.toArray` does not flatten fragments, so two
  items inside a `<>…</>` share a single index and therefore a single stagger step.
  Return an array of items, not a fragment of them.
- **`gap` beats a `--masonry-gap` in `style`.** The variable the `gap` prop derives is spread
  last, so `<MasonryGrid gap="2rem" style={{ "--masonry-gap": "0.25rem" }}>` renders at `2rem`.
  With no `gap` prop, the one in `style` still applies.
- **Every item but the last has a bottom margin.** `.masonry-grid__item:last-child` resets it,
  so there is no trailing gap under the grid — though exactly which item a multicol box treats
  as last is engine-nuanced. Clearing the margin from the call site is still the harder half:
  `.masonry-grid__item` is unlayered component CSS while Tailwind's utilities compile into
  `@layer utilities` (measured in the compiled bundle: the utilities layer ends at byte
  30370, `.masonry-grid__item` sits at 80888), and unlayered author rules outrank layered
  ones before specificity is even consulted — so `className="mb-0"` loses. The important
  modifier (`mb-0!`) wins, because for important declarations the layer order is reversed.
- **Always a client boundary.** `MasonryGrid` carries `"use client"`, so a server component can
  import it but the grid always ships JavaScript.

## Accessibility

The root is a plain `<div>` with no role, no label and no list semantics, and rest props do
reach it — so `role`, `aria-label` and friends are yours to add, as the labelling example does.

- **The default renders the whole grid at `opacity: 0`.** Every animating item ships with
  `scroll-reveal-hidden` and only clears it once an `IntersectionObserver` fires. Server-rendered
  HTML therefore contains an invisible grid, and if the page never hydrates — or the browser has
  no `IntersectionObserver` — it stays invisible with no fallback. Unlike some other revealing
  components, MasonryGrid gives you a real opt-out: `animate={false}` renders plain `<div>`s that
  are visible immediately. Use it for anything that must always be readable.
- **Reduced motion is honoured on both paths.** Under `prefers-reduced-motion: reduce` the
  media-query hook short-circuits the observer *and* the shared CSS resolves `.scroll-reveal-hidden`
  to `opacity: 1`, so those readers see a static, fully visible grid even without JavaScript.
  Nothing in `MasonryGrid.css` animates at all.
- **Roles and labels on an item need `animate={false}`.** This is the passthrough gotcha with
  teeth: `aria-label`, `aria-describedby`, `role` and `tabIndex` on a `MasonryGrid.Item` compile
  and then vanish, so an animating grid cannot be given item-level semantics from the outside.
  Put them on your own element inside the item, or turn animation off.
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
