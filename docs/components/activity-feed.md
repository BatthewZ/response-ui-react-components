# ActivityFeed

A vertical stream of "who did what, when" — a real `<ol>`/`<li>` list with a connector
rail down the marker column, styled entirely from theme tokens so it re-tints with the
rest of the app without a line of CSS from you.

<!-- example:Minimal -->
```tsx
<ActivityFeed>
  <ActivityFeed.Item actor="Ada Lovelace" action="opened" target="Pull request #42" timestamp="2h ago" />
  <ActivityFeed.Item actor="Grace Hopper" action="approved" target="Pull request #42" timestamp="1h ago" />
  <ActivityFeed.Item actor="Ada Lovelace" action="merged" target="Pull request #42" timestamp="20m ago" />
</ActivityFeed>
```
<!-- /example -->

**Anatomy.** `ActivityFeed` is the `<ol>` and owns nothing but layout — it holds no
selection state and reads no context. Each `ActivityFeed.Item` is one `<li>`, rendered as
a two-column grid: a fixed 2rem **marker column** (an avatar or an icon-dot) on the left,
and a **content column** on the right. The content column is a wrapping sentence built
from four optional slots — `actor` · `action` · `target` · `timestamp` — with the item's
`children` rendering as an optional body block beneath it. A CSS connector line runs down
the marker column from one item to the next, suppressed on the last one.

| Part                | Renders | Props                                                                            |
| ------------------- | ------- | -------------------------------------------------------------------------------- |
| `ActivityFeed`      | `<ol>`  | `aria-busy?` (+ all `ol` props)                                                  |
| `ActivityFeed.Item` | `<li data-highlight?>`  | `avatar?` · `icon?` · `actor?` · `action?` · `target?` · `timestamp?` · `highlight?` · `children?` · `classNames?` — see [Slots](#slots) (+ all `li` props) |

Every slot is a `ReactNode`, and each renders only when it is non-nullish, so you can
supply just the pieces a given event has. `className`, `id`, `ref`, and `aria-*` pass
through on both parts.

## Markers: avatar or icon

Pass an `avatar` and it fills the marker column directly. An [Avatar](avatar.md) at `size="sm"` is
exactly the 2rem column width, so it lands flush on the connector rail:

<!-- example:WithAvatars -->
```tsx
<ActivityFeed>
  <ActivityFeed.Item avatar={<Avatar name="Ada Lovelace" size="sm" />} actor="Ada Lovelace" action="pushed 3 commits to" target="main" timestamp="2h ago" />
  <ActivityFeed.Item avatar={<Avatar name="Grace Hopper" size="sm" />} actor="Grace Hopper" action="deployed" target="v2.4.0" timestamp="1h ago" />
</ActivityFeed>
```
<!-- /example -->

With no `avatar`, the marker falls back to a token-tinted dot that holds your `icon`. The
dot sizes the glyph itself, so you don't hand-tune an icon `size` to match the rail:

<!-- example:WithIcons -->
```tsx
<ActivityFeed>
  <ActivityFeed.Item icon={<GitPullRequest />} actor="Ada Lovelace" action="opened" target="Add OKLCH theming" timestamp="2h ago" />
  <ActivityFeed.Item icon={<MessageSquare />} actor="Grace Hopper" action="commented on" target="Add OKLCH theming" timestamp="1h ago" />
  <ActivityFeed.Item icon={<CheckCircle2 />} actor="Grace Hopper" action="approved" target="Add OKLCH theming" timestamp="55m ago" />
  <ActivityFeed.Item icon={<GitMerge />} actor="Ada Lovelace" action="merged" target="Add OKLCH theming" timestamp="20m ago" />
</ActivityFeed>
```
<!-- /example -->

`avatar` and `icon` are not additive — the avatar slot short-circuits the dot fallback, so
passing both silently drops the `icon`. See [Gotchas](#gotchas).

## Championing a row

`highlight` makes one row the one you look at first. The marker fills with
`--activity-feed-highlight-fill`, inked with `--activity-feed-highlight-ink`, and gains a ring in
the fill colour so it reads *bigger*:

<!-- example:ChampionARow -->
```tsx
<ActivityFeed>
  <ActivityFeed.Item
    icon={<GitPullRequest />}
    actor="Ada Lovelace"
    action="opened"
    target="Add OKLCH theming"
    timestamp="2h ago"
  />
  <ActivityFeed.Item
    highlight
    icon={<GitMerge />}
    actor="Deploy bot"
    action="released"
    target="v4.12.0"
    timestamp="1h ago"
  >
    Rolled out to 4 regions with no error-budget spend.
  </ActivityFeed.Item>
  <ActivityFeed.Item
    icon={<MessageSquare />}
    actor="Grace Hopper"
    action="commented on"
    target="v4.12.0"
    timestamp="55m ago"
  />
</ActivityFeed>
```
<!-- /example -->

**The ring is the point, not decoration.** The fill says which row at a glance; the ring says it
again as **width**, which is what still reads in greyscale and under a theme that seats its accent
near the surface. A cue carried by hue alone is the colour-only pattern this library has closed
rows against elsewhere. The ring's width is held in a private local so it cannot be overridden
away; the two colours are public custom properties so they can. [Timeline](timeline.md) takes the
same prop and spends it the same way.

Re-point the colours as a **pair** — per the [theme contract](../theme-contract.md) a fill token
guarantees contrast only with its paired `on-*` ink (`--C-ACCENT` with `--C-TEXT-ON-ACCENT`,
`--C-PRIMARY` with `--C-TEXT-ON-PRIMARY`). Setting the fill alone leaves the glyph's contrast to
luck.

The ring is drawn as a `box-shadow`, so it costs no layout: the 2rem marker column is a fixed grid
track that the connector's origin is measured from, and a marker that actually grew would move the
rail. It does overhang the `<ol>`'s box by 2px — nothing in the feed clips, but an ancestor with
`overflow: hidden` and no padding would shave it. See [Gotchas](#gotchas) for what `highlight`
does on an `avatar` row.

## Rich body

`children` render as a body block below the sentence line — for a comment, a diff, or any
detail the one-liner can't carry:

<!-- example:WithBody -->
```tsx
<ActivityFeed>
  <ActivityFeed.Item icon={<MessageSquare />} actor="Grace Hopper" action="commented on" target="Add OKLCH theming" timestamp="1h ago">
    <p>Contrast pairs all check out against the surface tokens. Shipping it.</p>
  </ActivityFeed.Item>
  <ActivityFeed.Item icon={<GitMerge />} actor="Ada Lovelace" action="merged" target="Add OKLCH theming" timestamp="20m ago" />
</ActivityFeed>
```
<!-- /example -->

## Loading

`ActivityFeed` narrows the native `aria-busy` to a `boolean` and passes it through — set
it on the root to mark the region as updating while newer activity streams in:

<!-- example:Loading -->
```tsx
<ActivityFeed aria-busy>
  <ActivityFeed.Item actor="Ada Lovelace" action="opened" target="Pull request #42" timestamp="just now" />
</ActivityFeed>
```
<!-- /example -->

## Slots

`className` addresses the row's `<li>`. `classNames` addresses the parts of the sentence and
the detail block under it. Class strings only, and the keys are typed, so a misspelled one is
a compile error rather than a prop that does nothing.

| Slot        | Element                          | What it addresses                            |
| ----------- | -------------------------------- | -------------------------------------------- |
| `sentence`  | `div.activity-feed-sentence`     | the wrapping flex row the four spans sit in   |
| `actor`     | `span.activity-feed-actor`       | who did it, when `actor` is set               |
| `action`    | `span.activity-feed-action`      | what they did, when `action` is set           |
| `target`    | `span.activity-feed-target`      | what they did it to, when `target` is set     |
| `timestamp` | `span.activity-feed-timestamp`   | when, if `timestamp` is set                   |
| `body`      | `div.activity-feed-body`         | the detail block, when `children` is set      |

```tsx
<ActivityFeed.Item
  actor="Ada Lovelace"
  action="merged"
  target="#42"
  timestamp="2h ago"
  classNames={{ timestamp: "tabular-nums", actor: "text-fg-primary" }}
/>
```

**The marker and its column take no slots, and both refusals are load-bearing.** The marker's
fill and ink are the two public custom properties documented under
[Championing a row](#championing-a-row) — one write on the row reaches every part of it,
which a per-element class cannot — and its ring width stays private so the emphasis cue
cannot be reduced back to colour alone. The column beside it is a fixed grid track that the
rail's origin is measured from: growing it moves the line down the whole feed, which is not
an override but a broken rail.

## Theme tokens

ActivityFeed uses **no Tailwind utilities** — all styling lives in `ActivityFeed.css` and
reads contract variables directly, the same way Tabs does. Override any of these and the
feed re-tints with the rest of the app, at runtime, with no rebuild.

| Where                        | Override                                     |
| ---------------------------- | -------------------------------------------- |
| Connector rail               | `--C-BORDER-DEFAULT`                         |
| Icon-dot marker fill         | `--C-SURFACE-2`                              |
| Icon-dot glyph ink           | `--C-TEXT-SECONDARY`                         |
| Championed marker fill · glyph ink | `--C-ACCENT` · `--C-TEXT-ON-ACCENT`    |
| Marker corners               | `--RADIUS-FULL`                             |
| Actor & target               | `--C-TEXT-PRIMARY` · `--Bold-Weight`         |
| Action & sentence base ink   | `--C-TEXT-SECONDARY`                         |
| Sentence / body type         | `--BodyText-2` · `--BodyText-2-line-height`  |
| Timestamp ink                | `--C-TEXT-MUTED`                            |
| Timestamp type               | `--BodyText-3` · `--BodyText-3-line-height`  |
| Column gutter · row gap      | `--R-SIZE-5` · `--R-SIZE-3`                  |
| Sentence slot gap            | `--R-SIZE-6`                                |

Two of these spacing tokens step up at the 40rem breakpoint along the responsive `r`-scale:
the column gutter (`--R-SIZE-5`, `0.5rem` → `0.75rem`) and the row gap (`--R-SIZE-3`,
`1rem` → `1.5rem`). The sentence slot gap (`--R-SIZE-6`) sits on the same scale but holds at
`0.25rem` on both sides of the breakpoint, so the gaps within the sentence stay constant.
The `--BodyText-*` type steps are responsive, scaling up at 40rem. The feed sets **no
background** — it inks `--C-TEXT-PRIMARY`/`--C-TEXT-SECONDARY` on whatever surface it is
dropped onto, and those text tokens are intended to read on any `surface-*` token from the
[theme contract](../theme-contract.md). The timestamp is deliberately `--C-TEXT-MUTED`
(hint-level contrast), so treat it as supplementary, not load-bearing.

Four geometry values are **not** on the contract: the marker column width (`2rem`), the
icon glyph size (`1rem`), the connector thickness (`2px`) and the championed marker's ring
(`2px`) are hard literals held in component-internal `--_activity-feed-*` locals. The first three
are interdependent — the dot diameter is derived from the column width so the fallback dot and a
real [Avatar](avatar.md) present the same circle — so they are fixed rather than themeable. The
ring is private for a different reason: it is the non-colour half of the `highlight` cue, and
overriding it away would leave rank conveyed by hue alone.

Two variables **are** public, and are the only supported way to restyle the highlight:
`--activity-feed-highlight-fill` and `--activity-feed-highlight-ink`. No leading underscore says
so, the same convention [Stepper](stepper.md)'s `--stepper-progress-color` follows. A `className`
is not an alternative — it reaches the `<li>` and nothing inside it, while one write of these
inherits to markers you never render. (Precedence is no longer the reason: this package's CSS is
in `@layer components`, below `@layer utilities`, so a utility you *can* place does now win. The
reason these tokens stay is reach, not rank.)

## Gotchas

- **`avatar` wins over `icon`.** The marker is `avatar ?? <dot>{icon}</dot>`, so if you
  pass both, the avatar renders and the `icon` is silently dropped. Pass one.
- **`highlight` is weaker on an `avatar` row, and knowingly so.** On the fallback dot it fills the
  disc *and* rings it, so the cue is "this disc is bigger" and survives greyscale. An avatar
  carries its own image or initials, so re-inking it would fight whatever you put there — it gets
  the **ring only**. That leaves the ring as the sole cue, and it is a fill token used as a stroke,
  which the [theme contract](../theme-contract.md) does not guarantee against the surface: under a
  theme that seats the accent near the surface, a championed avatar row is indistinguishable.
  Re-point `--activity-feed-highlight-fill` to a text token there, or champion with an `icon`.
- **A marker always renders.** An `Item` with neither `avatar` nor `icon` still shows an
  empty filled dot — intentional, so the rail stays unbroken, but you can't get a
  marker-less row.
- **Last-row connector suppression is `:last-child`.** The line under an `Item` is hidden
  only when that `Item` is the final child of the `<ol>`. Render anything after the last
  `Item`, or don't make the `Item`s direct children, and the trailing connector reappears
  with nothing to connect to.
- **`Item` reads no context and never throws.** It is a pre-styled `<li>`, so it can be
  wrapped in your own component freely — but rendered outside `<ActivityFeed>` it also
  won't warn; you just lose the `<ol>` wrapper, its list semantics, and the rail.
- **Server-renderable.** `ActivityFeed` and `Item` have no `"use client"` and drop into an
  RSC tree. Note that [Avatar](avatar.md), if you use it as a marker, *is* a client component.

## Accessibility

The feed is a semantic `<ol>` of `<li>` items, so it announces as an ordered list and the
sentence slots read in `actor action target timestamp` order.

- **`list-style: none` can strip the list role, so the `<ol>` carries `role="list"`.** Hiding
  the markers in CSS drops the `list`/`listitem` semantics in Safari + VoiceOver (the same
  issue that hits a styled `<ul>`), so the component sets the role itself. It is written
  before the rest spread, so `<ActivityFeed role="…">` still replaces it.
- **The connector rail is decorative.** It is a CSS `::before` with empty `content`, so it
  is never announced — correct.
- **Label or hide your marker icons.** The component renders your `icon` as-is with no
  accessible name. The visible sentence usually already carries the meaning ("merged",
  "approved"), so mark decorative icons `aria-hidden`; give a meaningful one its own label.
- **`aria-busy` alone is not an announcement.** It flags the region as updating but does not
  read new items out — pair it with your own `aria-live` region if additions must be spoken.

## Related

[Avatar](avatar.md) · [Timeline](timeline.md) · [DescriptionList](description-list.md) · [Card](card.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
