# Spacer

A blank flex child that grows to fill the free space in a row or column, pushing its
siblings to the far ends. Reach for it instead of a `margin-left: auto` or a hand-tuned
gap when you want two clusters shoved apart — one `<Spacer />` between them and the
layout does the arithmetic.

<!-- example:Minimal -->
```tsx
<div className="flex items-center">
  <strong>Inbox</strong>
  <Spacer />
  <button>Archive</button>
  <button>Compose</button>
</div>
```
<!-- /example -->

Spacer adds no props of its own — it is a `<div>` that always carries `flex-1`, and every
`div` prop passes straight through.

| Prop        | Type                    | Default |
| ----------- | ----------------------- | ------- |
| `className` | `string`                | —       |
| `ref`       | `Ref<HTMLDivElement>`   | —       |
| …rest       | props of `div`          | —       |

## Center between two ends

A single Spacer pushes one way; two make two equal gaps. Because each Spacer's flex-basis
is `0`, the free space is shared evenly, so an item between two of them ends up centred.

<!-- example:Centered -->
```tsx
<div className="flex items-center">
  <button>Back</button>
  <Spacer />
  <strong>Account settings</strong>
  <Spacer />
  <button>Save</button>
</div>
```
<!-- /example -->

## Vertical

The same primitive works down a column — the growth axis is whatever the parent's
`flex-direction` is. In a `flex-col` container the Spacer grows vertically and pins the
last child to the bottom, but only if the parent has a height to give away.

<!-- example:Vertical -->
```tsx
<div className="flex flex-col h-64">
  <strong>Storage</strong>
  <p>8.2 GB of 15 GB used</p>
  <Spacer />
  <button>Upgrade plan</button>
</div>
```
<!-- /example -->

## Theme tokens

Spacer reads no theme tokens. Its only class is `flex-1` — pure flexbox
(`flex: 1 1 0%`), which grows the element along the parent's main axis and is independent
of any colour, spacing, or radius variable. There is nothing here to override: the size a
Spacer takes is decided entirely by the free space in its flex parent, not by the design
system. It never needs re-tinting because it draws nothing.

## Gotchas

- **It does nothing outside a flex parent.** `flex-1` is the flex shorthand
  (`flex-grow`/`flex-shrink`/`flex-basis`), so only a flex *item* obeys it — a grid item
  ignores it entirely. In a plain block the div just lays out as a normal empty block
  (full-width, zero height) and pushes no one. Put it inside a [Row](row.md), a [Stack](stack.md), or any
  `display: flex` container. To distribute space in a `display: grid`, reach for a `1fr`
  track or a column span instead — not a Spacer.
- **The growth axis follows the parent, not the Spacer.** Horizontal in a row, vertical in
  a column. A vertical Spacer is invisible unless the parent has a fixed or stretched
  height to distribute — see [Vertical](#vertical).
- **Every `flex-1` sibling shares the space equally.** With flex-basis `0`, two Spacers make
  two *equal* gaps and won't weight themselves to their neighbours' content. If you need an
  uneven split, override the grow factor on one Spacer via `className` (e.g. `grow-[2]`).
- **A conflicting `className` still wins, but by two different routes.** `flex-1` is passed
  first into `cn`. A same-group `flex` utility — `flex-none`, `flex-auto` — makes `cn`
  drop `flex-1` outright, so only your class survives (`cn("flex-1", "flex-none")` →
  `"flex-none"`). A `grow-*` or `shrink-*` utility is a *separate* tailwind-merge group, so
  `cn` keeps both (`cn("flex-1", "grow-0")` → `"flex-1 grow-0"`); yours wins only because
  Tailwind emits `grow-0` after `flex-1` in the stylesheet (CSS source order), not because
  anything was merged away. Convenient for one-offs, surprising if it was unintended.
- **No per-component CSS.** There is no `Spacer.css`; `flex-1` is plain Tailwind core, not a
  token. The `@batthewz/response-ui-css` import is still required — react-components' own
  `styles.css` registers `@source "../src/**/*.{ts,tsx}"`, which is what makes Tailwind emit
  Spacer's `flex-1` class in the consumer's build.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Spacer renders an empty `<div>` with no role and no content, so assistive tech skips it
entirely — the correct behaviour for a purely decorative gap. It never announces, never
takes focus, and does not change the reading order: only the *visual* position of its
siblings shifts, while the DOM order that a screen reader follows stays exactly as written.

Keep it empty. It is a spacer, not a container — content that needs to be read belongs in a
real element, and the surrounding gap belongs on the parent's own layout.

## Related

[Row](row.md) · [Stack](stack.md) · [Container](container.md) · [Center](center.md) · [Divider](divider.md) · [Grid](grid.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
