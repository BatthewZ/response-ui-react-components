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
| `columns`   | `number \| { base?; sm?; md?; lg?; xl? }` (1–6 per step) | `1`      |
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

Column counts are applied by internal `.rui-grid--{breakpoint}-{n}` classes that drive a
private `--rui-grid-columns` custom property. Those and the breakpoint widths are
structural — they track the design system's responsive scale but are not override points.

## Gotchas

- **1–6 columns only.** The CSS ships classes for counts 1 through 6 per breakpoint; a
  `columns` value outside that range emits a class with no matching rule and silently falls
  back to the `.rui-grid` default of 1 column.
- **Equal heights are the whole point.** Every cell stretches to its row's tallest — so
  card footers line up. If you need content-sized, uneven cells, use [Row](row.md) with wrap; for
  deliberately uneven heights (masonry), use [MasonryGrid](masonry-grid.md).
- **`gap` is a fixed step, not the responsive `r`-scale reflow.** It maps to `gap-r*`
  utilities; override the underlying `--R-SIZE-*` to retune globally.
- **Ships per-component CSS.** `Grid.css` must be loaded (it is, via the `styles` import),
  alongside `@batthewz/response-ui-css` for the spacing tokens.
- **Server-renderable.** No `"use client"` — it drops straight into an RSC tree.

## Accessibility

Grid is purely presentational — it sets `display: grid` and no roles. When the visual
order matters semantically, keep the DOM order meaningful (grid placement here follows
source order), and use `as` to render the right element — e.g. `as="ul"` with `<li>`
children for a genuine list.

## Related

[Row](row.md) · [Stack](stack.md) · [Container](container.md) · [MasonryGrid](masonry-grid.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
