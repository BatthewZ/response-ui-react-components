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
| `ActivityFeed.Item` | `<li>`  | `avatar?` · `icon?` · `actor?` · `action?` · `target?` · `timestamp?` · `children?` (+ all `li` props) |

Every slot is a `ReactNode`, and each renders only when it is non-nullish, so you can
supply just the pieces a given event has. `className`, `id`, `ref`, and `aria-*` pass
through on both parts.

## Markers: avatar or icon

Pass an `avatar` and it fills the marker column directly. An `Avatar` at `size="sm"` is
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

## Theme tokens

ActivityFeed uses **no Tailwind utilities** — all styling lives in `ActivityFeed.css` and
reads contract variables directly, the same way Tabs does. Override any of these and the
feed re-tints with the rest of the app, at runtime, with no rebuild.

| Where                        | Override                                     |
| ---------------------------- | -------------------------------------------- |
| Connector rail               | `--C-BORDER-DEFAULT`                         |
| Icon-dot marker fill         | `--C-SURFACE-2`                              |
| Icon-dot glyph ink           | `--C-TEXT-SECONDARY`                         |
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

Three geometry values are **not** on the contract: the marker column width (`2rem`), the
icon glyph size (`1rem`), and the connector thickness (`2px`) are hard literals held in
component-internal `--_activity-feed-*` locals. They are interdependent — the dot diameter
is derived from the column width so the fallback dot and a real `Avatar` present the same
circle — so they are fixed rather than themeable.

## Gotchas

- **`avatar` wins over `icon`.** The marker is `avatar ?? <dot>{icon}</dot>`, so if you
  pass both, the avatar renders and the `icon` is silently dropped. Pass one.
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
  RSC tree. Note that `Avatar`, if you use it as a marker, *is* a client component.

## Accessibility

The feed is a semantic `<ol>` of `<li>` items, so it announces as an ordered list and the
sentence slots read in `actor action target timestamp` order.

- **`list-style: none` can strip the list role.** The `<ol>` hides its markers in CSS, and
  in Safari + VoiceOver that WebKit quirk drops the `list`/`listitem` semantics of the list
  as a whole (the same issue that hits a styled `<ul>`). The component does **not** add
  `role="list"` itself. `role` passes through, so restore it with `<ActivityFeed role="list">`
  if "list, N items" navigation matters for your audience.
- **The connector rail is decorative.** It is a CSS `::before` with empty `content`, so it
  is never announced — correct.
- **Label or hide your marker icons.** The component renders your `icon` as-is with no
  accessible name. The visible sentence usually already carries the meaning ("merged",
  "approved"), so mark decorative icons `aria-hidden`; give a meaningful one its own label.
- **`aria-busy` alone is not an announcement.** It flags the region as updating but does not
  read new items out — pair it with your own `aria-live` region if additions must be spoken.

## Related

`Avatar` · `Timeline` · [DescriptionList](description-list.md) · [Card](card.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
