# Timeline

A vertical chronology — order status, a release history, a project's milestones — drawn as
a connecting rail with one dot and one card per event. Three independent props decide how it
reads: `align` puts the rail down the centre with the cards alternating either side (the
default), or hard against one edge in a single column; `density` sets the rhythm on the same
`dense · comfortable · spacious` scale as [Table](table.md); and `card` draws or drops the
per-entry border and surface. Out of the box it is the marketing shape, animating each card in
from its own side as it scrolls into view — `align="left" density="dense" card={false}
animate={false}` is the dashboard one.

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
Every item then renders the same two boxes — a `timeline-node` absolutely positioned onto the
rail, and a `timeline-card` holding the optional date, the title and the optional body. The
node holds either the default `timeline-dot` or, when you pass an `icon`, a `timeline-icon`
puck wrapping it. That wrapper is not cosmetic: it is the opaque disc that hides the rail
behind the marker, and it is the only signal the root has that this timeline needs
puck-width room rather than dot-width room.

The provider emits no element, so `.timeline-item` stays a **direct child** of `.timeline` —
which matters, because everything positional is pure CSS. `align`, `density` and `card` become
`data-align`, `data-density` and `data-card` on the **root**, and every rule below reads them
through a descendant selector, so no item is ever handed its own layout. Under `align="center"`
the alternation is then plain `:nth-child(odd)`/`:nth-child(even)`, and **both** the side a card
lands on and the direction it enters from come off that one selector: at `40rem` and up an odd
item's card sits left and enters from the left, an even item's sits right and enters from the
right. Nothing is counted in React, which is why a fragment, a `.map` or a component rendering
two items can no longer split the two apart.

| Part            | Renders                                                              | Props                                                            |
| --------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Timeline`      | `<div class="timeline" data-align data-density data-card>`            | `align?` · `density?` · `card?` · `animate?` (+ all `div` props, all of which reach the DOM) |
| `Timeline.Item` | `<div class="timeline-item" data-highlight?>`, through a scroll reveal when animating | `title` · `date?` · `icon?` · `highlight?` · `children?` · `classNames?` — and see the passthrough gotcha |

## Root props

| Prop        | Type                                                                       | Default         |
| ----------- | -------------------------------------------------------------------------- | --------------- |
| `align`     | `"left" \| "center" \| "right"` — which side of the cards the rail runs down | `"center"`      |
| `density`   | `"dense" \| "comfortable" \| "spacious"` — the vertical rhythm and dot size  | `"comfortable"` |
| `card`      | `boolean` — draw each entry on its own bordered surface                     | `true`          |
| `animate`   | `boolean` — render every item through a scroll reveal                       | `true`          |
| `className` | `string` — merged after `timeline`                                          | —               |
| `ref`       | `Ref<HTMLDivElement>`                                                       | —               |
| …rest       | `div` props — `id`, `role`, `aria-*`, `data-*`, `style`, handlers, all land  | —               |

The four are **orthogonal** — no combination is unreachable and none silently overrides
another. That is why there is no `variant="dashboard"` preset: `variant` already means a visual
skin on [Button](button.md), [Badge](badge.md), [Alert](alert.md) and [Tabs](tabs.md), and a
preset would freeze one taste judgement into the public API. Spell the four out instead.

## Where the rail sits

`align` is the load-bearing one. `"center"` is the marketing shape: at `40rem` and up the rail
bisects the list and cards alternate either side at `calc(50% - var(--_timeline-gutter))` wide.
Below `40rem` it **falls through to the `"left"` layout**, because a card inset to half of a
375px viewport has no room for a sentence.

`"left"` and `"right"` are single-column at **every** width. That is the property that makes
them the dashboard answer — nothing reflows across the breakpoint, and no row is ever half
empty. `"right"` is a true mirror: the root's padding, the rail, and the node's `translateX`
all flip, and cards enter from the left instead of the right.

**Expect the cards to get wider.** Under `align="center"` a card is pinned to
`calc(50% - var(--_timeline-gutter))`; under `left` and `right` it is in normal flow and takes
whatever the root gives it, so on a wide viewport a card that was half the width becomes nearly
all of it. That is the right default for a dashboard panel, which is already narrow, and the
wrong one for a full-bleed page. There is no `maxWidth` prop — constrain the **root**, which is a
plain `<div>` that takes your `className` and `style`, rather than the card.

<!-- example:RailAlignment -->
```tsx
<Timeline align="left" animate={false}>
  <Timeline.Item date="09:14" title="Build queued">
    Commit <code>a1b2c3d</code> on <code>main</code>.
  </Timeline.Item>
  <Timeline.Item date="09:21" title="Tests passed">
    1,284 tests, no retries.
  </Timeline.Item>
  <Timeline.Item date="09:23" title="Deployed to production" />
</Timeline>
```
<!-- /example -->

<!-- example:RailRight -->
```tsx
<Timeline align="right" animate={false}>
  <Timeline.Item date="09:14" title="Build queued" />
  <Timeline.Item date="09:21" title="Tests passed" />
  <Timeline.Item date="09:23" title="Deployed to production" />
</Timeline>
```
<!-- /example -->

The vocabulary is **physical** — `left`/`right`, not `start`/`end` — because `Timeline.css` is
physical, as is nearly all of this package. `start` would promise a `dir`-awareness nothing here
honours. Under `dir="rtl"` an `align="left"` rail stays on the left.

## Density

`density` retunes spacing only — the gap between events, the card's padding, the gaps under the
date and title, the dot's diameter, and the marker puck with its glyph. It changes **no type
size**, and it does **not** touch the card's border or surface; that is `card`.

**Does switching density slide the rail sideways?** For a timeline of **dots, no** — and that is
now enforced rather than hoped for: the rail's position is a `max()` over the marker's reach
against the two `--R-SIZE-*` steps it used to be stated as, and every dot size fits inside them
at both breakpoints, so those `max()`es resolve to the same literals they always did. For a
timeline of **pucks, yes**, necessarily — a 2rem disc *defines* where the rail can sit, so
retuning it moves the rail. [Icons on the rail](#icons-on-the-rail) has the measurements and why
that trade beats the alternative.

| | `dense` | `comfortable` | `spacious` |
| --- | --- | --- | --- |
| **Between events** | `--R-SIZE-5` | `--R-SIZE-3` | `--R-SIZE-2` |
| Card padding | `--R-SIZE-5` | `--R-SIZE-4` | `--R-SIZE-3` |
| Under the date (within an event) | `--R-SIZE-6` | `--R-SIZE-6` | `--R-SIZE-6` |
| Dot | `0.5rem` | `0.875rem` | `1rem` |
| Icon puck | `1.5rem` | `1.75rem` | `2rem` |
| Glyph inside the puck | `0.875rem` | `1rem` | `1.125rem` |

Read that table remembering the `r` scale is **inverted** — a *higher* number is a *smaller*
value — so `dense` counts up and `spacious` counts down.

**The rule the table encodes:** every gap *inside* an event is tighter than the gap *between* two
events. That ordering is what makes an entry read as one block; invert it and a body paragraph
reads as a preamble to the next event instead. Only one explicit gap sits inside an entry —
under the date, pinned at `--R-SIZE-6`, the tightest step there is (`0.25rem` at every width) — so
the invariant holds for any density whose `between events` value is looser than that, which every
step on the scale is.

**There is no margin under the title.** The gap between a title and its body is the type scale's
own leading and nothing else: `--BodyText-2-line-height` is `1.5rem` on a `0.8125rem` font
(`1.75rem` on `0.875rem` at `40rem` and up), so the half-leading below the title and above the
body already separates them by roughly half a rem. An explicit margin on top of that was
double-counting — and at `comfortable` it was the thing pushing an entry's body toward the next
event. Nothing special-cases a title with no body either: with no margin there is no trailing
space to suppress.

## Dropping the card chrome

`card={false}` strips the border, the background and the card's padding, hanging the text
straight off the rail — and re-centres the dot on the entry's **first line of text**. With a card
the dot sits at `top: 0`, level with the card's top edge, which reads as deliberate; strip the
card and there is no edge left to sit on, so the same offset would leave the dot floating above
the date. The node instead takes the height of that first line box and centres inside it, which
is exact for every dot size `density` produces and for an `icon` of any height.

**The rail moves with it — both ends.** Each item draws its segment across its own box and the
last one is suppressed, so the chain runs from the first item's top edge to the last item's top
edge, which *was* the dot's position and no longer is. The whole chain therefore shifts down half
a line box, with `bottom` going negative by the same amount so each segment still meets the next.
Left alone, the rail would overshoot above the first dot and stop short of the last by 14px each
at `40rem` and up.

Combined with `align`, `density="dense"` and `animate={false}` this is the dashboard feed:

<!-- example:DenseFeed -->
```tsx
<Timeline align="left" density="dense" card={false} animate={false}>
  <Timeline.Item date="09:14:02" title="Build queued" />
  <Timeline.Item date="09:21:47" title="Tests passed" />
  <Timeline.Item date="09:22:10" title="Image pushed" />
  <Timeline.Item date="09:23:55" title="Deployed to production" />
  <Timeline.Item date="09:41:08" title="Health check green" />
</Timeline>
```
<!-- /example -->

It is a **separate axis from `density` on purpose**. Stacked borders read as noise at `dense`,
but a flat timeline is just as legitimate at `spacious`, and a dense *carded* timeline is a real
thing too — coupling them would have made two of those unreachable:

<!-- example:SpaciousFlat -->
```tsx
<Timeline align="left" density="spacious" card={false} animate={false}>
  <Timeline.Item date="2019" title="Founded">
    Two people and a rented server.
  </Timeline.Item>
  <Timeline.Item date="2022" title="Series A">
    Enough runway to stop counting.
  </Timeline.Item>
</Timeline>
```
<!-- /example -->

`card={false}` removes the surface rather than restyling it, which is usually what you want when
the card is in the way. Restyling `.timeline-card` from a `className` is also possible now that
this package's CSS is layered — see the gotchas.

## Item props

| Prop        | Type                                                                | Default |
| ----------- | ------------------------------------------------------------------- | ------- |
| `title`     | `ReactNode` — **required**, rendered inside the `titleAs` element     | —       |
| `titleAs`   | `"h1" … "h6"` — the element `title` renders in                        | `"h3"`  |
| `date`      | `string` — a `<span>` above the title, omitted entirely when falsy     | —       |
| `icon`      | `ReactNode` — replaces the default dot, inside a marker puck           | —       |
| `highlight` | `boolean` — champion this entry; emits `data-highlight="true"`         | `false` |
| `children`  | `ReactNode` — the body block under the title; omitted when falsy      | —       |
| `className` | `string` — merged after `timeline-item`; survives on **both** paths   | —       |
| `classNames`| `{ icon?, card?, timestamp?, title?, body? }` — see [Slots](#slots)   | —       |
| `ref`       | `Ref<HTMLDivElement>` — reaches the rendered element on both paths    | —       |
| …rest       | `div` props **minus `title`** — reach the DOM on both paths            | —       |

`title` is `ReactNode`, and the item's div props are `Omit<…, "title">` — so the prop always
means the heading content and the native `title` tooltip attribute is unavailable. `titleAs`
picks the heading level; the `"h3"` default is only correct under an `<h2>`, so set it to
match the page (see [Accessibility](#accessibility)). There is no prop for the reveal's `threshold`, `delay`,
`once` or `rootMargin`: every item reveals once, at 10% visibility, with no stagger between
them, so a screenful of events animates together rather than in sequence.

## Icons on the rail

`icon` replaces the dot, and lands in a **marker puck**: an opaque `--C-SURFACE-2` disc, glyph
inked `--C-TEXT-SECONDARY`, exactly as [ActivityFeed](activity-feed.md)'s fallback marker and
[Stepper](stepper.md)'s indicator are. The disc is not decoration. The rail is drawn *behind* the
node, so a bare glyph with transparent gaps in it shows the line running through itself, and the
line reads as passing over the final marker rather than terminating on it. Both faults go away the
moment the marker is opaque.

**The puck sizes your glyph.** `density` steps the disc and the glyph together — `1.5`/`0.875rem`
at `dense`, `1.75`/`1rem` at `comfortable`, `2`/`1.125rem` at `spacious` — so there is no `size`
prop to hand-tune against the density you happen to be rendering at, and the padding around the
glyph stays proportional instead of crowding the edge at one end of the scale and swimming at the
other. It applies to direct `svg` children only: wrap your icon in anything and you keep control
of it.

**The rail moves out to make room, and this is the one place `density` shifts it.** A 2rem disc
centred on a rail `0.5rem` from the content edge would overhang the root and touch the card, so
`--_timeline-line-offset` and `--_timeline-gutter` are `max()`es over the marker's own reach —
see [Theme tokens](#theme-tokens). Two consequences worth knowing:

- A timeline of **dots is untouched**. Every dot size fits inside the two `--R-SIZE-*` steps the
  offset and gutter used to state as literals, at both breakpoints, so those `max()`es resolve to
  the same values they always did. Measured, not assumed: rail position, gutter, marker edges,
  card width and card inset are identical across all six density × breakpoint combinations, and
  across `card={false}`, `align="center"` and `align="right"`.
- A timeline of **pucks indents its cards further** than one of dots — about 8–10px, which is the
  room the disc needs. The alternative was reserving puck-width room in every timeline, which
  moves the rail for everyone who never asked for an icon.

The node itself is still centred by `translateX(-50%)` at every width and every `align`, so the
disc's centre lands on the rail's centre whatever size it is. (Until 0.10.1 the mobile offset
subtracted half of `--_timeline-dot-size`, which centred the *default* dot and nothing else —
measured in Firefox at 375px, a 32px icon sat 9px to the right of the rail, exactly half the
difference.)

<!-- example:CustomIcons -->
```tsx
<Timeline>
  <Timeline.Item icon={<Package aria-hidden />} date="12 March" title="Order placed">
    Three items, paid with the card ending 4242.
  </Timeline.Item>
  <Timeline.Item icon={<Truck aria-hidden />} date="13 March" title="Out for delivery">
    Handed to the courier in Rotterdam.
  </Timeline.Item>
  <Timeline.Item icon={<CheckCircle2 aria-hidden />} date="15 March" title="Delivered">
    Signed for by Ada Lovelace.
  </Timeline.Item>
</Timeline>
```
<!-- /example -->

## Championing an entry

`highlight` makes one entry the one you look at first. The marker fills with
`--timeline-highlight-fill` inked with `--timeline-highlight-ink`, the card's hairline takes
`--timeline-highlight-border`, and the marker gains a ring in the fill colour so it reads
*bigger*:

<!-- example:ChampionAnEntry -->
```tsx
<Timeline align="left" density="dense" animate={false}>
  <Timeline.Item icon={<CheckCircle2 aria-hidden />} date="14:02" title="v4.12.0 live">
    Four regions, no rollbacks.
  </Timeline.Item>
  <Timeline.Item highlight icon={<Rocket aria-hidden />} date="13:51" title="Canary promoted">
    Error rate held at 0.02%.
  </Timeline.Item>
  <Timeline.Item icon={<GitCommit aria-hidden />} date="13:30" title="Build queued" />
</Timeline>
```
<!-- /example -->

**Two channels, deliberately.** The fill says *which* entry at a glance. The ring says it again
as **width**, and that is the half that still works when the hue does not — in greyscale, and
under a theme that seats its accent near the surface, where a filled disc renders as a ring and
a colour-only cue would leave the championed marker indistinguishable from its neighbours. A cue
carried by hue alone would be the colour-only pattern this library has closed rows against in
[Alert](alert.md), [Badge](badge.md), [Toast](toast.md) and [Meter](meter.md). The ring's width
is the one part that is **not** a custom property, for exactly that reason — it cannot be
overridden away.

**It works without an `icon` too.** The default dot is already `--C-ACCENT`, so re-filling it
with the accent would move nothing; the ring is the entire cue there, which is the reason the
ring exists rather than a fill alone.

**Championing an entry never slides the rail.** The ring's width is reserved in the geometry
whether or not anything is highlighted, so the rail sits in the same place either way. The cost
is that a timeline containing a highlight reserves 2px more than one that does not — visible
only below `40rem`, where the `--R-SIZE-*` steps are tight enough for it to bind.

### Re-skinning the highlight

The two colours are **public** custom properties — no leading underscore. That is the override
route that works, and the reason there is no `markerClassName`: a `className` on the item reaches
`.timeline-item` and **nothing inside it**, so it cannot address the marker or the card at all,
whatever the cascade says. One write of a custom property on the item inherits inward to every
one of them. (Precedence used to be a second reason — this package's CSS was unlayered and
out-ranked `@layer utilities` whatever the specificity. It is now in `@layer components`, so a
utility you *can* place does win. Reach is what is left, and reach is the real reason.)

<!-- example:ChampionInAnotherKey -->
```tsx
<Timeline
  align="left"
  density="dense"
  animate={false}
  style={
    {
      "--timeline-highlight-fill": "var(--C-PRIMARY)",
      "--timeline-highlight-ink": "var(--C-TEXT-ON-PRIMARY)",
    } as CSSProperties
  }
>
  <Timeline.Item highlight icon={<Rocket aria-hidden />} date="13:51" title="Canary promoted">
    Error rate held at 0.02%.
  </Timeline.Item>
  <Timeline.Item icon={<GitCommit aria-hidden />} date="13:30" title="Build queued" />
</Timeline>
```
<!-- /example -->

Re-point them as a **pair**, and as a contractual one. Per the
[theme contract](../theme-contract.md) a fill token guarantees contrast only with its paired
`on-*` ink — `--C-PRIMARY` with `--C-TEXT-ON-PRIMARY`, `--C-ACCENT` with `--C-TEXT-ON-ACCENT`.
Setting `--timeline-highlight-fill` to a status token, or to a raw hex, leaves the glyph's
contrast to luck. `--timeline-highlight-border` is separate for the same reason inverted: the
card's hairline is a **stroke on the surface**, where a fill token guarantees nothing at all, so
it defaults to `--C-BORDER-STRONG` and wants a border or text token if you change it.

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

Two more reasons a dashboard wants it off. Each animating item constructs **its own
`IntersectionObserver`**, so a 200-row feed is 200 observers; and an entrance is a poor fit for a
list that re-renders on a poll. `animate` stays `true` by default because changing that would be
breaking — set it explicitly.

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

## Slots

`className` addresses the entry — the element the rail is drawn against and the reveal
animates. `classNames` addresses the parts inside it. Class strings only, and the keys are
typed, so a misspelled one is a compile error rather than a prop that does nothing.

| Slot        | Element                    | What it addresses                                    |
| ----------- | -------------------------- | ---------------------------------------------------- |
| `icon`      | `span.timeline-icon`       | the marker puck, when `icon` is set — absent on a dot entry |
| `card`      | `div.timeline-card`        | the entry's surface: its padding, border and background |
| `timestamp` | `span.timeline-date`       | the date line above the title, when `date` is set     |
| `title`     | the `titleAs` heading      | the heading itself, whatever level it renders at      |
| `body`      | `div.timeline-body`        | the detail block under the title, when `children` is set |

```tsx
<Timeline.Item
  date="12 March"
  title="Order placed"
  classNames={{ timestamp: "tabular-nums", card: "shadow-lg" }}
>
  Two items, express shipping.
</Timeline.Item>
```

**The marker has no slot, and that is deliberate.** Its fill, ink and border are the three
public custom properties documented under [Championing an entry](#championing-an-entry) —
one write on the entry reaches every part of the marker, which is what a per-element class
cannot do. Its ring *width* is private for the reason given there: a caller who could re-tint
the disc without it would reduce the emphasis cue back to colour alone.

`icon` is the exception, because the puck is also the glyph's container and a consumer sizing
their own glyph has nothing else to reach. Setting a background on it re-tints the disc but
not the highlight ring, which stays on the token pair — prefer the tokens when the change is
a colour.

## Theme tokens

Timeline uses **no Tailwind utilities** — every rule lives in `Timeline.css` and reads the
contract variables directly, the way Tabs and ActivityFeed do.

| Where                                       | Override                                     |
| ------------------------------------------- | -------------------------------------------- |
| Rail (per item, `::before`), and the card's 1px border | `--C-BORDER-DEFAULT`              |
| Default dot fill                            | `--C-ACCENT`                                 |
| Dot corners                                 | `--RADIUS-FULL`                              |
| Card surface (dropped by `card={false}`)    | `--C-SURFACE-0`                              |
| Card corners                                | `--RADIUS-LG`                                |
| Card padding — `comfortable`                | `--R-SIZE-4`                                 |
| Icon puck fill · glyph ink                  | `--C-SURFACE-2` · `--C-TEXT-SECONDARY`       |
| Puck corners                                | `--RADIUS-FULL`                              |
| Championed marker fill · glyph ink          | `--C-ACCENT` · `--C-TEXT-ON-ACCENT`          |
| Championed card hairline                    | `--C-BORDER-STRONG`                          |
| Gutter **floor** (single-column padding · alternating card inset) | `--R-SIZE-2`    |
| Rail offset **floor** from the edge         | `--R-SIZE-5`                                 |
| Air between a puck and its card             | `--R-SIZE-5`                                 |
| Air between a dot and its card              | `--R-SIZE-6`                                 |
| Space between two events — `comfortable`    | `--R-SIZE-3`                                 |
| Space under the date                        | `--R-SIZE-6`                                 |
| Date ink                                    | `--C-TEXT-MUTED`                             |
| Date type                                   | `--BodyText-3` · `--BodyText-3-line-height`  |
| Title ink · weight                          | `--C-TEXT-PRIMARY` · `--Bold-Weight`         |
| Body ink                                    | `--C-TEXT-SECONDARY`                         |
| Title and body type                         | `--BodyText-2` · `--BodyText-2-line-height`  |

**Three of the variables Timeline declares are public**, and they are the only supported way to
restyle the highlight: `--timeline-highlight-fill`, `--timeline-highlight-ink` and
`--timeline-highlight-border`, defaulting to `--C-ACCENT`, `--C-TEXT-ON-ACCENT` and
`--C-BORDER-STRONG`. No leading underscore says so, the same convention
[Stepper](stepper.md)'s `--stepper-progress-color` follows. See
[Re-skinning the highlight](#re-skinning-the-highlight) — including why re-pointing the fill
without its ink breaks the contrast contract.

Fourteen further values are **component-local, not contract tokens**, and are spelled with a
leading underscore to say so. They fall into four groups.

**Retuned by `density`.** `--_timeline-dot-size`, `--_timeline-marker-size`,
`--_timeline-glyph-size`, `--_timeline-card-padding` and `--_timeline-item-gap`. Each density is
a single rule that assigns these and nothing else — no density changes a selector or a type size.
`--_timeline-date-gap` sits in this group by kind but is deliberately constant at `--R-SIZE-6`:
it is already the tightest step the scale has.

**The marker's reach.** `--_timeline-marker-radius` is how far the widest marker in *this*
timeline reaches from the rail's centre, and `--_timeline-marker-clearance` is how much air to
leave between it and the card. Three rules of ascending weight state them per marker kind — plain
dot on `.timeline` itself, then `:has()` rules for a highlighted dot and for a puck. Both
`:has()` rules are written to the same specificity so **source order** decides, deliberately: a
timeline carrying both a puck and a highlight must reserve puck room, and a plainer selector for
the puck would have lost to the highlight rule and left the puck overhanging the card.

**Derived — where the rail sits.** `--_timeline-line-offset` and `--_timeline-gutter` used to
alias the two `--R-SIZE-*` steps above; they are now `max()`es of those steps against the marker's
reach, so a marker can only ever push the rail *outward*, never pull it in. `--_timeline-rail-x`
(`line-offset - gutter`) is the rail's x-position *inside an item*, which the segment and the node
both read so they cannot drift apart, and `--_timeline-line-width` is the literal `2px`. Custom
properties resolve lazily, which is what makes this hold together: retune the marker's reach and
the offset, the gutter and `rail-x` all follow in step.

**Used only by `card={false}`.** `--_timeline-first-line` is the height of an entry's first line
box (`--BodyText-3-line-height`), which the marker centres on once there is no card edge to sit
on. It is declared once for the same reason as `--_timeline-rail-x`: the node centres *inside* it
and the rail shifts by *half* of it, so changing one without the other would put every marker
back off its own line.

`--_timeline-highlight-ring` is the fourteenth and belongs to none of them: it is the width the
championed marker's ring adds, held private so the non-colour half of the cue cannot be
overridden away.

All are declared on `.timeline`. The node is then centred with `translateX(-50%)` rather than by
subtracting half a dot, so the marker's centre lands on the rail's centre whatever size it is.
Because they are declared on the root element you can still reach the underscored ones through
`style`, but they are outside the contract and free to change.

Most of the spacing is on the responsive `r`-scale, where a **lower** number is a **larger**
value and every step except `--R-SIZE-6` grows at the `40rem` breakpoint: `--R-SIZE-2`
`1.25rem` → `2rem`, `--R-SIZE-3` `1rem` → `1.5rem`, `--R-SIZE-4` `0.75rem` → `1.25rem`,
`--R-SIZE-5` `0.5rem` → `0.75rem`, and `--R-SIZE-6` flat at `0.25rem`. `--R-SIZE-2` carries two
jobs at once: the single-column padding that clears the rail, and the amount each card is inset
from the centre line under `align="center"` (`width: calc(50% - …)`) — so retinting it for one of
those moves the other. The type steps are responsive too — `--BodyText-2` `0.8125rem` →
`0.875rem`, `--BodyText-3` `0.75rem` → `0.8125rem` — and `--Bold-Weight` is both responsive
(`600` → `700`) and themed, running from `600` to `900` across the worked examples (`tech` and
`grimdark` are the two ends).

Read the spacing rows together and the rhythm groups by proximity: at `comfortable` the gap
**between two events** is `--R-SIZE-3` (`1rem`, `1.5rem` on desktop), while the only explicit gap
inside an entry — `--R-SIZE-6` under the date — is the tightest step there is, and the title-to-body
gap is looser than neither, being pure leading. So a date and a body read as belonging to their own
event rather than floating between two. `density` moves the between-events figure and leaves both
in-entry gaps alone, which is what keeps the grouping intact as the list tightens. The nearest
sibling component, [ActivityFeed](activity-feed.md), spends the same tokens in the same roles.

The card sits on `--C-SURFACE-0`, the raised-sheet rung, so inside an ancestor already on that
rung — a [Card](card.md), a [Dialog](dialog.md), a [Drawer](drawer.md) — it has nothing but its
`--C-BORDER-DEFAULT` hairline to separate it; `card={false}` drops both. On the page floor the
fill is a **1.05–1.16:1** lift off `--C-CANVAS`, so the hairline is doing most of the work there
too. The
date is deliberately `--C-TEXT-MUTED`, which is hint-level contrast — treat it as supplementary.
`Timeline.css` owns the entrance outright. It declares the whole `animation` shorthand, still
reading the shared `--MOTION-DURATION-ENTER` and `--MOTION-EASE-ENTER`, so retiming those retimes
every entrance in the system; the `@keyframes` themselves (`slide-right`, `slide-left`, `fade`)
still come from `@batthewz/response-ui-css` by name. The direction flips to `slide-left, fade` in
the two places a card sits left of the rail — every item under `align="right"`, and even items
under `align="center"` at `40rem` and up — which is how the entrance direction stays welded to
the card's side.

It is keyed on `data-entering`, the attribute [ScrollReveal](scroll-reveal.md) sets for exactly
the interval the entrance is playing, and `Timeline.Item` passes `animation="none"` so no
foundation `fade-*` class is emitted at all. **This changed.** Items used to carry `fade-right`
and `Timeline.css` re-pointed that class's `animation-name` — which worked only while this
package's CSS was unlayered. From `@layer components` the foundation's own `.fade-right` wins on
layer at any specificity, and every card would enter from the same side, sliding across the rail.
If you were keying CSS or a test off `.timeline-item.fade-right`, key it off
`.timeline-item[data-entering]` instead.

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
  does not descend into fragments — so `Item · <>Item Item</> · Item` entered
  `right · left · left · right` against a `left · right · left · right` layout and two entries
  slid in across the rail. Both now come off the same `:nth-child` rule and every item ships
  identical markup, so a fragment, a `.map`, or a component that renders two items cannot
  separate them.
- **Items must still be direct children of the root — under `align="center"`.** The alternation
  is `.timeline-item:nth-child(odd|even)`, which counts inside whatever element actually contains
  the items. Give each item its own wrapper and every one is `nth-child(1)` — all on the left,
  all entering the same way. Share one wrapper between several and they alternate inside it,
  against a rail drawn per item inside that wrapper. Since side and direction now move
  together, a wrapper makes the layout wrong but never *inconsistent*. `align="left"` and
  `align="right"` count nothing at all, so a wrapper is harmless there — one more reason they
  suit generated dashboard markup.
- **A non-`Item` child is rendered as-is, and now breaks the rail.** The root hands any child
  straight through. A bare `<div>` between two items gets no `.timeline-item` class, no node
  and no dot — and, since the rail is drawn per item, **no rail segment either**, so the line
  has a gap the height of that child. (The old single root-level rail ran behind it; that is
  the one thing the per-item rail gave up to stop overshooting the last dot.) It also occupies
  an `nth-child` slot, so under `align="center"` it flips the alternation of every item after it.
  Keep non-items out of the root, or accept the break.
- **The rail ends at the last dot.** Each item draws its own segment as a `::before` spanning
  its full height, and `:last-child::before` is suppressed — so the line stops exactly where
  the final node sits, whatever that card's height. (Before 0.10.1 a single `.timeline::before`
  was pinned `top: 0; bottom: 0` on the root: measured in Firefox at 1280px, the rail ran
  **270px** past the final dot — the full height of the last card — and 214px at 375px.)
- **Under `align="center"`, left-hand cards are right-aligned on desktop.** At `40rem` and up,
  `.timeline[data-align="center"] .timeline-item:nth-child(odd) .timeline-card` sets
  `text-align: right`, which applies to the date, the title *and* your body content. Alternate
  entries therefore read ragged-left. There is no prop for it and no `className` hook on the card,
  so the only way out is your own rule targeting `.timeline-card` — and see the next point about
  which rule wins. **`align="left"` and `align="right"` set no `text-align` at all**, so both read
  ragged-right; a single side rail is perfectly legible that way, and mirroring the typography as
  well as the geometry would just recreate this complaint on the other edge.
- **`density` moves spacing, not type.** Font sizes, line-heights and weights are identical across
  `dense`, `comfortable` and `spacious` — it retunes five spacing/size locals and nothing else. If
  you want smaller text in a dense feed, that is your own rule on `.timeline-title` /
  `.timeline-body` (which needs no `!` any more — see the cascade bullet below). Note too that
  the two in-entry gaps do not move
  with it at all: the date-to-title gap is pinned at `--R-SIZE-6`, already the tightest step the
  scale has, and the title-to-body gap is leading rather than margin.
- **The title carries no bottom margin at all.** Its separation from the body is the type scale's
  leading, so it is not tunable through a `--_timeline-*` local and does not move with `density`.
  If you want an explicit gap back, it is `margin-bottom` on your own `.timeline-title` rule —
  no `!` needed any more, see the cascade bullet below — and remember a `title`-only entry will
  then carry it as dead space
  beneath the last line.
- **A plain Tailwind utility now overrides the component CSS.** `Timeline.css` compiles into
  `@layer components`, which Tailwind orders **below** `@layer utilities`, so `className="pb-r3"`
  on an item beats `.timeline-item`'s `padding-bottom` at any specificity. It used to lose and
  need the important form `pb-r3!`, because this package's CSS was unlayered and out-ranked
  layered rules before specificity was consulted.
- **Key your children.** Items are rendered straight into the root with no wrapper of their
  own, so React reconciles them against your keys: a keyed list survives a prepend or a
  reorder, the entries move rather than unmounting, and component state and the entrance
  animation are kept. Children with no `key` of their own fall back to position, where a
  prepend still remounts the tail.
- **`Timeline.Item` never throws outside `<Timeline>`.** With no provider it falls back to
  `animate: true`, so it renders a lone animated card — but the `--_timeline-*` locals it
  positions the node against are declared on `.timeline`, so an orphaned item has no rail to
  sit on and no resolvable offset to sit at.
- **The layout attributes are overridable, and overriding them is load-bearing.** `data-align`,
  `data-density` and `data-card` sit *before* the rest-prop spread, matching the rest of the
  package — so `<Timeline align="left" data-align="right">` renders right-aligned. Handy for a
  CSS-only responsive override; a silent footgun if you spread an object that happens to carry
  one of those keys.
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
