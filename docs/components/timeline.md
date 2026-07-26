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

**Anatomy.** `Timeline` is the `<div class="timeline">` that draws the rail as a `::before`
pseudo-element. It runs its children through `Children.toArray` and wraps each one in a
context provider carrying two values — that child's **index**, and the root's `animate`
setting. `Timeline.Item` reads them: the index decides which direction it enters from
(even → `fade-right`, odd → `fade-left`), and `animate` decides whether it renders through
a [ScrollReveal](scroll-reveal.md) or a plain `<div>`. Every item then renders the same two
boxes — a `timeline-node` holding the dot or your `icon`, absolutely positioned onto the
rail, and a `timeline-card` holding the optional date, the title and the optional body.

The provider itself emits no element, so `.timeline-item` stays a **direct child** of
`.timeline` — which matters, because the left/right alternation is pure CSS
`:nth-child(odd)`/`:nth-child(even)` and nothing else. Note that the direction is chosen from
the index at every width, so below `40rem` — where every card is on the left — entries still
alternate between entering from the left and entering from the right.

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
| `title`     | `string` — **required**, rendered inside a hard-coded `<h3>`          | —       |
| `date`      | `string` — a `<span>` above the title, omitted entirely when falsy     | —       |
| `icon`      | `ReactNode` — replaces the default dot inside the node                | —       |
| `children`  | `ReactNode` — the body block under the title; omitted when falsy      | —       |
| `className` | `string` — merged after `timeline-item`; survives on **both** paths   | —       |
| `ref`       | `Ref<HTMLDivElement>` — reaches the rendered element on both paths    | —       |
| …rest       | `div` props **minus `title`** — dropped unless `animate={false}`       | —       |

`title` is `string`, not `ReactNode`, and the item's div props are
`Omit<…, "title">` — so the prop always means the heading text and the native `title`
tooltip attribute is unavailable. There is no prop for the reveal's `threshold`, `delay`,
`once` or `rootMargin`: every item reveals once, at 10% visibility, with no stagger between
them, so a screenful of events animates together rather than in sequence.

## Icons on the rail

`icon` replaces the dot inside the node. Below `40rem` the node's horizontal offset is
computed from the default dot's `0.875rem` width, so an icon of any other size sits
off-centre on the rail by half the difference — a 24px glyph lands 5px to the right of the
line. At `40rem` and up the node is centred with `left: 50%; translateX(-50%)`, which is
size-agnostic, so the mismatch is a mobile-only artefact. Sizing the glyph to 14px avoids
it on both:

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
immediately — the right choice above the fold, and the only configuration in which an
item's own props reach the DOM:

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
`role`, `aria-label` and friends land there whatever `animate` is set to. On the items they
land only with the entrance off:

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
| Rail, and the card's 1px border             | `--C-BORDER-DEFAULT`                         |
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

Four values are **component-local, not contract tokens**, and are spelled with a leading
underscore to say so: `--_timeline-gutter` and `--_timeline-line-offset` alias the two
`--R-SIZE-*` steps above, while `--_timeline-dot-size` (`0.875rem`) and
`--_timeline-line-width` (`2px`) are literals. All four are declared on `.timeline` and the
node's offset is a `calc()` over all four, so they are interdependent by construction —
that `calc()` is what puts the dot's centre exactly on the rail's centre below `40rem`.
Because they are declared on the root element you can still reach them through `style`, but
they are outside the contract and free to change.

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
`Timeline.css` animates; the entrance comes from the shared `fade-left`/`fade-right` classes
in `@batthewz/response-ui-css`, which read the shared `--MOTION-DURATION-ENTER` and
`--MOTION-EASE-ENTER`, so retiming those retimes every entrance in the system.

## Gotchas

- **An item's props land on both paths.** `Timeline.Item` types itself as a `<div>` and
  spreads its rest props onto [ScrollReveal](scroll-reveal.md) when animating, or onto a plain
  `<div>` under `animate={false}`. Either way `id`, `role`, `aria-*`, `data-*`, `tabIndex` and
  handlers reach the element and a click fires. On the animating path `className`, `ref` and
  `onAnimationEnd` are merged or composed with the reveal's own rather than replacing them — see
  [ScrollReveal's gotchas](scroll-reveal.md#gotchas). `Timeline.Item` passes no `delay`, so the
  reveal contributes no `style` of its own and yours lands as written.
- **A fragment desynchronises the entrance from the layout.** The side a card lands on is CSS
  `:nth-child`, counted over the DOM; the direction it enters from is the React index, counted
  over `Children.toArray`, which does not flatten fragments. Wrap two items in a `<>…</>` and
  they share one index. Measured on `Item · <>Item Item</> · Item`, the emitted classes are
  `fade-right · fade-left · fade-left · fade-right`, so entries three and four each slide in
  from the wrong side, across the rail. Return an array of items, not a fragment of them.
- **Items must be direct children of the root.** The alternation selector is
  `.timeline-item:nth-child(odd|even)`, which counts inside whatever element actually contains
  the items. Give each item its own wrapper and every one is `nth-child(1)` — all odd, so every
  card lands on the left while the entrance direction keeps alternating from the React index.
  Share one wrapper between several and they alternate inside it, again out of step with that
  index. The rail is drawn on the root, so it stays put either way.
- **A non-`Item` child is rendered as-is.** The root wraps any child in a provider and hands it
  through. A bare `<div>` between two items gets no `.timeline-item` class, no node and no dot —
  but it still occupies an index *and* an `nth-child` slot, so index and slot stay in step and
  the alternation of the real items continues correctly around it.
- **The rail overshoots the last dot.** `.timeline::before` is pinned `top: 0; bottom: 0` on the
  root while `.timeline-node` sits at `top: 0` of its item, so the line runs from the top edge of
  the first card down to the bottom edge of the last one — a tail as tall as the final card hangs
  below the final dot.
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
- **Key your children.** The root keys each item's provider by the child's own key, so a
  keyed list survives a prepend or a reorder: the entries move rather than unmounting, keeping
  component state and not replaying the entrance. Children with no `key` of their own fall
  back to position, where a prepend still remounts the tail.
- **`Timeline.Item` never throws outside `<Timeline>`.** With no provider it falls back to
  index `0` and `animate: true`, so it renders a lone animated card — but the
  `--_timeline-*` locals it positions the node against are declared on `.timeline`, so an
  orphaned item has no rail to sit on and no resolvable offset to sit at.
- **Always a client boundary.** `Timeline.tsx` carries `"use client"`, so a server component can
  import it but it always ships JavaScript.

## Accessibility

The root is a plain `<div>` — no role, no list semantics, no label — and every entry is a
`<div>` too. Because the root's rest props do reach the DOM, `role="list"` and `aria-label`
on it are yours to add at any time; `role="listitem"` on the entries needs the entrance off,
as the list example shows.

- **The default renders the whole timeline at `opacity: 0`.** Every animating item ships with
  `scroll-reveal-hidden` and only clears it once an `IntersectionObserver` fires. Server-rendered
  HTML therefore contains an invisible timeline, and if the page never hydrates — or the browser
  has no `IntersectionObserver` — it stays invisible with no fallback. `animate={false}` is a real
  opt-out and the only one.
- **Reduced motion is honoured on both paths.** Under `prefers-reduced-motion: reduce` the
  hook short-circuits the observer *and* the shared CSS resolves `.scroll-reveal-hidden` to
  `opacity: 1`, so those readers get a static, fully visible timeline even without JavaScript.
- **Every title is a hard-coded `<h3>`.** There is no `as` or `level` prop, and `title` is typed
  `string`, so you cannot supply your own element either. A timeline under an `<h1>` skips a
  level, and one under an existing `<h3>` flattens against it. Anyone navigating by heading gets
  one stop per event, whether or not that is the outline you wanted.
- **`date` is a `<span>`, not a `<time>`.** No `dateTime` attribute is emitted, so assistive tech
  reads whatever string you pass, verbatim and unparsed. Write dates you would be happy to hear
  read aloud, or pass a full date and let the card be wordy.
- **Icons get no accessible name.** `icon` is rendered as-is inside the node, so mark a decorative
  glyph `aria-hidden` yourself — as the icon example does. That much *does* work on the animating
  path, because the attribute is on your element rather than on the item.
- **Nothing distinguishes one event from another but its text.** Every dot is the same
  `--C-ACCENT` circle at the same size, and no `data-*` state, icon or label is emitted to mark an
  event as done, failed or pending. If the status of an entry matters, put it in the `title`, the
  body, or a [Badge](badge.md) — not in a tinted `icon` alone.

## Related

[ActivityFeed](activity-feed.md) · [Stepper](stepper.md) · [ScrollReveal](scroll-reveal.md) ·
[Card](card.md) · [MasonryGrid](masonry-grid.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
