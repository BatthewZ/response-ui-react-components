# VirtualizedDataTable

A data table that windows its rows, so a 50,000-row dataset scrolls continuously while only
the visible slice — plus a small overscan — is ever mounted in the DOM. Same generic
`ColumnDef<T>` contract and sort logic as [DataTable](data-table.md); reach for this one when the answer to
"how many rows?" is "too many to paginate".

<!-- example:Minimal -->
```tsx
<VirtualizedDataTable
  data={invoices}
  columns={[
    { key: "reference", header: "Reference", width: 160 },
    { key: "customer", header: "Customer" },
    { key: "amount", header: "Amount", align: "right", width: 120 },
  ]}
  rowKey={(invoice) => invoice.id}
  rowHeight={44}
  height={480}
/>
```
<!-- /example -->

Throughout this page, `invoices` is an `Invoice[]` — 50,000 of them — and `Invoice` is your own
row type (`{ id, reference, customer, amount, status, issuedAt }`). The component is generic in
`T`, and `T` is inferred from `data`, so `rowKey` and every column's `render` are typed against
your row with no annotation.

| Prop                  | Type                                                                     | Default                  |
| --------------------- | ------------------------------------------------------------------------ | ------------------------ |
| `data`                | `T[]`                                                                    | — (required)             |
| `columns`             | `ColumnDef<T>[]`                                                         | — (required)             |
| `rowKey`              | `(row: T, index: number) => string \| number`                            | — (required)             |
| `rowHeight`           | `number` — pixels, every row, no exceptions                              | — (required)             |
| `height`              | `number \| string` — the scroll viewport                                 | `400`                    |
| `overscan`            | `number` — extra rows rendered above and below the window                | `8`                      |
| `sort`                | `SortState \| null`                                                      | — (uncontrolled)         |
| `defaultSort`         | `SortState \| null`                                                      | —                        |
| `onSortChange`        | `(sort: SortState \| null) => void`                                      | —                        |
| `sortComparator`      | `(a: T, b: T, columnKey: string, direction: "asc" \| "desc") => number`  | built-in comparator      |
| `selectable`          | `boolean`                                                                | `false`                  |
| `selectedKeys`        | `Set<string \| number>`                                                  | —                        |
| `onSelectionChange`   | `(keys: Set<string \| number>) => void`                                  | —                        |
| `onEndReached`        | `() => void`                                                             | —                        |
| `endReachedThreshold` | `number` — rows from the end that arm `onEndReached`                     | `8`                      |
| `density`             | `"dense" \| "comfortable" \| "spacious"`                                 | `"comfortable"`          |
| `striped`             | `boolean`                                                                | `false`                  |
| `stickyHeader`        | `boolean`                                                                | `true`                   |
| `loading`             | `boolean`                                                                | `false`                  |
| `loadingRowCount`     | `number`                                                                 | `5`                      |
| `emptyContent`        | `ReactNode`                                                              | built-in "No data" state |

That is the **whole** surface. `VirtualizedDataTableProps<T>` is a plain object type with no
`ComponentProps` intersection and no rest spread, so there is no `className`, no `style`, no
`ref`, no `id` and no `data-*` — none of them compile, and none of them would land anywhere if
they did. `SortState` is `{ key: string; direction: "asc" | "desc" }` — an *active* sort, never
nullable itself; the two sort props widen it to `SortState | null` because "sorted by nothing"
is `null`. It is exported under that name from the package barrel as of 0.9.0, so annotate
your own state `useState<SortState | null>(null)` with an ordinary top-level import.
(`VirtualizedDataTableProps<Invoice>["sort"]` is the same type and still works — it was the
workaround while `SortState` was missing.)

`stickyHeader` defaults to **`true`** here (the [Table](table.md) primitive underneath defaults it to
`false`) — a header that scrolls away is not much use on a list this long.

## Columns

| Field      | Type                                     | What it does                                                                     |
| ---------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `key`      | `string`                                 | Required. Also the property read off each row when there is no `render`.          |
| `header`   | `ReactNode`                              | Required. The `<th>` contents.                                                    |
| `render`   | `(row: T, index: number) => ReactNode`   | Takes over the cell entirely. `index` is the row's position in the sorted data.   |
| `sortable` | `boolean`                                | Makes the header clickable and gives it `aria-sort`.                              |
| `width`    | `string \| number`                       | Written to the `<th>`'s inline `width`. Body cells get no width.                  |
| `align`    | `"left" \| "center" \| "right"`          | Inline `text-align` on the header **and** every body cell in that column.         |

Without `render`, a cell is stringified: strings pass through, numbers and booleans go through
`String()`, a `Date` becomes `toLocaleString()`, and **everything else — objects, arrays — comes
out as an empty string.** Nested data needs a `render`.

<!-- example:CustomCells -->
```tsx
<VirtualizedDataTable
  data={invoices}
  columns={[
    { key: "reference", header: "Reference", width: 160 },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      width: 120,
      render: (invoice) =>
        invoice.amount.toLocaleString("en-GB", { style: "currency", currency: "GBP" }),
    },
    {
      key: "status",
      header: "Status",
      width: 120,
      render: (invoice) => (
        <Badge variant={invoice.status === "overdue" ? "error" : "success"}>
          {invoice.status}
        </Badge>
      ),
    },
  ]}
  rowKey={(invoice) => invoice.id}
  rowHeight={44}
  height={480}
/>
```
<!-- /example -->

## Fixed row height

`rowHeight` is not a hint. The scroll offset is divided by it to pick the window, and the
spacer rows above and below the window are sized as `startIndex * rowHeight` and
`(count - endIndex) * rowHeight` — so the whole illusion rests on every row actually being that
tall. `height` on a `<tr>` is a *minimum* in CSS table layout, and nothing truncates your cell
content, so a row whose content does not fit simply grows and the arithmetic stops matching the
pixels (see [Gotchas](#gotchas)).

Budget for the density you picked. Cell padding is `0.25rem` top and bottom at `dense`,
`0.625rem` at `comfortable`, `1rem` at `spacious` — double that, add a line of text, and round
up:

<!-- example:DenseRows -->
```tsx
<VirtualizedDataTable
  data={invoices}
  columns={[
    { key: "reference", header: "Reference", width: 160 },
    { key: "customer", header: "Customer" },
  ]}
  rowKey={(invoice) => invoice.id}
  rowHeight={32}
  height={480}
  density="dense"
/>
```
<!-- /example -->

## Sorting

Identical contract to [DataTable](data-table.md). Left alone, sorting is uncontrolled and the component sorts
**the whole dataset** — not the visible window — with a comparator that understands numbers,
booleans, `Date`s and strings (via `localeCompare`), and always sorts nullish values last
regardless of direction. Clicking a header cycles `none → asc → desc → none`; clicking a
different column restarts at `asc`.

<!-- example:ClientSorting -->
```tsx
<VirtualizedDataTable
  data={invoices}
  columns={[
    { key: "reference", header: "Reference", width: 160, sortable: true },
    { key: "customer", header: "Customer", sortable: true },
    { key: "amount", header: "Amount", align: "right", width: 120, sortable: true },
  ]}
  rowKey={(invoice) => invoice.id}
  rowHeight={44}
  height={480}
  defaultSort={{ key: "amount", direction: "desc" }}
/>
```
<!-- /example -->

Pass `sort` on the first render — `null` counts — and the component flips to display-only: it
renders `data` in the order you gave it and never reorders, on the assumption that your server
did. `defaultSort` is ignored in that mode. Below, `sort` and `setSort` are a
`useState<SortState>({ key: "issuedAt", direction: "desc" })` in your own component, because
this particular server always sorts by something.

<!-- example:ServerSorting -->
```tsx
<VirtualizedDataTable
  data={invoices}
  columns={[
    { key: "reference", header: "Reference", width: 160, sortable: true },
    { key: "customer", header: "Customer", sortable: true },
    { key: "issuedAt", header: "Issued", width: 200, sortable: true },
  ]}
  rowKey={(invoice) => invoice.id}
  rowHeight={44}
  height={480}
  sort={sort}
  onSortChange={(next) => setSort(next ?? { key: "issuedAt", direction: "desc" })}
/>
```
<!-- /example -->

The `next ?? …` in that handler is a product decision, not a type constraint. `onSortChange`
reports the third state of the cycle as `null` and `sort` accepts that `null` back, so
`useState<SortState | null>(null)` with `onSortChange={setSort}` is just as valid and stays
controlled through the clear. Coalesce, as here, when the list must always be sorted by
*something*; round-trip the `null` when "unsorted" is an order your server understands.

For a client-sorted table over a shape the default comparator can't order — a status column with
a bespoke priority, say — pass `sortComparator`; it receives `(a, b, columnKey, direction)` and
owns the direction flip itself.

## Selection

`selectable` adds a leading checkbox column. Selection is **always controlled**: hold a
`Set<string | number>` of row keys and pass `selectedKeys` plus `onSelectionChange`. The
component never mutates your Set — both handlers return a new one. In the example, `selected`
and `setSelected` are a `useState<Set<string | number>>(new Set())`.

<!-- example:RowSelection -->
```tsx
<VirtualizedDataTable
  data={invoices}
  columns={[
    { key: "reference", header: "Reference", width: 160 },
    { key: "customer", header: "Customer" },
    { key: "amount", header: "Amount", align: "right", width: 120 },
  ]}
  rowKey={(invoice) => invoice.id}
  rowHeight={44}
  height={480}
  selectable
  selectedKeys={selected}
  onSelectionChange={setSelected}
/>
```
<!-- /example -->

The header checkbox is the difference from [DataTable](data-table.md). There, select-all covers the current
page slice; here there are no pages, so it toggles **every row in `data`** — 50,000 keys into
your Set from one click. It shows the native indeterminate state when some but not all rows are selected.

## Infinite loading

The natural pairing for a windowed list. `onEndReached` fires once when the rendered window
reaches within `endReachedThreshold` rows of the end, and re-arms as soon as the window moves
away — so appending rows to `data` is enough to make it fire again on the next approach.

<!-- example:InfiniteScroll -->
```tsx
<VirtualizedDataTable
  data={invoices}
  columns={[
    { key: "reference", header: "Reference", width: 160 },
    { key: "customer", header: "Customer" },
  ]}
  rowKey={(invoice) => invoice.id}
  rowHeight={44}
  height={480}
  onEndReached={loadNextPage}
  endReachedThreshold={20}
/>
```
<!-- /example -->

`loadNextPage` is yours: fetch the next page and append it to the array you pass as `data`. Keep
`sort` controlled when the server is the thing doing the sorting, or client-side sorting will
reorder the partial dataset you have so far and fight the server's ordering.

There is no pagination here and no `footer` slot — if you want page controls instead of
continuous scroll, use [DataTable](data-table.md), which has both and renders [Pagination](pagination.md)
itself.

## Loading and empty states

Both replace the body wholesale and are **not** virtualized. The scroll viewport is dropped —
neither branch passes `height` or the `overflow-y` class to [Table](table.md), so the wrapper falls back
to content height and `stickyHeader` (still `true`) has nothing to pin against. `striped` is
forced off.

The **header is the same one the loaded table draws** — one `renderHeader()` serves all three
branches as of 0.9.0, so the sort affordances, the column `align` and a live select-all
checkbox are all present while loading or empty, where the second, sort-less copy they used to
get dropped every one of them. See [Gotchas](#gotchas): live means operable, and select-all
in the loading branch acts on whatever is still in `data`.

<!-- example:Loading -->
```tsx
<VirtualizedDataTable
  data={invoices}
  columns={[
    { key: "reference", header: "Reference", width: 160 },
    { key: "customer", header: "Customer" },
  ]}
  rowKey={(invoice) => invoice.id}
  rowHeight={44}
  height={480}
  loading
  loadingRowCount={8}
/>
```
<!-- /example -->

`loading` wins over everything, including a non-empty `data`. The empty branch triggers on
`data.length === 0` and puts `emptyContent` in a single cell spanning every column:

<!-- example:CustomEmptyState -->
```tsx
<VirtualizedDataTable<Invoice>
  data={[]}
  columns={[
    { key: "reference", header: "Reference", width: 160 },
    { key: "customer", header: "Customer" },
  ]}
  rowKey={(invoice) => invoice.id}
  rowHeight={44}
  height={480}
  emptyContent={
    <EmptyState size="md">
      <EmptyStateTitle>No invoices this quarter</EmptyStateTitle>
      <EmptyStateDescription>Invoices appear here once a job is billed.</EmptyStateDescription>
    </EmptyState>
  }
/>
```
<!-- /example -->

Omit `emptyContent` and you get a built-in [EmptyState](empty-state.md) reading "No data /
There are no items to display."

## Theme tokens

VirtualizedDataTable reads **no theme variables of its own**. `VirtualizedDataTable.css` is two
rules of pure layout: `overflow-y: auto` on the scroll container, and `padding: 0; border: 0` on
the spacer rows so they contribute nothing but height. There is no colour, radius or type token
in it, and the `.tsx` uses no Tailwind utility that resolves to one — its only utility is a
`w-10` fixed width on the checkbox header cell.

Everything you can see is painted by the components it renders through, so there is no
per-component variable to reach for and any override you make re-tints those components
everywhere else too:

- **The table itself** — `Table.css`. The wrapper takes a 1px `--C-BORDER-DEFAULT` border and
  `--RADIUS-MD` corners; the table fills `--C-SURFACE-0`; the head fills `--C-SURFACE-1` under a
  2px `--C-BORDER-DEFAULT` rule and, when sticky, casts `--SHADOW-SM` from each header cell.
  Header and body text ink `--C-TEXT-PRIMARY`, and cell type is `--BodyText-2` at `dense`,
  `--BodyText-1` otherwise. Rows are separated by 1px of `--C-BORDER-DEFAULT`; a striped row
  fills `--C-SURFACE-1` and a selected row an 8% `--C-ACCENT` wash. A sortable header hovers to
  `--C-SURFACE-2`, presses to `--C-SURFACE-3`, focuses with a 2px inset `--C-BORDER-FOCUS`
  outline over `--MOTION-DURATION-SHIFT`/`--MOTION-EASE-SHIFT` (dropped under
  `prefers-reduced-motion`), and its sort glyph is `--C-TEXT-MUTED` when inactive,
  `--C-ACCENT` when it is the active sort.
- **The selection checkboxes** — [Checkbox](checkbox.md)'s own utilities:
  `--C-BORDER-STRONG` border, `--RADIUS-SM` corners, `--C-ACCENT` as the native `accent-color`,
  and a `--C-BORDER-FOCUS` focus ring.
- **The loading and empty branches** — [Skeleton](skeleton.md) and
  [EmptyState](empty-state.md) respectively, each with its own tokens.

The two numbers this component owns are `rowHeight` and `height`, and both are written as inline
styles straight from your props — deliberately outside the token system, because the
virtualization maths has to agree with them exactly. See the
[theme contract](../theme-contract.md) for the variables named above.

## Gotchas

- **`striped` bands the dataset, not the window.** The band comes from each row's absolute
  index, so it is a property of the row and survives scrolling: row 7 is banded at every
  scroll position, and the spacer `<tr>`s the virtualiser emits above and below the window
  carry no band and shift nobody else's. This used to be `nth-child(even)` counted inside the
  `<tbody>`, where the top spacer was child 1 whenever the window had scrolled off the top —
  measured on a 1,000-row table, the entire zebra inverted on every row scrolled.
- **Nothing enforces `rowHeight`.** No cell truncation, no `overflow: hidden`, no dev warning. A
  row whose content exceeds the number renders taller, but the spacers are still computed from
  the number — so the scroll height and the real content height diverge, the scrollbar drifts,
  and rows enter or leave the window at the wrong offset. Clamp your own cell content, or raise
  `rowHeight` until the tallest cell fits.
- **`rowKey` is called for every row in `data`, even when `selectable` is `false`.** The
  select-all state is derived from a map over the whole dataset that nothing gates on selection.
  Measured: rendering 100,000 rows with `selectable={false}` invoked `rowKey` 100,068 times. It
  is memoized on `[sortedData, rowKey]`, so it does not recompute while you scroll — but an
  inline `rowKey={(r) => r.id}` is a new function every render, so a parent re-render costs
  another full pass (measured 50,068 → 100,084 on a 50,000-row table). Define `rowKey` once
  outside the component.
- **`selectable` alone renders checkboxes that do nothing.** Without both `selectedKeys` and
  `onSelectionChange`, the handlers return early: measured, the select-all box renders unchecked
  and *not* disabled, and clicking it changes nothing and calls nothing. The three props are a
  set; the type does not say so.
- **Controlled `sort` is round-trippable.** `sort` and `defaultSort` accept
  `SortState | null`, so the `null` that `onSortChange` emits can be passed straight back to
  clear the sort. The mode is decided on the first render and then locked, so a later
  `undefined` no longer flips a controlled table to uncontrolled — the legacy
  `sort={sort ?? undefined}` idiom stays controlled too. What still matters is the *first*
  render, and it matters in both directions. Mount with `sort` defined — `null` counts — and
  the table is display-only for its whole life: it never reorders rows, so a server that
  ignores `onSortChange` leaves the order exactly as given. Mount with `sort={undefined}` and
  the table is uncontrolled for its whole life, sorting the dataset itself however the prop
  arrives afterwards. Pass `sort={sort}` from the first render, or remount with a `key` to
  re-decide.
- **`onEndReached` can fire before the user scrolls.** It fires whenever the *rendered* window
  reaches the threshold, which on mount it already does if the dataset is short or the viewport
  is tall — the component's own test asserts this for 20 rows. It also fires from the `loading`
  branch (measured: one call on a mount with `loading` and 10 rows). Make your loader idempotent
  and guard it on your own in-flight flag.
- **A string `height` shrinks the first paint.** The window is seeded from `height` only when it
  is a number; a `"60vh"` or `"100%"` seeds `0` instead, and the browser corrects it on the first
  measurement. Measured server-side: `height={400}` renders 26 rows, `height="60vh"` renders 16
  (`overscan * 2`) — so with a string height an SSR'd or pre-hydration table is visibly short.
  Pass a number when you can.
- **Column widths are negotiated from the mounted rows only.** The table has no
  `table-layout: fixed`, and `width` from a `ColumnDef` reaches the `<th>` but not the body
  cells, so an unusually wide value scrolling into the window can re-measure the columns
  mid-scroll. Setting `width` on every column pins the preferred widths and is the closest this
  gets to stable — content wider than the value can still push a column out.
- **The loading header is fully live, and select-all there acts on stale rows.** All three
  branches now share one header, so the sort affordances and the select-all checkbox no longer
  vanish while `loading` is true — but they are operable, not decorative. Select-all is derived
  from a map over the whole of `data` (this table has no pages), so clicking it mid-refetch,
  while the old array is still in `data`, selects every key the user is about to stop seeing.
  Clear `data` alongside `loading`, or hide your selection UI while a fetch is in flight —
  and note `onEndReached` fires from the loading branch too. A test asserting the old
  stripped header (no `aria-sort`, no `textAlign`, an empty select-all cell) now fails.
- **No escape hatch on the root.** No `className`, `style`, `id`, `ref`, `aria-*` or `data-*`
  prop exists, so a test hook or an accessible name has to go on a wrapper element of your own.
- **It's a client component.** `"use client"`, and so is the `useVirtualRows` hook behind it —
  it measures the scroll container in an effect. It renders on the server, but the first window
  comes from the `height` estimate, not a measurement.

## Accessibility

It is a real `<table>` with a real `<thead>`/`<tbody>`, and the spacer rows carry `aria-hidden`,
so nothing fake leaks into the accessibility tree. What is missing is the part that tells
assistive tech the table is windowed at all.

- **The row count is the window's, not the dataset's.** No `aria-rowcount` and no `aria-rowindex`
  are set, and the table gets no `role="grid"`. Measured on a 1,000-row dataset: `aria-rowcount`
  is `null`, and the `<tbody>` held 17 `<tr>` elements. A screen reader therefore announces a
  table the size of the *window*, whose contents change as it scrolls, with no way to say "row
  4,201 of 50,000". You cannot patch it from outside either — the component accepts no props to
  forward, and [Table](table.md) spreads its own rest props onto the wrapper `<div>`, not the `<table>`.
- **Find-in-page only searches what is mounted.** Ctrl+F, browser translation and "select all"
  see the visible window and nothing else. That is inherent to windowing, but it is a real
  regression against a plain [Table](table.md) and worth weighing before you virtualize a list of 500.
- **Row checkboxes are named with the raw key.** Each row's checkbox takes an `aria-label` of
  the literal `"Select row "` followed by whatever `rowKey` returned — measured as
  `"Select row inv_0"`. If your keys are database IDs, that is what gets read out, and there is
  no prop to supply a human-readable name.
  The select-all box is labelled `"Select all rows"` and sets the native `indeterminate` property
  imperatively, so the mixed state is announced correctly.
- **Sortable headers are operable but not announced as controls.** The `<th>` gets `tabIndex={0}`,
  `aria-sort`, a click handler and Enter/Space handling, but no `role="button"` and no inner
  button — so it reaches keyboard users and reports its sort state, while the fact that it *can*
  be activated is conveyed only by the arrow glyph and the cursor.
- **Nothing in the viewport is focusable by default.** With no `sortable` column and
  `selectable` off, the scroll container holds no tab stop and gets no `tabIndex` of its own,
  so whether a keyboard user can scroll it at all comes down to the browser's
  keyboard-focusable-scroller behaviour. There is no roving focus over rows and no cell
  navigation; if the rows are interactive, put a real control in them.
- **The sticky header pins to the component's own scroller** rather than the page, so it stays
  visible for the whole list — which is also what keeps the column names available to a screen
  reader walking the rows.

## Related

[DataTable](data-table.md) · [Table](table.md) · `useVirtualRows` · [Pagination](pagination.md) ·
[Checkbox](checkbox.md) · [EmptyState](empty-state.md) · [Skeleton](skeleton.md) ·
[Badge](badge.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
