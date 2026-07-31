# Grid

An equal-column responsive grid: every cell in a row shares the row's height, and columns
are `minmax(0, 1fr)` so content wraps instead of overflowing. Reach for it when you want
tidy, aligned tiles — dashboards, card decks, feature rows.

<!-- example:Minimal -->
```tsx
<Grid columns={3} gap="r4">
  <Card>Revenue</Card>
  <Card>Active users</Card>
  <Card>Churn</Card>
</Grid>
```
<!-- /example -->

| Prop        | Type                                                    | Default  |
| ----------- | ------------------------------------------------------- | -------- |
| `columns`   | `1 \| 2 \| 3 \| 4 \| 5 \| 6`, or `{ base?, sm?, md?, lg?, xl? }` of the same | `1`      |
| `gap`       | `"r1" \| "r2" \| "r3" \| "r4" \| "r5" \| "r6"`           | `"r4"`   |
| `as`        | `ElementType`                                           | `"div"`  |
| `className` | `string`                                                | —        |
| `ref`       | `Ref<HTMLElement>`                                      | —        |
| …rest       | props of `as`                                           | —        |

## Responsive columns

`columns` takes a single count, or per-breakpoint counts that step up mobile-first. The
breakpoints are `sm` 40rem · `md` 48rem · `lg` 64rem · `xl` 80rem; each holds until the
next one overrides it.

<!-- example:ResponsiveColumns -->
```tsx
<Grid columns={{ base: 1, md: 2, lg: 3 }} gap="r5">
  <Card>One</Card>
  <Card>Two</Card>
  <Card>Three</Card>
  <Card>Four</Card>
  <Card>Five</Card>
  <Card>Six</Card>
</Grid>
```
<!-- /example -->

## Gap

<!-- example:Gap -->
```tsx
<Grid columns={2} gap="r6">
  <Card>One token…</Card>
  <Card>…controls both axes.</Card>
</Grid>
```
<!-- /example -->

## Render as something else

<!-- example:AsList -->
```tsx
<Grid as="ul" columns={{ base: 2, md: 4 }} gap="r3">
  <li>Alpha</li>
  <li>Bravo</li>
  <li>Charlie</li>
  <li>Delta</li>
</Grid>
```
<!-- /example -->

## Theme tokens

Grid's structure — column count and equal heights — is layout, not theme, so it exposes no
colour tokens. The one themeable dimension is the gap, which reads the spacing scale.

| Where            | Utility / CSS                          | Override                     |
| ---------------- | -------------------------------------- | ---------------------------- |
| Column & row gap | `gap-r1` … `gap-r6` (via the `gap` prop) | `--R-SIZE-1` … `--R-SIZE-6` |
| Column count     | `grid-cols-1` … `xl:grid-cols-6` (via `columns`) | pass a `grid-cols-*` utility in `className` — one step at a time, see [Gotchas](#gotchas) |

`Grid` ships **no stylesheet**. `columns` resolves to Tailwind's own `grid-cols-*` utilities —
`repeat(n, minmax(0, 1fr))`, the same declaration the deleted `Grid.css` wrote — and the root
carries `grid items-stretch` for the other two. `rui-grid` is still on the element, but as a
declaration-free marker: it is there for your own stylesheet, for devtools, and so consumers of
`@batthewz/response-ui-css` outside React have the same name to target. The breakpoint widths
are Tailwind's `sm`/`md`/`lg`/`xl` and are structural, not override points.

## Gotchas

- **1–6 columns only, and the type says so.** `columns` is `1 | 2 | 3 | 4 | 5 | 6` at every
  breakpoint, so `columns={7}` is a compile error. It used to be typed `number`: the class it
  emitted matched no rule and the grid silently fell back to a single column, with no error at
  compile time or runtime. For a wider grid, pass the utility yourself —
  `className="grid-cols-8"`.
- **A `grid-cols-*` in `className` replaces the step it names, not all of them.** `columns` now
  emits one utility per breakpoint, and `cn()` dedupes per variant. So
  `<Grid columns={{ base: 1, md: 3 }} className="grid-cols-2" />` is two columns below `48rem`
  and three above it. To override every step, name every step
  (`className="grid-cols-2 md:grid-cols-2"`).
- **Leaving `base` out still means one column.** `columns={{ md: 3 }}` emits
  `grid-cols-1 md:grid-cols-3`, so the grid is a single full-width column below `48rem` —
  the same as writing `{ base: 1, md: 3 }`. The base step is never omitted, because a grid
  with no column track at all sizes its implicit column to its widest content and a long
  unbreakable word then pushes the grid past its container instead of wrapping.
- **Equal heights are the whole point.** Every cell stretches to its row's tallest — so
  card footers line up. If you need content-sized, uneven cells, use [Row](row.md) with wrap; for
  deliberately uneven heights (masonry), use [MasonryGrid](masonry-grid.md).
- **One `gap` step for every breakpoint.** Unlike `columns`, `gap` takes no per-breakpoint
  map — the chosen step applies at all widths. The step's *value* is still responsive:
  `gap-r*` reads `--R-SIZE-*`, which grows at the 40rem step-up (`r6` excepted). Override
  the underlying `--R-SIZE-*` to retune globally.
- **Ships no per-component CSS.** `Grid.css` is deleted; every declaration it carried is a
  Tailwind utility on the root. You still need `@batthewz/response-ui-css` for the spacing
  tokens, and Tailwind v4 to generate the utilities — which this package already requires.
- **Server-renderable.** No `"use client"` — it drops straight into an RSC tree.

## Accessibility

Grid is purely presentational — it sets `display: grid` and no roles. When the visual
order matters semantically, keep the DOM order meaningful (grid placement here follows
source order), and use `as` to render the right element — e.g. `as="ul"` with `<li>`
children for a genuine list.

## Related

[Row](row.md) · [Stack](stack.md) · [Container](container.md) · [MasonryGrid](masonry-grid.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
