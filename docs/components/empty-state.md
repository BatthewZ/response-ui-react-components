# EmptyState

The "nothing here yet" panel: a centred icon, title, description and action row that
stands in for a list, table or page with no content. Five sibling exports rather than one
prop-heavy component, so a blank state can be a single line of copy or a full recovery
flow without either shape carrying the other's props.

<!-- example:Minimal -->
```tsx
<EmptyState>
  <EmptyStateIcon>
    <Inbox size="1em" />
  </EmptyStateIcon>
  <EmptyStateTitle>No messages yet</EmptyStateTitle>
  <EmptyStateDescription>
    When a teammate sends you something, it lands here.
  </EmptyStateDescription>
  <EmptyStateActions>
    <Button type="button">Compose message</Button>
  </EmptyStateActions>
</EmptyState>
```
<!-- /example -->

**Anatomy.** These are **five separate exports, not dot-notation.** There is no
`EmptyState.Icon` — import `EmptyStateIcon` alongside the root. `EmptyState` is the
`<div>` that owns the vertical flex column (centred, `text-align: center`), the padding,
and the gap between parts. It publishes its `size` on React context and mirrors it onto
the DOM as `data-size`; the four sub-parts read that context **only to assert they are
inside a root** — they never use the value, because what per-size styling they have comes
from CSS descendant selectors off `data-size`. So the parts may sit at any depth inside
the root, in any order, and you may render only the ones a given state needs. (The root's
gap still only spaces its **direct** children, so nest for semantics, not for layout.)

| Part                    | Renders | Props                             |
| ----------------------- | ------- | --------------------------------- |
| `EmptyState`            | `<div>` | `size?` (+ all `div` props)       |
| `EmptyStateIcon`        | `<div>` | — (+ all `div` props)             |
| `EmptyStateTitle`       | `<p>`   | `as?` (+ all props of that element) |
| `EmptyStateDescription` | `<p>`   | — (+ all `p` props)               |
| `EmptyStateActions`     | `<div>` | — (+ all `div` props)             |

`size` is the root's only bespoke prop; `as` on the title is the only other one in the
component.

| Prop        | Type                   | Default |
| ----------- | ---------------------- | ------- |
| `size`      | `"sm" \| "md" \| "lg"` | `"md"`  |
| `className` | `string`               | —       |
| `ref`       | `Ref<HTMLDivElement>`  | —       |
| …rest       | `div` props            | —       |

Every part merges `className` through `cn` and spreads the rest of its props onto the
element **after** its own attributes, so `id`, `data-*`, `aria-*`, `role` and event
handlers all pass through — and can override what the component set. `ref` is forwarded
on all five.

## The smallest useful empty state

Nothing is required beyond the root. A title on its own is a complete, correctly spaced
empty state — reach for `sm` when it is filling a small panel rather than a page.

<!-- example:TitleOnly -->
```tsx
<EmptyState size="sm">
  <EmptyStateTitle>No saved filters</EmptyStateTitle>
</EmptyState>
```
<!-- /example -->

## Size

`size` moves the root's padding, the root's gap, the title's type scale and the icon. It
does **not** touch the description (always `--BodyText-2`) or the actions row (always the
same gap), so the body copy stays put while the frame around it grows.

The icon steps once per size — `--H5`, `--H4`, `--H3` — and the slot sizes the glyph itself
(`width`/`height` of `1em` on a descendant `svg`), so an icon that carries its own
`width`/`height` attributes follows `size` too. Measured in Firefox above the 40rem
breakpoint, a bare 24px lucide glyph renders 20px / 28px / 36px at `sm` / `md` / `lg`.

<!-- example:Sizes -->
```tsx
<EmptyState size="sm">
  <EmptyStateIcon>
    <Inbox size="1em" />
  </EmptyStateIcon>
  <EmptyStateTitle>No drafts</EmptyStateTitle>
</EmptyState>
<EmptyState size="md">
  <EmptyStateIcon>
    <Inbox size="1em" />
  </EmptyStateIcon>
  <EmptyStateTitle>No drafts</EmptyStateTitle>
</EmptyState>
<EmptyState size="lg">
  <EmptyStateIcon>
    <Inbox size="1em" />
  </EmptyStateIcon>
  <EmptyStateTitle>No drafts</EmptyStateTitle>
</EmptyState>
```
<!-- /example -->

All of these values sit on the responsive `r`- and type-scales, so each size is larger
again above the 40rem breakpoint — with one exception worth knowing: `sm`'s gap is
`--R-SIZE-6`, which holds at `0.25rem` on both sides of the breakpoint, so a small empty
state stays tight on desktop rather than opening up.

## When the empty state *is* the page

A panel inside a page wants a paragraph title; a page-level empty state wants a heading, or
it leaves a hole in the document outline. `as` on the title renders any element you name,
keeping the `empty-state__title` styling either way.

<!-- example:TitleAsHeading -->
```tsx
<EmptyState size="lg">
  <EmptyStateIcon>
    <FolderOpen size="1em" />
  </EmptyStateIcon>
  <EmptyStateTitle as="h2">This workspace is empty</EmptyStateTitle>
  <EmptyStateDescription>
    Create your first project and it will show up here.
  </EmptyStateDescription>
</EmptyState>
```
<!-- /example -->

## Actions

`EmptyStateActions` is a centred, wrapping flex row. Two buttons is the common shape: the
action that fixes the emptiness, plus the one that undoes whatever caused it.

<!-- example:TwoActions -->
```tsx
<EmptyState>
  <EmptyStateIcon>
    <SearchX size="1em" />
  </EmptyStateIcon>
  <EmptyStateTitle>No invoices match those filters</EmptyStateTitle>
  <EmptyStateDescription>
    Widen the date range, or clear the filters to see every invoice again.
  </EmptyStateDescription>
  <EmptyStateActions>
    <Button type="button" variant="secondary">
      Clear filters
    </Button>
    <Button type="button">Create invoice</Button>
  </EmptyStateActions>
</EmptyState>
```
<!-- /example -->

## Placement

The root paints **no background, border, or radius**. It inherits whatever surface it is
dropped on and inks itself with text tokens, so it slots into a [Card](card.md), a table
body, or a bare page region without fighting the container's styling.

<!-- example:InCard -->
```tsx
<Card padding="r2">
  <EmptyState>
    <EmptyStateIcon>
      <FolderOpen size="1em" />
    </EmptyStateIcon>
    <EmptyStateTitle>This project has no files</EmptyStateTitle>
    <EmptyStateDescription>
      Upload a file or connect a repository to get started.
    </EmptyStateDescription>
    <EmptyStateActions>
      <Button type="button">Upload a file</Button>
    </EmptyStateActions>
  </EmptyState>
</Card>
```
<!-- /example -->

## Announcing a result

`EmptyState` carries no role and no live region of its own. When it replaces a list after
a search or filter, pass `role="status"` so the outcome is spoken rather than silently
swapped in.

<!-- example:Announced -->
```tsx
<EmptyState role="status" size="sm">
  <EmptyStateTitle>No results for “oklch”</EmptyStateTitle>
  <EmptyStateDescription>
    Check the spelling, or search for a broader term.
  </EmptyStateDescription>
</EmptyState>
```
<!-- /example -->

## Theme tokens

EmptyState paints in Tailwind utilities, each resolving to a contract variable. Override any
of these and the panel re-tints and re-scales with the rest of the app, at runtime, with no
rebuild — and because the utilities sit in `@layer utilities`, a `className` of your own
beats every one of them.

| Where            | Utility                                                     | Override                                                                                                        |
| ---------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Root padding     | `p-r5` (sm) · `p-r3` (md) · `p-r2` (lg)                     | `--R-SIZE-5` · `--R-SIZE-3` · `--R-SIZE-2`                                                                      |
| Root gap         | `gap-r6` (sm) · `gap-r5` (md) · `gap-r4` (lg)               | `--R-SIZE-6` · `--R-SIZE-5` · `--R-SIZE-4`                                                                      |
| Icon ink         | `text-fg-muted`                                             | `--C-TEXT-MUTED`                                                                                                |
| Icon type scale  | `text-h5` (sm) · `text-h4` (md) · `text-h3` (lg)            | `--H5` · `--H4` · `--H3` — the glyph is `1em` of it                                                             |
| Title ink        | `text-fg-primary`                                           | `--C-TEXT-PRIMARY`                                                                                              |
| Title weight     | `font-semibold`                                             | `--Semibold-Weight`                                                                                             |
| Title type       | `text-body-1` (sm) · `text-h5` (md) · `text-h4` (lg)        | `--BodyText-1` `--BodyText-1-line-height` (sm) · `--H5` `--H5-line-height` (md) · `--H4` `--H4-line-height` (lg) |
| Description ink  | `text-fg-muted`                                             | `--C-TEXT-MUTED`                                                                                                |
| Description type | `text-body-2`                                               | `--BodyText-2` `--BodyText-2-line-height`                                                                       |
| Actions gap      | `gap-r5`                                                    | `--R-SIZE-5`                                                                                                    |

The size axis is a **class map keyed off the `size` prop**, not a `[data-size]` selector.
`data-size` is still on the root as a marker you can select on, but nothing reads it back —
which is why an EmptyState nested inside another one keeps its own size rather than picking
up the outer one's.

One value is deliberately **not** on the contract: the description's measure —
`max-width: 22.5rem`, spelled `max-w-90` — is fixed at every size.

One rule survives in `EmptyState.css`, and it is the glyph sizing:
`.empty-state__icon svg { width: 1em; height: 1em }`. It has to stay in the component layer
because it styles an element **you** render. From `@layer utilities` the equivalent
(`[&_svg]:size-[1em]`) would out-rank a `size-*` class on your own icon; from
`@layer components` your class wins, which is the way round it has always been.

The panel sets no surface token of its own, so its ink is only as legible as the surface
you put it on. `--C-TEXT-MUTED` paints both the icon and the description, and against
`--C-SURFACE-0` it measures **4.95:1** in the default theme, 4.85:1 in `events`, 4.87:1
in `tech` and 5.23:1 in `grimdark` — clearing the 4.5:1 WCAG AA threshold for body text in
all four measured themes. These read 2.10–2.59 until `@batthewz/response-ui-css` **v0.10.1** retuned that token, so an older
copy of this page said the opposite.
Keep the sentence a user must act on in the title, which is `--C-TEXT-PRIMARY` and
measures 17.7:1 on the default theme's `--C-SURFACE-0`; or raise `--C-TEXT-MUTED` in your
own theme. Measured against the default theme and the worked examples; these numbers do not
transfer to your own theme — re-check them against your values. See the
[theme contract](../theme-contract.md).

## Gotchas

- **There is no `EmptyState.Icon`.** The module exports five siblings and never
  `Object.assign`s them onto the root, so dot access is a type error and, if you reach it
  through an `any`, a runtime "Element type is invalid" crash. Import each part by name.
- **Every sub-part throws outside the root.** `EmptyStateIcon`, `EmptyStateTitle`,
  `EmptyStateDescription` and `EmptyStateActions` all call the context hook and throw
  `"EmptyState compound components must be used within <EmptyState>"` when it is missing.
  Wrapping them in your own component is fine — context crosses any depth — but rendering
  one standalone takes down the tree rather than degrading.
- **The icon slot sizes the glyph, so the SVG's own `width`/`height` attributes lose to it.**
  `.empty-state__icon svg` is `1em` square — the same answer [ActivityFeed](activity-feed.md)
  and [Stepper](stepper.md) give their markers — because `font-size` alone moves nothing on
  an SVG carrying its own attributes, and `lucide-react` renders `width="24" height="24"` on
  every icon; a presentation attribute loses to any author rule whatever its layer. A caller
  who wants a different size puts a `size-*` utility on the icon they pass — `@layer utilities`
  beats this package's `@layer components` — or sets it inline, or changes the slot's
  `font-size`.
- **A Tailwind padding utility wins here, at every size.** `cn` cannot dedupe the pair —
  `empty-state` is not a Tailwind class — so `p-r1` and `empty-state` both land on the element,
  and the utility takes the padding: this package's stylesheet is in `@layer components`, which
  Tailwind orders below `@layer utilities`. It used to lose at every size, needing the important
  modifier (`p-r1!`), because the stylesheet was unlayered and out-ranked layered rules before
  specificity was consulted.
- **The description is capped at 22.5rem and centred**, at every size and in every
  container width, so long copy wraps to roughly 360px no matter how wide the panel is.
- **Client component.** `EmptyState.tsx` opens with `"use client"` because the root creates
  a context. It renders fine from a server component, but the whole module — all five
  parts — ships to the browser.

## Accessibility

- **The title is a `<p>` by default, not a heading.** A paragraph is right for a panel inside
  a page that already has an outline, and wrong when the empty state *is* the page's main
  content — a screen-reader user navigating by heading lands on nothing. Pass `as`:
  `<EmptyStateTitle as="h2">`, at the level the surrounding outline calls for. (`role="heading"
  aria-level={2}` still works through the prop spread, but a real element is better: it
  survives CSS-free rendering and needs no `aria-level` to be correct.)
- **The icon is hidden from assistive tech.** `EmptyStateIcon` sets `aria-hidden="true"` on
  its wrapper, which is right for a decorative glyph — the title carries the meaning. The
  attribute is written before the prop spread, so `aria-hidden={false}` from the call site
  wins if you genuinely need the contents announced.
- **Nothing is announced by default.** The root has no `role` and no `aria-live`. A blank
  state swapped in after a filter change is a silent DOM update for a screen-reader user
  unless you add `role="status"` yourself. Note that a live region inserted into the DOM at
  the same moment as its content is announced inconsistently across screen readers — keep
  the container mounted and swap its children if the announcement must be reliable.
- **Contrast.** The description and icon are `--C-TEXT-MUTED`, which since the
  `@batthewz/response-ui-css` v0.10.1 retune clears WCAG AA body text against every shipped
  theme's `--C-SURFACE-0` (see [Theme tokens](#theme-tokens)). It is still the contract's
  most-muted role, and a theme of your own may tune it back down — keep the sentence a user
  must act on in the title.
- **Actions are your components.** `EmptyStateActions` is an unlabelled `<div>` that adds no
  semantics — focus order, button `type`, and accessible names are whatever you render into
  it. A [Button](button.md#gotchas) brings its own `type="button"`; a raw `<button>` you render
  here does not, and inside a form that makes it a submit button.

## Related

[Card](card.md) · [Skeleton](skeleton.md) · [Alert](alert.md) · [Button](button.md) ·
[Table](table.md) · [Extending components](../extending.md) · [Theme contract](../theme-contract.md)
