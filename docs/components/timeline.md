# Timeline

A vertical chronology — order status, a release history, a project's milestones — drawn as
a connecting rail with one dot and one card per event. Below `40rem` the cards stack in a
single column beside a left-hand rail; at `40rem` and up the rail moves to the centre and
the cards alternate left and right of it, each sliding in from its own side as it scrolls
into view.

<!-- example:Minimal -->
```tsx
<Timeline>
  <Timeline.Item date="12 March" title="Order placed">
    Three items, paid with the card ending 4242.
  </Timeline.Item>
  <Timeline.Item date="13 March" title="Left the warehouse">
    Handed to the courier in Rotterdam.
  </Timeline.Item>
  <Timeline.Item date="15 March" title="Delivered">
    Signed for by Ada Lovelace.
  </Timeline.Item>
</Timeline>
```
<!-- /example -->

**Anatomy.** `Timeline` is the `<div class="timeline">`, and each `.timeline-item` draws its
own segment of the rail as a `::before` — suppressed on the last one, so the line ends where
the final dot begins however tall that card is. The root wraps its children in a single
context provider carrying one value, the root's `animate` setting; `Timeline.Item` reads it
to decide whether it renders through a [ScrollReveal](scroll-reveal.md) or a plain `<div>`.
Every item then renders the same two boxes — a `timeline-node` holding the dot or your
`icon`, absolutely positioned onto the rail, and a `timeline-card` holding the optional date,
the title and the optional body.

The provider emits no element, so `.timeline-item` stays a **direct child** of `.timeline` —
which matters, because everything positional is pure CSS `:nth-child(odd)`/`:nth-child(even)`
and nothing else. **Both** the side a card lands on and the direction it enters from come off
that one selector: at `40rem` and up an odd item's card sits left and enters from the left, an
even item's sits right and enters from the right. Below `40rem` every card is on the left, so
every entrance is uniform. Nothing is counted in React, which is why a fragment, a `.map` or a
component rendering two items can no longer split the two apart.

| Part            | Renders                                                              | Props                                                            |
| --------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Timeline`      | `<div class="timeline">`                                              | `animate?` (+ all `div` props, all of which reach the DOM)        |
| `Timeline.Item` | `<div class="timeline-item">`, through a scroll reveal when animating | `title` · `date?` · `icon?` · `children?` — and see the passthrough gotcha |

## Root props

| Prop        | Type                                                                       | Default |
| ----------- | -------------------------------------------------------------------------- | ------- |
| `animate`   | `boolean` — render every item through a scroll reveal                       | `true`  |
| `className` | `string` — merged after `timeline`                                          | —       |
| `ref`       | `Ref<HTMLDivElement>`                                                       | —       |
| …rest       | `div` props — `id`, `role`, `aria-*`, `data-*`, `style`, handlers, all land  | —       |

## Item props

| Prop        | Type                                                                | Default |
| ----------- | ------------------------------------------------------------------- | ------- |
| `title`     | `ReactNode` — **required**, rendered inside the `titleAs` element     | —       |
| `titleAs`   | `"h1" … "h6"` — the element `title` renders in                        | `"h3"`  |
| `date`      | `string` — a `<span>` above the title, omitted entirely when falsy     | —       |
| `icon`      | `ReactNode` — replaces the default dot inside the node                | —       |
| `children`  | `ReactNode` — the body block under the title; omitted when falsy      | —       |
| `className` | `string` — merged after `timeline-item`; survives on **both** paths   | —       |
| `ref`       | `Ref<HTMLDivElement>` — reaches the rendered element on both paths    | —       |
| …rest       | `div` props **minus `title`** — reach the DOM on both paths            | —       |

`title` is `ReactNode`, and the item's div props are `Omit<…, "title">` — so the prop always
means the heading content and the native `title` tooltip attribute is unavailable. `titleAs`
picks the heading level; the `"h3"` default is only correct under an `<h2>`, so set it to
match the page (see [Accessibility](#accessibility)). There is no prop for the reveal's `threshold`, `delay`,
`once` or `rootMargin`: every item reveals once, at 10% visibility, with no stagger between
them, so a screenful of events animates together rather than in sequence.

## Icons on the rail

`icon` replaces the dot inside the node, at any size: the node is centred on the rail with a
`translateX(-50%)` at every width, so a 32px glyph and the 14px default dot both land on the
line. (Until 0.10.1 the mobile offset subtracted half of `--_timeline-dot-size`, which centred
the *default* dot and nothing else — measured in Firefox at 375px, a 32px icon sat 9px to the
right of the rail, exactly half the difference.)

<!-- example:CustomIcons -->
```tsx
<Timeline>
  <Timeline.Item icon={<Package size={14} aria-hidden />} date="12 March" title="Order placed">
    Three items, paid with the card ending 4242.
  </Timeline.Item>
  <Timeline.Item icon={<Truck size={14} aria-hidden />} date="13 March" title="Out for delivery">
    Handed to the courier in Rotterdam.
  </Timeline.Item>
  <Timeline.Item icon={<CheckCircle2 size={14} aria-hidden />} date="15 March" title="Delivered">
    Signed for by Ada Lovelace.
  </Timeline.Item>
</Timeline>
```
<!-- /example -->

## Leaner entries

`date` and `children` are both optional and both render nothing when absent, so an entry
can be a single line:

<!-- example:TitlesOnly -->
```tsx
<Timeline>
  <Timeline.Item title="Repository created" />
  <Timeline.Item title="First release tagged" />
  <Timeline.Item title="Published to npm" />
</Timeline>
```
<!-- /example -->

## Turning the entrance off

With `animate` at its default every item renders as a [ScrollReveal](scroll-reveal.md) and
therefore starts at `opacity: 0`. `animate={false}` renders plain `<div>`s that are painted
immediately — the right choice above the fold and for anything that must stay readable when
the bundle never runs. Item attributes like `id` and `data-*` land on either path:

<!-- example:NoAnimation -->
```tsx
<Timeline animate={false}>
  <Timeline.Item id="release-0-8-3" data-status="shipped" date="0.8.3" title="Radio focus ring">
    The keyboard focus indicator now changes by more than zero pixels.
  </Timeline.Item>
  <Timeline.Item id="release-0-9-0" data-status="draft" date="0.9.0" title="Contrast guard">
    A ratio check over every theme file runs in CI.
  </Timeline.Item>
</Timeline>
```
<!-- /example -->

## Giving the timeline list semantics

The root is a bare `<div>` with no role, and its rest props are spread straight onto it, so
`role`, `aria-label` and friends land there whatever `animate` is set to. The same is true
of the items — `role="listitem"` survives the animating path too:

<!-- example:SemanticList -->
```tsx
<Timeline animate={false} role="list" aria-label="Order history">
  <Timeline.Item role="listitem" date="12 March" title="Order placed" />
  <Timeline.Item role="listitem" date="13 March" title="Left the warehouse" />
  <Timeline.Item role="listitem" date="15 March" title="Delivered" />
</Timeline>
```
<!-- /example -->

## Theme tokens

Timeline uses **no Tailwind utilities** — every rule lives in `Timeline.css` and reads the
contract variables directly, the way Tabs and ActivityFeed do.

| Where                                       | Override                                     |
| ------------------------------------------- | -------------------------------------------- |
| Rail (per item, `::before`), and the card's 1px border | `--C-BORDER-DEFAULT`              |
| Default dot fill                            | `--C-ACCENT`                                 |
| Dot corners                                 | `--RADIUS-FULL`                              |
| Card surface                                | `--C-SURFACE-1`                              |
| Card corners                                | `--RADIUS-LG`                                |
| Card padding                                | `--R-SIZE-4`                                 |
| Mobile gutter · desktop card inset · space under the title | `--R-SIZE-2`                  |
| Rail offset from the left edge (mobile)     | `--R-SIZE-5`                                 |
| Space between two events                    | `--R-SIZE-3`                                 |
| Space under the date                        | `--R-SIZE-6`                                 |
| Date ink                                    | `--C-TEXT-MUTED`                             |
| Date type                                   | `--BodyText-3` · `--BodyText-3-line-height`  |
| Title ink · weight                          | `--C-TEXT-PRIMARY` · `--Bold-Weight`         |
| Body ink                                    | `--C-TEXT-SECONDARY`                         |
| Title and body type                         | `--BodyText-2` · `--BodyText-2-line-height`  |

Five values are **component-local, not contract tokens**, and are spelled with a leading
underscore to say so: `--_timeline-gutter` and `--_timeline-line-offset` alias the two
`--R-SIZE-*` steps above, `--_timeline-dot-size` (`0.875rem`) and `--_timeline-line-width`
(`2px`) are literals, and `--_timeline-rail-x` is derived
(`line-offset - gutter`) — the rail's x-position *inside an item*, which the segment and the
node both read so they cannot drift apart. All five are declared on `.timeline`. The node is
then centred with `translateX(-50%)` rather than by subtracting half a dot, so the dot's
centre lands on the rail's centre whatever size the `icon` is. Because they are declared on
the root element you can still reach them through `style`, but they are outside the contract
and free to change.

Most of the spacing is on the responsive `r`-scale, where a **lower** number is a **larger**
value and every step except `--R-SIZE-6` grows at the `40rem` breakpoint: `--R-SIZE-2`
`1.25rem` → `2rem`, `--R-SIZE-3` `1rem` → `1.5rem`, `--R-SIZE-4` `0.75rem` → `1.25rem`,
`--R-SIZE-5` `0.5rem` → `0.75rem`, and `--R-SIZE-6` flat at `0.25rem`. `--R-SIZE-2` carries
three jobs at once: the left padding that clears the rail below `40rem`, the amount each card
is inset from the centre line above it (`width: calc(50% - …)`), and the gap between a card's
title and its body — so retinting it for one of those moves the other two. The type steps are
responsive too — `--BodyText-2` `0.8125rem` → `0.875rem`, `--BodyText-3` `0.75rem` →
`0.8125rem` — and `--Bold-Weight` is both responsive (`600` → `700`) and themed, running from
`600` in `tech` to `900` in `grimdark`.

Read the spacing rows together and the rhythm groups by proximity: the gap **between two
events** is `--R-SIZE-3` (`1rem`, `1.5rem` on desktop), while the gap **between an entry's
date and its title** is `--R-SIZE-6`, the tightest step on the scale (`0.25rem` at every
width) — so a date reads as belonging to its own entry rather than floating between two. The
nearest sibling component, [ActivityFeed](activity-feed.md), spends the same two tokens in
the same roles.

The card sits on `--C-SURFACE-1`, so inside an ancestor already painted `--C-SURFACE-1` it
has nothing but its `--C-BORDER-DEFAULT` hairline to separate it. The date is deliberately
`--C-TEXT-MUTED`, which is hint-level contrast — treat it as supplementary. Nothing in
`Timeline.css` declares an animation; the entrance comes from the shared `fade-right` class in
`@batthewz/response-ui-css`, which reads the shared `--MOTION-DURATION-ENTER` and
`--MOTION-EASE-ENTER`, so retiming those retimes every entrance in the system. `Timeline.css`
does re-point that class's `animation-name` to `slide-left, fade` on even items at `40rem` and
up, which is how the entrance direction stays welded to the card's side.

## Gotchas

- **An item's props land on both paths.** `Timeline.Item` types itself as a `<div>` and
  spreads its rest props onto [ScrollReveal](scroll-reveal.md) when animating, or onto a plain
  `<div>` under `animate={false}`. Either way `id`, `role`, `aria-*`, `data-*`, `tabIndex` and
  handlers reach the element and a click fires. On the animating path `className`, `ref` and
  `onAnimationEnd` are merged or composed with the reveal's own rather than replacing them — see
  [ScrollReveal's gotchas](scroll-reveal.md#gotchas). `Timeline.Item` passes no `delay`, so the
  reveal contributes no `style` of its own and yours lands as written.
- **Fragments are safe now.** Side and entrance direction used to come from two different
  counts — CSS `:nth-child` over the DOM, and the React index over `Children.toArray`, which
  does not descend into fragments — so `Item · <>Item Item</> · Item` emitted
  `fade-right · fade-left · fade-left · fade-right` against a `left · right · left · right`
  layout and two entries slid in across the rail. Both now come off the same `:nth-child`
  rule, so a fragment, a `.map`, or a component that renders two items cannot separate them.
- **Items must still be direct children of the root.** Everything positional is
  `.timeline-item:nth-child(odd|even)`, which counts inside whatever element actually contains
  the items. Give each item its own wrapper and every one is `nth-child(1)` — all on the left,
  all entering the same way. Share one wrapper between several and they alternate inside it,
  against a rail drawn per item inside that wrapper. Since side and direction now move
  together, a wrapper makes the layout wrong but never *inconsistent*.
- **A non-`Item` child is rendered as-is, and now breaks the rail.** The root hands any child
  straight through. A bare `<div>` between two items gets no `.timeline-item` class, no node
  and no dot — and, since the rail is drawn per item, **no rail segment either**, so the line
  has a gap the height of that child. (The old single root-level rail ran behind it; that is
  the one thing the per-item rail gave up to stop overshooting the last dot.) It also occupies
  an `nth-child` slot, so it flips the alternation of every item after it. Keep non-items out
  of the root, or accept the break.
- **The rail ends at the last dot.** Each item draws its own segment as a `::before` spanning
  its full height, and `:last-child::before` is suppressed — so the line stops exactly where
  the final node sits, whatever that card's height. (Before 0.10.1 a single `.timeline::before`
  was pinned `top: 0; bottom: 0` on the root: measured in Firefox at 1280px, the rail ran
  **270px** past the final dot — the full height of the last card — and 214px at 375px.)
- **Left-hand cards are right-aligned on desktop.** At `40rem` and up,
  `.timeline-item:nth-child(odd) .timeline-card` sets `text-align: right`, which applies to the
  date, the title *and* your body content. Alternate entries therefore read ragged-left. There is
  no prop for it and no `className` hook on the card, so the only way out is your own rule
  targeting `.timeline-card` — and see the next point about which rule wins.
- **A plain Tailwind utility cannot override the component CSS.** `Timeline.css` is unlayered
  while Tailwind's utilities compile into `@layer utilities`, and unlayered author rules outrank
  layered ones before specificity is consulted. Measured in the compiled bundle: the utilities
  layer ends at byte 30370, `.timeline-item` sits at 100794. So `className="pb-r3"` on an item
  loses to `.timeline-item`'s `padding-bottom`; the important form `pb-r3!` wins, because for
  important declarations the layer order is reversed.
- **Key your children.** Items are rendered straight into the root with no wrapper of their
  own, so React reconciles them against your keys: a keyed list survives a prepend or a
  reorder, the entries move rather than unmounting, and component state and the entrance
  animation are kept. Children with no `key` of their own fall back to position, where a
  prepend still remounts the tail.
- **`Timeline.Item` never throws outside `<Timeline>`.** With no provider it falls back to
  `animate: true`, so it renders a lone animated card — but the `--_timeline-*` locals it
  positions the node against are declared on `.timeline`, so an orphaned item has no rail to
  sit on and no resolvable offset to sit at.
- **Always a client boundary.** `Timeline.tsx` carries `"use client"`, so a server component can
  import it but it always ships JavaScript.

## Accessibility

The root is a plain `<div>` — no role, no list semantics, no label — and every entry is a
`<div>` too. Rest props reach the DOM on the root and on the items alike, whatever `animate`
is set to, so `role="list"` / `role="listitem"` and `aria-label` are yours to add at any
time, as the list example shows.

- **The default renders the whole timeline at `opacity: 0` until the bundle executes.** Every
  animating item ships with `scroll-reveal-hidden`, cleared from an effect. A browser with **no
  `IntersectionObserver`** now reveals the timeline statically, and with **scripting switched
  off** a `@media (scripting: none)` rule resolves the class to `opacity: 1`. Still uncovered:
  scripting enabled but the bundle never executing — a hydration error, a blocked script — where
  the effect never runs and the timeline stays invisible, and no media query can catch it because
  the browser reports `scripting: enabled`. `animate={false}` is the only cover for that.
- **Reduced motion is honoured on both paths.** Under `prefers-reduced-motion: reduce` the
  hook short-circuits the observer *and* the shared CSS resolves `.scroll-reveal-hidden` to
  `opacity: 1`, so those readers get a static, fully visible timeline even without JavaScript.
- **The heading level is yours, and the default is a guess.** `titleAs` picks the element —
  `"h3"` by default, which is right under an `<h2>` and wrong everywhere else: a timeline under
  an `<h1>` wants `"h2"`, one under an `<h3>` wants `"h4"`. `title` is `ReactNode`, so the
  content can be a link or an emphasised fragment. What you cannot do is make an entry *not* a
  heading: the element is always one of `h1`–`h6`, so anyone navigating by heading gets one
  stop per event. If that is the wrong outline, render the events yourself rather than reaching
  for a non-heading `titleAs`.
- **`date` is a `<span>`, not a `<time>`.** No `dateTime` attribute is emitted, so assistive tech
  reads whatever string you pass, verbatim and unparsed. Write dates you would be happy to hear
  read aloud, or pass a full date and let the card be wordy.
- **Icons get no accessible name.** `icon` is rendered as-is inside the node, so mark a decorative
  glyph `aria-hidden` yourself — as the icon example does.
- **Nothing distinguishes one event from another but its text.** Every dot is the same
  `--C-ACCENT` circle at the same size, and no `data-*` state, icon or label is emitted to mark an
  event as done, failed or pending. If the status of an entry matters, put it in the `title`, the
  body, or a [Badge](badge.md) — not in a tinted `icon` alone.

## Related

[ActivityFeed](activity-feed.md) · [Stepper](stepper.md) · [ScrollReveal](scroll-reveal.md) ·
[Card](card.md) · [MasonryGrid](masonry-grid.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
