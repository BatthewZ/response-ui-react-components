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
| `rowLabel`            | `(row: T, index: number) => string`                                      | `Select row {key}`       |
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
| `sortLabel`| `string`                                 | Words read before the header in the sort button's name. Default `"Sort by"`; `""` drops them. Ignored without `sortable`. |
| `width`    | `string \| number`                       | Written to the `<th>`'s inline `width`, and **authoritative** here: this table is `table-layout: fixed`, so the `<th>` decides the column and the body cells follow. A column with no `width` takes an equal share of what is left. |
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
tall. `height` on a `<tr>` is a *minimum* in CSS table layout, so the component holds the
number for you: cells in a virtualised table are `overflow: hidden`, `white-space: nowrap` and
`text-overflow: ellipsis`, so a value that does not fit is **truncated with an ellipsis rather
than wrapped**. Measured in Firefox 146 in a 360px-wide scroller at `rowHeight={40}`, one
wrapping sentence used to render a 93px row and make four rows occupy 213px where the
virtualiser had reserved 160; truncated, the same four rows are 40/40/40/40 = 160.

That is a real difference from [DataTable](data-table.md), whose cells wrap. If a column
genuinely needs to wrap, a `render` can set `white-space: normal` on its own element — but
its row will be taller than `rowHeight` again, and the arithmetic will drift again (see
[Gotchas](#gotchas)).

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

`selectable` adds a leading checkbox column. Selection is **controllable**: hold a
`Set<string | number>` of row keys and pass `selectedKeys` plus `onSelectionChange` to own it,
or pass neither and the table keeps the set itself (`onSelectionChange` still fires). The
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
reaches within `endReachedThreshold` rows of the end. It re-arms when the window moves away
**and** whenever `data` grows, so appending a page always re-arms the loader — even a page too
small to push the window back out of the threshold. It never fires while `loading` is set.

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

## Slots and props hatches

VirtualizedDataTable takes **no `classNames` object**: the only elements it adds on top of
[Table](table.md) are the two spacer rows, and those are not overridable — see below. What
it does take is the two routes it previously hardcoded.

**`className` and `style` address the outermost element**, which is also the scroll
container:

```tsx
<VirtualizedDataTable
  data={rows}
  columns={columns}
  rowKey={(r) => r.id}
  rowHeight={40}
  className="rounded-lg"
  style={{ height: "60vh" }}
/>
```

Two things about that element specifically:

- **`className` is appended to `table-virtual-scroll`, never a replacement.** That class is
  retained as a marker — see [Fixed row height](#fixed-row-height) — so it is written first
  and yours is added.
- **`style` is applied after the derived `height`/`overflow-y`**, so a value you set on the
  same key wins. `style={{ height }}` and the `height` prop do the same thing; prefer the
  prop, which is also what the virtualiser's initial-viewport estimate reads.

Both also reach the loading and empty roots, which are different elements from the data one.

**`tableProps` reaches the inner `<table>`**, forwarded to [Table](table.md)'s own hatch and
**merged** into the `aria-rowcount`/`aria-busy` this component derives — those describe the
virtual window and cannot be restated correctly from outside:

```tsx
<VirtualizedDataTable … tableProps={{ "aria-label": "Transactions" }} />
```

**Deliberately not slots.**

- **The spacer rows** (`.table-virtual-spacer`). They are `aria-hidden` height shims: their
  whole geometry is the padding the virtualiser computes and writes inline, and the class
  exists only to zero the padding and border a data row would carry. A class there desyncs
  the scroll arithmetic — see [Gotchas](#gotchas).
- **The checkbox column's `w-10`.** A width reservation for a control this component owns.

## Theme tokens

VirtualizedDataTable reads **no theme variables of its own**, and it no longer ships a
stylesheet at all — `VirtualizedDataTable.css` is gone. What it held was pure layout, and each
rule went to the element that needed it: `table-layout: fixed` through `Table`'s `tableProps`
hatch, `truncate` onto the header and body cells this component renders through `Table.Cell`
and `Table.HeaderCell`, and `padding: 0; border: 0` onto the spacer rows so they contribute
nothing but height. The `overflow-y: auto` rule was dead — the same element always carried an
inline `overflowY`, which beats a class at every layer. None of it named a colour, radius or
type token, and none of the utilities that replaced it resolves to one.

Everything you can see is painted by the components it renders through, so there is no
per-component variable to reach for and any override you make re-tints those components
everywhere else too:

- **The table itself** — `Table.css`. The wrapper takes a 1px `--C-BORDER-DEFAULT` border and
  `--RADIUS-MD` corners; the table fills `--C-SURFACE-0`; the head fills `--C-SURFACE-1` under a
  2px `--C-BORDER-DEFAULT` rule and, when sticky, casts `--SHADOW-SM` from each header cell.
  Header and body text ink `--C-TEXT-PRIMARY`, and cell type is `--BodyText-2` at `dense`,
  `--BodyText-1` otherwise. Rows are separated by 1px of `--C-BORDER-DEFAULT`; a striped row
  fills `--C-SURFACE-2`, and a selected row an 8% `--C-ACCENT` wash plus a 3px `--C-ACCENT`
  bar down its leading edge (the wash alone measures 1.07–1.13:1 — see
  [Table](table.md#accessibility)). A sortable header hovers to
  `--C-SURFACE-2`, presses to `--C-SURFACE-3`, and focuses with a 2px `--C-BORDER-FOCUS`
  outline around its inner sort button, over `--MOTION-DURATION-SHIFT`/`--MOTION-EASE-SHIFT` (dropped under
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
- **`rowHeight` is enforced by truncation, not by clipping.** Virtualised cells are
  `overflow: hidden` + `white-space: nowrap` + `text-overflow: ellipsis`, which stops the
  common cause of an over-tall row — text wrapping — and is what the fixed-height contract
  always promised. It is not a hard clamp: a `render` that returns a block with its own
  height, or one that opts back into wrapping, still grows its row, and the spacers are still
  computed from `rowHeight` — so the scroll height and the real content height diverge, the
  scrollbar drifts, and rows enter or leave the window at the wrong offset. There is **no dev
  warning** for that case; if your cells can be tall, raise `rowHeight` until the tallest
  fits.
- **`rowKey` is called for every row in `data`, even when `selectable` is `false`.** The
  select-all state is derived from a map over the whole dataset that nothing gates on selection.
  Measured: rendering 100,000 rows with `selectable={false}` invoked `rowKey` 100,068 times. It
  is memoized on `[sortedData, rowKey]`, so it does not recompute while you scroll — but an
  inline `rowKey={(r) => r.id}` is a new function every render, so a parent re-render costs
  another full pass (measured 50,068 → 100,084 on a 50,000-row table). Define `rowKey` once
  outside the component.
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
  is tall — the component's own test asserts this for 20 rows. It does *not* fire while
  `loading` is set. It fires at most once per `data.length`, so a fetch that returns nothing
  new does not re-arm it; still, make your loader idempotent.
- **A string `height` is estimated, not measured, until hydration.** The window is seeded from
  `height` when it is a number; a `"60vh"` or `"100%"` seeds the 400px default instead, and the
  browser corrects it on the first measurement. A viewport much taller than 400px still renders
  short server-side, and a much shorter one over-renders. Pass a number when you can.
- **Column widths are fixed, and that is a trade.** This table sets `table-layout: fixed`, so
  the columns are decided by the header row alone and never re-measure while you scroll.
  Without it they were negotiated from whatever slice happened to be mounted: measured in
  Firefox 146, scrolling a 56-character unbreakable token into a four-row window moved two
  columns from 640/606px to 1129/117px — and it did so **even with a `width` on the `<th>`**
  (152/1094 → 679/567), because under `table-layout: auto` a column `width` is a suggestion
  the cells can outvote. The trade is the other half of the same rule: a column with **no**
  `width` now takes an equal share of the table rather than sizing to its content, so give
  the columns that matter an explicit `width`. Only this table is affected — [Table](table.md)
  and [DataTable](data-table.md) still size to content.
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

- **Selection is on the row as well as the checkbox.** With `selectable` on, every rendered
  `<tr>` carries `aria-selected` — valid here, because a `<tr>` in a `<table>` maps to role
  `row` and ARIA 1.2 supports that state on `row` in exactly that context — plus
  `data-selected="true"` while selected. Without `selectable` the rows say nothing at all,
  rather than reporting a selection model that does not exist. The table keeps its native
  `table` role either way.
- **The row count is the dataset's, not the window's.** The `<table>` carries `aria-rowcount`
  (rows + the header row) and every rendered `<tr>` its `aria-rowindex` in the full dataset, so
  a screen reader can say "row 4,201 of 50,000" even though only a slice is mounted. The table
  keeps its native `table` role: `role="grid"` would promise cell-level arrow-key navigation
  this component does not implement.
- **Find-in-page only searches what is mounted.** Ctrl+F, browser translation and "select all"
  see the visible window and nothing else. That is inherent to windowing, but it is a real
  regression against a plain [Table](table.md) and worth weighing before you virtualize a list of 500.
- **Row checkboxes are named with the raw key by default.** Each row's checkbox takes an
  `aria-label` of the literal `"Select row "` followed by whatever `rowKey` returned — measured
  as `"Select row inv_0"`. If your keys are database IDs, that is what gets read out, and the
  string is English. Pass `rowLabel={(row) => …}` for a human-readable name in your own
  language.
  The select-all box is labelled `"Select all rows"` and sets the native `indeterminate` property
  imperatively, so the mixed state is announced correctly.
- **Sortable headers are announced as controls.** The header's label sits in a real
  `<button type="button">` inside the `<th>`, so it reports the `button` role, holds the tab
  stop and activates on Enter and Space; `aria-sort` stays on the `<th>`, which is the only
  element ARIA supports it on. The button is named "Sort by " plus the column — override that
  prefix per column with `ColumnDef.sortLabel`, or drop it with `sortLabel: ""`. *Before
  v0.10.0 the `<th>` itself carried `tabIndex={0}` and its own key handling, so it was
  operable without ever announcing that it was.*
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
