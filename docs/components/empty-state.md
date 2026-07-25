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
| `EmptyStateTitle`       | `<p>`   | — (+ all `p` props)               |
| `EmptyStateDescription` | `<p>`   | — (+ all `p` props)               |
| `EmptyStateActions`     | `<div>` | — (+ all `div` props)             |

`size` is the only bespoke prop in the whole component, and it lives on the root only.

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

`size` moves the root's padding, the root's gap, and the title's type scale. It does
**not** touch the description (always `--BodyText-2`) or the actions row (always the same
gap), so the body copy stays put while the frame around it grows.

The icon steps **once**, at `sm` — `md` and `lg` give it the same type scale. And because
the icon slot sizes its contents with `font-size` alone, an SVG that carries its own
`width`/`height` attributes never changes size at all; see [Gotchas](#gotchas).

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

EmptyState uses **no Tailwind utilities** — its `.tsx` only composes the `empty-state`
BEM classes, and every value below is a `var(--…)` read directly in `EmptyState.css`.
Override any of these and the panel re-tints and re-scales with the rest of the app, at
runtime, with no rebuild.

| Where             | Override                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Root padding      | `--R-SIZE-5` (sm) · `--R-SIZE-3` (md) · `--R-SIZE-2` (lg)                                            |
| Root gap          | `--R-SIZE-6` (sm) · `--R-SIZE-5` (md) · `--R-SIZE-4` (lg)                                            |
| Icon ink          | `--C-TEXT-MUTED`                                                                                     |
| Icon type scale   | `--H5` (sm) · `--H4` (md and lg)                                                                     |
| Title ink         | `--C-TEXT-PRIMARY`                                                                                   |
| Title weight      | `--Semibold-Weight`                                                                                  |
| Title type        | `--BodyText-1` `--BodyText-1-line-height` (sm) · `--H5` `--H5-line-height` (md) · `--H4` `--H4-line-height` (lg) |
| Description ink   | `--C-TEXT-MUTED`                                                                                     |
| Description type  | `--BodyText-2` `--BodyText-2-line-height`                                                            |
| Actions gap       | `--R-SIZE-5`                                                                                         |

One value is deliberately **not** on the contract: the description's measure —
`max-width: 22.5rem` — is a hard literal in `EmptyState.css`, fixed at every size.

The panel sets no surface token of its own, so its ink is only as legible as the surface
you put it on. `--C-TEXT-MUTED` paints both the icon and the description, and against
`--C-SURFACE-0` it measures **2.54:1** in the default theme, 2.45:1 in `events`, 2.10:1
in `tech` and 2.59:1 in `grimdark` — all below the 4.5:1 WCAG AA threshold for body text.
Keep the sentence a user must act on in the title, which is `--C-TEXT-PRIMARY` and
measures 17.7:1 on the default theme's `--C-SURFACE-0`; or raise `--C-TEXT-MUTED` in your
own theme. See the [theme contract](../theme-contract.md).

## Gotchas

- **There is no `EmptyState.Icon`.** The module exports five siblings and never
  `Object.assign`s them onto the root, so dot access is a type error and, if you reach it
  through an `any`, a runtime "Element type is invalid" crash. Import each part by name.
- **Every sub-part throws outside the root.** `EmptyStateIcon`, `EmptyStateTitle`,
  `EmptyStateDescription` and `EmptyStateActions` all call the context hook and throw
  `"EmptyState compound components must be used within <EmptyState>"` when it is missing.
  Wrapping them in your own component is fine — context crosses any depth — but rendering
  one standalone takes down the tree rather than degrading.
- **A fixed-size SVG ignores `size`.** `.empty-state__icon` sizes its contents with
  `font-size` and sets no `width`/`height`. `lucide-react`, this package's own icon
  dependency, renders `width="24" height="24"` **attributes**, so a bare `<Inbox />` stays
  24px in all three sizes. Pass `size="1em"` (as every example here does), or size the
  glyph yourself. Sibling components solve this in CSS — [ActivityFeed](activity-feed.md)
  and [Stepper](stepper.md) both write an explicit `width`/`height` rule for a descendant
  `svg`; EmptyState does not.
- **`md` and `lg` size the icon identically.** Both set `font-size: var(--H4)`, so even an
  em-sized glyph only grows once, going from `sm` to `md`. Padding, gap and the title all
  step at `lg`; the icon does not.
- **A Tailwind padding utility never wins here, at any size.** `cn` cannot dedupe the pair —
  `empty-state` is not a Tailwind class — so `p-r1` and `empty-state` both land on the
  element. This package's stylesheet declares no cascade layer while Tailwind v4 puts
  utilities in `@layer utilities`, and unlayered author rules outrank layered ones outright,
  before specificity is ever consulted. So the component's padding wins at `md` (plain
  `.empty-state`) exactly as it does at `sm` and `lg`. Override it with the important
  modifier (`p-r1!`), or with your own unlayered rule on `.empty-state`.
- **The description is capped at 22.5rem and centred**, at every size and in every
  container width, so long copy wraps to roughly 360px no matter how wide the panel is.
- **Client component.** `EmptyState.tsx` opens with `"use client"` because the root creates
  a context. It renders fine from a server component, but the whole module — all five
  parts — ships to the browser.

## Accessibility

- **The title is a `<p>`, not a heading.** `EmptyStateTitle` renders a paragraph with no
  heading role, so a screen-reader user navigating by heading will not land on it. When the
  empty state replaces a page's or region's main content, restore the outline through the
  pass-through props: `<EmptyStateTitle role="heading" aria-level={2}>`.
- **The icon is hidden from assistive tech.** `EmptyStateIcon` sets `aria-hidden="true"` on
  its wrapper, which is right for a decorative glyph — the title carries the meaning. The
  attribute is written before the prop spread, so `aria-hidden={false}` from the call site
  wins if you genuinely need the contents announced.
- **Nothing is announced by default.** The root has no `role` and no `aria-live`. A blank
  state swapped in after a filter change is a silent DOM update for a screen-reader user
  unless you add `role="status"` yourself. Note that a live region inserted into the DOM at
  the same moment as its content is announced inconsistently across screen readers — keep
  the container mounted and swap its children if the announcement must be reliable.
- **Contrast.** The description and icon are `--C-TEXT-MUTED`, which fails WCAG AA against
  every theme's `--C-SURFACE-0` (see [Theme tokens](#theme-tokens)). Do not put the only
  copy of an instruction there.
- **Actions are your components.** `EmptyStateActions` is an unlabelled `<div>` that adds no
  semantics — focus order, button `type`, and accessible names are whatever you render into
  it. A [Button](button.md#gotchas) brings its own `type="button"`; a raw `<button>` you render
  here does not, and inside a form that makes it a submit button.

## Related

[Card](card.md) · [Skeleton](skeleton.md) · [Alert](alert.md) · [Button](button.md) ·
[Table](table.md) · [Extending components](../extending.md) · [Theme contract](../theme-contract.md)
