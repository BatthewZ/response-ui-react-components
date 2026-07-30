# Swimlane

The titled shelf that streaming and storefront homepages are built from — a `<section>`
with an `<h2>`, an optional subtitle and an optional "View all" link, wrapped in a
scroll-triggered reveal so each shelf fades in as the page comes down to it. It gives you
the header and the entrance; the horizontally scrolling row underneath is content you
supply.

<!-- example:Minimal -->
```tsx
<Swimlane title="Continue watching">
  <Row className="overflow-x-auto px-r5 pb-r5">
    <Card className="w-56 shrink-0">The Ascent — 24 min left</Card>
    <Card className="w-56 shrink-0">Blue Planet II — 12 min left</Card>
    <Card className="w-56 shrink-0">Chef's Table — 41 min left</Card>
  </Row>
</Swimlane>
```
<!-- /example -->

| Prop          | Type                                                              | Default     |
| ------------- | ----------------------------------------------------------------- | ----------- |
| `title`       | `ReactNode` — **required**, rendered inside the `titleAs` element  | —           |
| `titleAs`     | `"h1" \| "h2" \| "h3" \| "h4" \| "h5" \| "h6"`                     | `"h2"`      |
| `subtitle`    | `ReactNode` — rendered in a `<p>` under the title                  | —           |
| `viewAllHref` | `string` — renders an `<a href>` labelled by `viewAllLabel`        | —           |
| `viewAllLabel`| `ReactNode` — text of the "View all" link                          | `"View all"`|
| `viewAllProps`| `a` props minus `href`/`children` — merged onto the anchor         | —           |
| `animation`   | `"fade-up" \| "fade-in" \| "fade-left" \| "fade-right" \| "scale"` | `"fade-up"` |
| `once`        | `boolean` — reveal once, or replay on every re-entry               | `true`      |
| `animate`     | `boolean` — wrap in the reveal at all                              | `true`      |
| `className`   | `string` — merged onto the root `<section>`                        | —           |
| `children`    | `ReactNode` — the lane body                                        | —           |
| `ref`         | `Ref<HTMLElement>` — the root `<section>`                          | —           |
| …rest         | `section` props minus `title` — spread onto the root `<section>`   | —           |

`id`, `style`, `role`, `aria-*`, `data-*` and event handlers all reach the `<section>`, on
both the animated and the `animate={false}` path. See [Gotchas](#gotchas) for how `className`,
`style` and `ref` merge with the reveal's own.

## The body is yours

Swimlane styles the header and nothing else. Its body wrapper is `width: 100%` with no
`overflow`, no `scroll-snap-type` and no `tabindex`, so children lay out in ordinary flow
— three `<div>`s stack vertically, they do not become a lane. Whatever scrolls, snaps and
takes keyboard focus has to come from you:

<!-- example:ScrollSnapLane -->
```tsx
<Swimlane title="Because you watched Arrival">
  <div
    tabIndex={0}
    role="group"
    aria-label="Because you watched Arrival"
    className="flex gap-r4 overflow-x-auto snap-x snap-mandatory px-r5 pb-r5"
  >
    <Card className="w-56 shrink-0 snap-start">Interstellar</Card>
    <Card className="w-56 shrink-0 snap-start">Annihilation</Card>
    <Card className="w-56 shrink-0 snap-start">Contact</Card>
  </div>
</Swimlane>
```
<!-- /example -->

Or hand the job to [Carousel](carousel.md), which already owns a snapping, drag-scrollable track with
prev/next buttons and Arrow-key handling on its root:

<!-- example:WithCarousel -->
```tsx
<Swimlane title="Trending now" viewAllHref="/browse/trending">
  <Carousel aria-label="Trending now">
    <Carousel.Track>
      <Carousel.Item>
        <Card>Shōgun</Card>
      </Carousel.Item>
      <Carousel.Item>
        <Card>Ripley</Card>
      </Carousel.Item>
      <Carousel.Item>
        <Card>Fallout</Card>
      </Carousel.Item>
    </Carousel.Track>
  </Carousel>
</Swimlane>
```
<!-- /example -->

Give the [Carousel](carousel.md) an `aria-label` as shown — given no `title` of its own it falls back to
labelling itself with the literal string `"Carousel"`, so a page of shelves would otherwise
carry several identically named ones. (Its inner track is separately a `region` named
`"Carousel items"`; rename that by passing `aria-label` to `Carousel.Track`.)

Note the header is inset by `--R-SIZE-5` on both sides while the body is flush to the
section edge. That is deliberate — it lets a scroller run edge-to-edge and bleed under the
viewport rim — but it means your body content only lines up with the heading if you add the
same inline padding to it. The hand-rolled examples here use `px-r5` for exactly that;
[Carousel](carousel.md) brings its own track padding instead, so it sits on a different inset.

## Header slots

<!-- example:HeaderSlots -->
```tsx
<Swimlane
  title="New releases"
  subtitle="Added in the last seven days"
  viewAllHref="/browse/new-releases"
>
  <Row className="overflow-x-auto px-r5 pb-r5">
    <Card className="w-56 shrink-0">Dune: Part Two</Card>
    <Card className="w-56 shrink-0">Poor Things</Card>
    <Card className="w-56 shrink-0">The Zone of Interest</Card>
  </Row>
</Swimlane>
```
<!-- /example -->

The header is a baseline-aligned flex row: titles on the left, the link pushed to the
right and prevented from wrapping. `subtitle` and `viewAllHref` each render only when
truthy, so a lane with neither is just a heading. Both `title` and `subtitle` are
`ReactNode`, so a [Badge](badge.md) can sit beside the title text — but they land inside an
`<h2>` and a `<p>` respectively, so keep whatever you pass to phrasing content.

## The reveal

With `animate` at its default Swimlane renders a [ScrollReveal](scroll-reveal.md) as its
`<section>` and forwards exactly two of its knobs, `animation` and `once`; `animate={false}`
renders a plain `<section>` instead. The other ScrollReveal options —
`threshold`, `delay`, `rootMargin` — are not on Swimlane's prop type and cannot be reached.

<!-- example:RevealAnimations -->
```tsx
<Swimlane title="Award winners" animation="fade-up">
  <Row className="overflow-x-auto px-r5 pb-r5">
    <Card className="w-56 shrink-0">Oppenheimer</Card>
  </Row>
</Swimlane>
<Swimlane title="Documentaries" animation="fade-right">
  <Row className="overflow-x-auto px-r5 pb-r5">
    <Card className="w-56 shrink-0">Free Solo</Card>
  </Row>
</Swimlane>
<Swimlane title="Short films" animation="scale">
  <Row className="overflow-x-auto px-r5 pb-r5">
    <Card className="w-56 shrink-0">The Silent Child</Card>
  </Row>
</Swimlane>
```
<!-- /example -->

<!-- example:ReplayOnEveryScroll -->
```tsx
<Swimlane title="Keep watching" once={false}>
  <Row className="overflow-x-auto px-r5 pb-r5">
    <Card className="w-56 shrink-0">Slow Horses</Card>
    <Card className="w-56 shrink-0">Severance</Card>
  </Row>
</Swimlane>
```
<!-- /example -->

The reveal covers the **whole** section, header included, so the heading is invisible until
the lane first intersects the viewport — that is true at either setting of `once`, which
only controls whether the element re-hides on the way out. Under
`prefers-reduced-motion: reduce` the effect is skipped entirely and the lane renders
visible and static from the first paint.

## Theme tokens

Swimlane uses **no Tailwind utilities** — every value lives in `Swimlane.css` and reads a
contract variable directly, so overriding one re-tints or re-spaces the header at runtime
with no rebuild.

| Where                                   | Override                                      |
| --------------------------------------- | --------------------------------------------- |
| Space below each lane                   | `--R-SIZE-2`                                  |
| Header inline inset                     | `--R-SIZE-5`                                  |
| Title↔link gap · header-to-body gap     | `--R-SIZE-4`                                  |
| Title↔subtitle gap                      | `--R-SIZE-6`                                  |
| Title ink and weight                    | `--C-TEXT-PRIMARY` · `--Bold-Weight`          |
| Title type scale                        | `--H4` · `--H4-line-height`                   |
| Subtitle ink                            | `--C-TEXT-MUTED`                              |
| Subtitle and link type scale            | `--BodyText-2` · `--BodyText-2-line-height`   |
| "View all" ink, and its hover           | `--C-ACCENT` · `--C-ACCENT-HOVER`             |
| "View all" colour transition            | `--MOTION-DURATION-ENTER` · `--MOTION-EASE-ENTER` |

All four spacing tokens sit on the responsive `r`-scale, and three of them step up at the
40rem breakpoint: the lane's bottom margin (`--R-SIZE-2`, `1.25rem` → `2rem`), the header
gaps (`--R-SIZE-4`, `0.75rem` → `1.25rem`) and the header inset (`--R-SIZE-5`, `0.5rem` →
`0.75rem`). The title/subtitle gap (`--R-SIZE-6`) holds at `0.25rem` on both sides of the
breakpoint. The type steps up too — the title goes `1.25rem` → `1.75rem` and
the subtitle `0.8125rem` → `0.875rem` — so a lane heading is bigger on desktop without a
breakpoint utility from you.

The two motion tokens do double duty: `Swimlane.css` reads them for the "View all" colour
transition, and the shared entrance classes the reveal toggles (`fade-up` and friends,
from `@batthewz/response-ui-css`) are timed from the same pair. They are **shared** enter
tokens, so retiming them retimes every enter animation in the system — there is no
Swimlane-only duration.

The lane **body** reads no tokens at all. It sets no background, no padding and no gap, so
the spacing inside your scroller is entirely yours to pick.

## Gotchas

- **Rest props land on the `<section>`, and `className` merges.** Swimlane spreads its rest
  props onto [ScrollReveal](scroll-reveal.md), which forwards them to the element it renders,
  so `id`, `role`, `style`, `aria-label` and `data-*` all reach the `<section>`. `className`,
  `style` and `ref` are merged with the reveal's own rather than replacing them — see
  [ScrollReveal's gotchas](scroll-reveal.md#gotchas). Swimlane passes no `delay`, so the
  reveal never contributes a `style` property of its own here — your `style` lands as written.
- **It does not scroll.** Nothing in `Swimlane.css` sets `overflow`, `scroll-snap-type` or
  `scroll-behavior` — despite the name and despite a test called "renders a scrollable
  container". Bring your own scroller (see [above](#the-body-is-yours)).
- **Server-rendered output is `opacity: 0` until the bundle executes.** The reveal's initial
  markup carries `scroll-reveal-hidden`. Two of the three ways that used to strand it are now
  covered: a browser with **no `IntersectionObserver`** reveals the lane statically, and with
  **scripting switched off** a `@media (scripting: none)` rule resolves the class to
  `opacity: 1`. What is *not* covered is scripting enabled but your bundle never executing — a
  hydration error, a blocked or failed script — because the browser reports
  `scripting: enabled` either way, and the reveal clears from an effect that never runs. In
  that case the entire lane, heading and subtitle and link included, stays invisible.
  `animate={false}` drops the reveal wrapper entirely and
  renders a plain `<section>` that is readable from the first paint. Only users who have *not* asked for
  reduced motion are affected: under `prefers-reduced-motion: reduce` the same class resolves
  to `opacity: 1`, so those readers see the lane either way. Don't put content behind a
  Swimlane that must always be readable.
- **"View all" is relabellable, but still not a router link.** `viewAllLabel` replaces the
  default English string and `viewAllProps` reaches the anchor — `aria-label`, `target`, `rel`,
  `onClick` and `data-*` all land, and a `className` there merges with `swimlane__view-all`.
  What it is *not* is a router link: it renders a plain `<a href>`, so in an SPA it still
  triggers a full page navigation. For that, drop `viewAllHref` and render your own link in
  `children`.
- **The heading defaults to `<h2>`.** `titleAs` takes any of `h1`–`h6`, so a lane nested under
  an existing `<h2>` can be `titleAs="h3"` rather than skipping a level. `title` accepts a
  `ReactNode`; only the element around it comes from `titleAs`.
- **The bottom margin is unconditional, but a utility clears it.** Every lane, including the
  last on the page, carries `margin-bottom: var(--R-SIZE-2)`; `className="mb-0"` removes it,
  because `.swimlane` is in `@layer components` and Tailwind orders that below
  `@layer utilities`. It used to lose and need the important modifier (`mb-0!`), when this
  package's CSS was unlayered.
- **Always a client boundary.** Swimlane itself has no `"use client"` and can be called from
  a server component, but the reveal it always renders is a client component with an effect
  and an observer — so a Swimlane always ships JS.

## Accessibility

The root is a real `<section>` and the title a real `<h2>`, so the heading lands in the
document outline and shows up in a screen reader's heading list — which is the only
structural navigation Swimlane gives you.

- **Name the section yourself — nothing does it for you.** A `<section>` is only exposed as a
  `region` landmark when it has an accessible name, and Swimlane wires up no `titleId`
  internally, so by default the lane is an unlabelled generic container to assistive tech.
  Pass `aria-label` (or `aria-labelledby`) and it reaches the `<section>`, on both the
  animated and the `animate={false}` path:

  ```tsx
  <Swimlane title="Featured" aria-label="Featured titles">…</Swimlane>
  ```

  Give it the same words as the visible `title` unless you have a reason not to. If your
  `title` already has an `id` in the page, `aria-labelledby` pointing at it avoids stating
  the name twice.
- **Your scroller needs a tabindex and a name.** An overflowing container that a keyboard
  user cannot focus is unreachable once its cards scroll past the edge, and Swimlane adds no
  `tabindex` and no label. Don't count on the browser doing it for you either — engines
  differ, and the case where a scroll container becomes focusable on its own is the one with
  no focusable descendants, which a shelf of links or buttons is not. Add `tabIndex={0}` plus
  a `role` and an `aria-label` yourself, as the snap example does, or use [Carousel](carousel.md), whose
  root is already focusable and Arrow-key-scrollable.
- **Reduced motion is honoured, twice.** The reveal is skipped by the
  `prefers-reduced-motion: reduce` branch in the shared animation CSS *and* by the media-query
  hook behind the reveal component, and `Swimlane.css` separately drops the "View all" colour
  transition under the same query. Nothing in the component animates continuously.
- **"View all" is distinguished by colour alone at rest.** It sets `text-decoration: none`
  and only underlines on `:hover` — not on `:focus-visible` — so a keyboard user gets the
  browser's default outline and no underline. Its ink is `--C-ACCENT` at `--BodyText-2`
  (13–14px, so WCAG's 4.5:1 normal-text threshold applies). Measured against surface-0,
  surface-1 and surface-2 in `@batthewz/response-ui-css` **v0.10.0**, that clears AA in all four
  measured themes: **5.17–4.70:1** default, **4.89–4.53:1** `events`, **5.69–4.90:1** `grimdark`,
  **14.84–13.70:1** `tech`. Two edges are worth knowing rather than discovering: on
  `--C-SURFACE-3` it drops to **4.27–4.12:1** and no longer clears AA, and in `grimdark` the
  `:hover` colour sits at **4.50:1** on surface-0 and **4.21:1** on surface-1, so hovering a
  "View all" inside a `Card` takes it under. The colour-alone point stands on its own —
  underline it if that matters to you, regardless of the ratio.
- **The subtitle now clears AA, with no headroom.** `--C-TEXT-MUTED` measures **4.95–4.50:1**
  against surfaces 0–2 in all four measured themes; each was tuned to land on exactly 4.50
  at surface-2, so there is nothing spare. It still reads as hint-level text visually, so
  prefer not to put load-bearing information in `subtitle` — but it is no longer a
  contrast failure, and the earlier advice to treat it as decorative was written against the
  pre-v0.10.0 palette.

Measured against the default theme and the worked examples; these numbers do not transfer to
your own theme — re-check them against your values.

## Related

[ScrollReveal](scroll-reveal.md) · [Row](row.md) · [Card](card.md) · [Carousel](carousel.md) ·
[MediaCard](media-card.md) · [Hero](hero.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
