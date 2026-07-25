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
| `title`       | `ReactNode` — **required**, rendered inside an `<h2>`              | —           |
| `subtitle`    | `ReactNode` — rendered in a `<p>` under the title                  | —           |
| `viewAllHref` | `string` — renders an `<a href>` labelled "View all"               | —           |
| `animation`   | `"fade-up" \| "fade-in" \| "fade-left" \| "fade-right" \| "scale"` | `"fade-up"` |
| `once`        | `boolean` — reveal once, or replay on every re-entry               | `true`      |
| `className`   | `string` — merged onto the root `<section>`                        | —           |
| `children`    | `ReactNode` — the lane body                                        | —           |
| `ref`         | `Ref<HTMLElement>` — the root `<section>`                          | —           |
| …rest         | `section` props minus `title` — **typed but never reach the DOM**  | —           |

That last row is the sharp edge. `title`, `subtitle`, `viewAllHref`, `animation`, `once`,
`className`, `children` and `ref` are the only props that do anything; `id`, `style`,
`role`, `aria-*`, `data-*` and event handlers compile and are then dropped. See
[Gotchas](#gotchas).

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

Swimlane always renders a [ScrollReveal](scroll-reveal.md) as its `<section>` and forwards
exactly two of its knobs, `animation` and `once`. The other ScrollReveal options —
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
- **Server-rendered output is `opacity: 0`.** The reveal's initial markup carries
  `scroll-reveal-hidden`, and it is only cleared once an `IntersectionObserver` fires. If JS
  never runs, or `IntersectionObserver` is undefined, the entire lane — heading, subtitle and
  link included — stays invisible with no fallback. Only users who have *not* asked for
  reduced motion are affected: under `prefers-reduced-motion: reduce` the same class resolves
  to `opacity: 1`, so those readers see the lane either way. Don't put content behind a
  Swimlane that must always be readable.
- **"View all" is a hard-coded English string.** There is no prop to relabel or translate it,
  and the anchor receives only `href` and its class — no `aria-label`, no `target`, no `rel`,
  no router integration. Several lanes on one page therefore expose several links that read
  identically to a screen reader, and each one triggers a full page navigation in an SPA. If
  you need any of that, drop `viewAllHref` and render your own link in `children`.
- **The heading is always an `<h2>`.** No `as` or `level` prop, so a lane nested under an
  existing `<h2>` skips a level in the document outline. `title` accepts a `ReactNode`, but
  the element around it is fixed.
- **The bottom margin is unconditional, and a utility won't clear it.** Every lane, including
  the last on the page, carries `margin-bottom: var(--R-SIZE-2)`. `.swimlane` is unlayered
  component CSS, so it outranks Tailwind's layered utilities no matter the specificity: a
  `className="mb-0"` loses. Use the important modifier (`mb-0!`), your own unlayered rule, or
  retint `--R-SIZE-2`.
- **Always a client boundary.** Swimlane itself has no `"use client"` and can be called from
  a server component, but the reveal it always renders is a client component with an effect
  and an observer — so a Swimlane always ships JS.

## Accessibility

The root is a real `<section>` and the title a real `<h2>`, so the heading lands in the
document outline and shows up in a screen reader's heading list — which is the only
structural navigation Swimlane gives you.

- **The section cannot be named.** A `<section>` is only exposed as a `region` landmark when
  it has an accessible name, and `aria-label` / `aria-labelledby` are among the props that
  never reach the DOM. There is no `titleId` wired up internally either, so the lane is an
  unlabelled generic container to assistive tech no matter what you pass.
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
  surface-1 and surface-2, that lands at **5.17–4.70:1** in the default theme and
  **14.84–13.70:1** in `tech`, but only **2.72–2.52:1** in `events` and **2.96–2.55:1** in
  `grimdark` — below AA, and in `grimdark` hovering makes it *worse* (down to 2.31:1 on
  surface-0). Retint `--C-ACCENT` for those themes, or don't rely on `viewAllHref` there.
- **The subtitle is hint-level contrast.** `--C-TEXT-MUTED` measures at most **2.59:1**
  against any of the surface tokens in any shipped theme, and as little as 1.94:1 in `tech` —
  nowhere near the 4.5:1 its `--BodyText-2` size demands. Treat `subtitle` as decorative and
  never put information a reader needs there.

## Related

[ScrollReveal](scroll-reveal.md) · [Row](row.md) · [Card](card.md) · [Carousel](carousel.md) ·
[MediaCard](media-card.md) · [Hero](hero.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
