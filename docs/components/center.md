# Center

A flex box that centres its children on both axes. Give it a region to fill — a height,
or the space it already occupies — and whatever you put inside sits dead centre, with no
`margin: auto` or one-off flex utilities at the call site.

<!-- example:Minimal -->
```tsx
<Center className="min-h-64">
  <p>Loading your dashboard…</p>
</Center>
```
<!-- /example -->

| Prop        | Type                  | Default |
| ----------- | --------------------- | ------- |
| `children`  | `ReactNode`           | —       |
| `className` | `string`              | —       |
| `ref`       | `Ref<HTMLDivElement>` | —       |
| …rest       | props of `div`        | —       |

Center takes no `variant`, `size`, or `as` — it is always a `<div>`, and everything it
does is `flex items-center justify-center`. It centres horizontally for free, but vertical
centring only shows up once the box has a height to centre into. See [Gotchas](#gotchas).

## Full-page centring

Add `min-h-screen` and Center fills the viewport — the usual home for a splash loader, an
auth screen, or a 404.

<!-- example:FullPage -->
```tsx
<Center className="min-h-screen">
  <p>404 — we couldn’t find that page.</p>
</Center>
```
<!-- /example -->

## Without a height

Center is `display: flex` with no intrinsic height, so left alone it collapses to its
content. You keep horizontal centring, but there is no vertical space to centre against —
the two look identical until the box is taller than what's inside it.

<!-- example:HorizontalOnly -->
```tsx
<Center>
  <p>Centred left-to-right, but not top-to-bottom.</p>
</Center>
```
<!-- /example -->

## Multiple children

Center is a flex **row**, not a stack. Drop several children in and they line up side by
side, centred as a group. To centre a column, give it one child — a [Stack](stack.md), or your own
wrapper.

<!-- example:MultipleChildren -->
```tsx
<Center className="min-h-64 gap-r3">
  <button>Cancel</button>
  <button>Confirm</button>
</Center>
```
<!-- /example -->

## Theme tokens

Center reads no contract variables. Its three utilities — `flex`, `items-center`, and
`justify-center` — are Tailwind core layout primitives that map to no `--C-*` or `--R-*`
token, so there is nothing here to re-theme: colour, type, and spacing all come from the
children you place inside, and the box's own size comes from the height you give it. This
is the one layout primitive a theme can't reach, by design — it only positions.

## Gotchas

- **Vertical centring needs a height.** With none of its own, Center shrinks to its
  content and `items-center` has nothing to work against. Give it `min-h-*`, `h-full`
  (inside a sized parent), or `min-h-screen` — see [Without a height](#without-a-height).
- **It's a flex row.** Multiple children sit side by side, not stacked. Wrap them in a
  single element (a [Stack](stack.md)) to centre a column — see [Multiple children](#multiple-children).
- **`className` wins over the defaults.** The merged `cn` lets a passed class override the
  base utilities — `className="items-start"` un-centres the cross axis, `flex-col` switches
  to a column. Handy, but it means a stray layout class silently changes the behaviour.
- **No per-component CSS.** There is no `Center.css`; it is styled entirely from utility
  classes. The package CSS import is still required so react-components' `@source` glob
  emits those classes into the consumer's Tailwind build.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Center is purely presentational — a plain `<div>` with no role, so it adds nothing to the
accessibility tree and imposes no keyboard behaviour. It only positions; the semantics are
entirely the children's. When the centred content is a landmark or list, render that
element directly inside rather than reaching for a `role` on the wrapper.

## Related

[Stack](stack.md) · [Row](row.md) · [Container](container.md) · [Spacer](spacer.md) · [Grid](grid.md) · [Divider](divider.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
