# DataTable

A generic grid driven by data plus column descriptors — sortable headers, row selection,
expandable detail rows, client or server pagination, and built-in loading and empty states.
Hand it an array and a list of columns and it renders the whole table; you never write a
row or a cell yourself.

<!-- example:Minimal -->
```tsx
<DataTable
  data={[
    { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
    { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
    { id: "ORD-1003", customer: "Alan Turing", total: "$240.15" },
  ]}
  columns={[
    { key: "id", header: "Order" },
    { key: "customer", header: "Customer" },
    { key: "total", header: "Total", align: "right" },
  ]}
  rowKey={(order) => order.id}
/>
```
<!-- /example -->

| Prop                | Type                                                                     | Default              |
| ------------------- | ------------------------------------------------------------------------ | -------------------- |
| `data`              | `T[]`                                                                    | — (required)         |
| `columns`           | `ColumnDef<T>[]`                                                         | — (required)         |
| `rowKey`            | `(row: T, index: number) => string \| number`                            | — (required)         |
| `sort`              | `SortState`                                                              | —                    |
| `defaultSort`       | `SortState`                                                              | —                    |
| `onSortChange`      | `(sort: SortState \| null) => void`                                      | —                    |
| `sortComparator`    | `(a: T, b: T, columnKey: string, direction: "asc" \| "desc") => number`  | built-in comparator  |
| `selectable`        | `boolean`                                                                | `false`              |
| `selectedKeys`      | `Set<string \| number>`                                                  | —                    |
| `onSelectionChange` | `(keys: Set<string \| number>) => void`                                  | —                    |
| `renderExpanded`    | `(row: T, index: number) => ReactNode`                                   | —                    |
| `expandedKeys`      | `Set<string \| number>`                                                  | —                    |
| `onExpandedChange`  | `(keys: Set<string \| number>) => void`                                  | —                    |
| `pageSize`          | `number`                                                                 | —                    |
| `page`              | `number`                                                                 | —                    |
| `totalPages`        | `number`                                                                 | —                    |
| `onPageChange`      | `(page: number) => void`                                                 | —                    |
| `density`           | `"dense" \| "comfortable" \| "spacious"`                                 | `"comfortable"`      |
| `striped`           | `boolean`                                                                | `false`              |
| `stickyHeader`      | `boolean`                                                                | `false`              |
| `loading`           | `boolean`                                                                | `false`              |
| `loadingRowCount`   | `number`                                                                 | `5`                  |
| `emptyContent`      | `ReactNode`                                                              | a "No data" panel    |
| `footer`            | `ReactNode`                                                              | —                    |

That is the whole surface. `DataTableProps` is a plain object type, not an intersection
with an element's props, so there is **no `className`, `style`, `id`, `ref` or rest
spread** — you cannot reach the wrapper. See [Gotchas](#gotchas), which is also where
`stickyHeader` and a controlled `sort` turn out to have sharp edges.

`ColumnDef` is exported from the package root; `SortState` is not — import it from
`@batthewz/response-ui-react-components/components/ui/DataTable`.

## Columns

A `ColumnDef<T>` describes one column. `key` does double duty: it is the React key, it is
the string handed to `onSortChange`, **and** — when the column has no `render` — it is the
property read off each row.

| Field      | Type                                     | What it does                                                          |
| ---------- | ---------------------------------------- | --------------------------------------------------------------------- |
| `key`      | `string`                                 | Required. Column identity, sort identity, and default field lookup.   |
| `header`   | `ReactNode`                              | Required. Header cell content.                                        |
| `render`   | `(row: T, index: number) => ReactNode`   | Replaces the cell body. Ignores `key` for lookup.                     |
| `sortable` | `boolean`                                | Makes the header activatable and gives it an `aria-sort`.             |
| `width`    | `string \| number`                       | Set as an inline width on the `<th>` only, not the body cells.        |
| `align`    | `"left" \| "center" \| "right"`          | Inline `text-align` on the header and every body cell in the column.  |

Without a `render`, the raw value is stringified conservatively: strings pass through,
numbers and booleans become `String(value)`, a `Date` becomes `toLocaleString()`, and
`null`, `undefined`, arrays and plain objects all render as an **empty cell**. Anything
richer than a scalar needs a `render`.

<!-- example:CustomCells -->
```tsx
<DataTable
  data={[
    { id: "ORD-1001", customer: "Ada Lovelace", total: 128.4, paid: true },
    { id: "ORD-1002", customer: "Grace Hopper", total: 76, paid: false },
  ]}
  columns={[
    { key: "customer", header: "Customer", width: "50%" },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (order) => `$${order.total.toFixed(2)}`,
    },
    {
      key: "payment",
      header: "Payment",
      render: (order) => (
        <Badge variant={order.paid ? "success" : "warning"}>
          {order.paid ? "Paid" : "Awaiting payment"}
        </Badge>
      ),
    },
  ]}
  rowKey={(order) => order.id}
/>
```
<!-- /example -->

## Sorting

Add `sortable: true` to a column and its header cycles **none → asc → desc → none**;
clicking a different column restarts at `asc`. `onSortChange` fires on every step and
receives `null` on the step that clears the sort.

Left uncontrolled, the table sorts the **entire `data` array** before it slices a page, so
sorting a paged table reshuffles across pages rather than within the visible one. The
built-in comparator handles `Date`, `number`, `boolean` and — as a fallback — the
stringified value via `localeCompare`, and always places nullish values last in **both**
directions. Replace it wholesale with `sortComparator`.

<!-- example:ClientSorting -->
```tsx
<DataTable
  data={[
    { id: "ORD-1001", customer: "Ada Lovelace", placed: new Date("2026-07-02"), total: 128.4 },
    { id: "ORD-1002", customer: "Grace Hopper", placed: new Date("2026-07-11"), total: 76 },
    { id: "ORD-1003", customer: "Alan Turing", placed: new Date("2026-06-28"), total: 240.15 },
  ]}
  columns={[
    { key: "customer", header: "Customer", sortable: true },
    { key: "placed", header: "Placed", sortable: true },
    { key: "total", header: "Total", align: "right", sortable: true },
  ]}
  rowKey={(order) => order.id}
  defaultSort={{ key: "placed", direction: "desc" }}
/>
```
<!-- /example -->

## Pagination

`pageSize` switches on client paging: the table derives
`totalPages = max(1, ceil(data.length / pageSize))`, slices the sorted array down to the
current page, and clamps the page so shrinking `data` can never strand you past the end.
Changing an **uncontrolled** sort also resets an **uncontrolled** page back to 1 — a
controlled `sort` or a controlled `page` opts out of that reset, so you own it. When
`pageSize` is set, any `totalPages` you pass is ignored.

The pager itself is a [Pagination](pagination.md), centred beneath the table. In client
mode it appears as soon as the derived page count exceeds 1 — no `onPageChange` needed.

<!-- example:ClientPagination -->
```tsx
<DataTable
  data={[
    { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
    { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
    { id: "ORD-1003", customer: "Alan Turing", total: "$240.15" },
    { id: "ORD-1004", customer: "Katherine Johnson", total: "$54.90" },
    { id: "ORD-1005", customer: "Margaret Hamilton", total: "$312.00" },
  ]}
  columns={[
    { key: "id", header: "Order", sortable: true },
    { key: "customer", header: "Customer", sortable: true },
    { key: "total", header: "Total", align: "right" },
  ]}
  rowKey={(order) => order.id}
  pageSize={2}
/>
```
<!-- /example -->

## Server-driven tables

Pass `sort` + `onSortChange` and `page` + `totalPages` + `onPageChange`, and **omit
`pageSize`**. The table becomes pure display: it renders `data` in the order given and
never re-slices it. This is the only safe wiring for server paging — uncontrolled sorting
on a server-paged table would sort just the rows currently on screen.

Below, `sort` and `setSort` are a
`useState<SortState | null>({ key: "total", direction: "desc" })` and `page`/`setPage` a
`useState(1)`, both in your own component.

<!-- example:ServerDriven -->
```tsx
<DataTable
  data={[
    { id: "ORD-1042", customer: "Margaret Hamilton", total: "$312.00" },
    { id: "ORD-1039", customer: "Alan Turing", total: "$240.15" },
  ]}
  columns={[
    { key: "id", header: "Order" },
    { key: "customer", header: "Customer", sortable: true },
    { key: "total", header: "Total", align: "right", sortable: true },
  ]}
  rowKey={(order) => order.id}
  sort={sort ?? undefined}
  onSortChange={setSort}
  page={page}
  totalPages={12}
  onPageChange={setPage}
/>
```
<!-- /example -->

Server pagination is rendered only when all three of `page`, `totalPages` and
`onPageChange` are present.

The `sort={sort ?? undefined}` above is the shape the first [Gotcha](#gotchas) is about: it
works, but the click that clears the sort hands ordering back to the table. If the server owns
the order, coalesce the `null` in `onSortChange` to a default sort instead, so the prop is
never `undefined`.

## Selection

`selectable` adds a leading checkbox column plus a select-all box in the header. Selection
is **always controlled** — `selectedKeys` is your `Set` of `rowKey` values and
`onSelectionChange` hands you the next one. Both are required for the boxes to work at all.

Select-all operates on the **current page only**: it adds every visible row's key to your
set, or removes them all if they are already there. Keys from other pages are untouched. In
the example, `selected` and `setSelected` are a
`useState<Set<string | number>>(new Set(["ORD-1002"]))`.

<!-- example:Selection -->
```tsx
<DataTable
  data={[
    { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
    { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
    { id: "ORD-1003", customer: "Alan Turing", total: "$240.15" },
  ]}
  columns={[
    { key: "id", header: "Order" },
    { key: "customer", header: "Customer" },
    { key: "total", header: "Total", align: "right" },
  ]}
  rowKey={(order) => order.id}
  selectable
  selectedKeys={selected}
  onSelectionChange={setSelected}
/>
```
<!-- /example -->

## Expandable rows

Passing `renderExpanded` adds a leading chevron column. Expanding a row inserts a
full-width `<tr>` beneath it whose height animates via a `grid-template-rows` `0fr → 1fr`
transition; the row stays mounted for the length of that transition on the way out so the
collapse animates too, and `renderExpanded` is only called while the detail row is
actually mounted — never for the rows that are shut.

Expansion is uncontrolled by default. Pass `expandedKeys` **and** `onExpandedChange` to
drive it yourself; passing `expandedKeys` alone freezes it, because the setter then only
calls a handler that isn't there.

<!-- example:ExpandableRows -->
```tsx
<DataTable
  data={[
    { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40", ship: "12 Bletchley Rd, MK3" },
    { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00", ship: "8 Harvard Yard, MA" },
  ]}
  columns={[
    { key: "id", header: "Order" },
    { key: "customer", header: "Customer" },
    { key: "total", header: "Total", align: "right" },
  ]}
  rowKey={(order) => order.id}
  renderExpanded={(order) => <p>Shipping to {order.ship}</p>}
/>
```
<!-- /example -->

## Loading and empty states

`loading` is checked first and short-circuits the body — whatever is in `data` is ignored
and `loadingRowCount` rows of [Skeleton](skeleton.md) placeholders render instead, one per
column, with the header kept in place so the table doesn't collapse mid-refetch.

<!-- example:LoadingSkeleton -->
```tsx
<DataTable
  data={[
    { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
    { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
  ]}
  columns={[
    { key: "id", header: "Order" },
    { key: "customer", header: "Customer" },
    { key: "total", header: "Total", align: "right" },
  ]}
  rowKey={(order) => order.id}
  loading
  loadingRowCount={4}
/>
```
<!-- /example -->

An empty `data` array renders a single full-width cell containing `emptyContent`, or — if
you pass none — a built-in [EmptyState](empty-state.md) reading "No data / There are no
items to display." With `data={[]}` there is nothing for TypeScript to infer `T` from, so
the row shape has to be pinned somewhere: annotating the `rowKey` parameter is the
lightest place to do it.

<!-- example:CustomEmptyState -->
```tsx
<DataTable
  data={[]}
  columns={[
    { key: "id", header: "Order" },
    { key: "customer", header: "Customer" },
    { key: "total", header: "Total", align: "right" },
  ]}
  rowKey={(order: { id: string }) => order.id}
  emptyContent={
    <EmptyState size="md">
      <EmptyStateTitle>No orders this week</EmptyStateTitle>
      <EmptyStateDescription>
        Nothing has been placed since Monday. Widen the date range to see more.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button variant="secondary">Reset filters</Button>
      </EmptyStateActions>
    </EmptyState>
  }
/>
```
<!-- /example -->

Both states are separate early returns, and they render less than the loaded table does.
See [Gotchas](#gotchas) before you rely on either in a server-paged screen.

## Density and stripes

`density` and `striped` are forwarded straight to the underlying `Table`. `dense` also
steps the type down a size; `comfortable` and `spacious` share a type size and differ only
in padding. Striping is suppressed in the loading and empty states.

<!-- example:DenseStriped -->
```tsx
<DataTable
  data={[
    { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
    { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
    { id: "ORD-1003", customer: "Alan Turing", total: "$240.15" },
    { id: "ORD-1004", customer: "Katherine Johnson", total: "$54.90" },
  ]}
  columns={[
    { key: "id", header: "Order" },
    { key: "customer", header: "Customer" },
    { key: "total", header: "Total", align: "right" },
  ]}
  rowKey={(order) => order.id}
  density="dense"
  striped
/>
```
<!-- /example -->

## Load-more paging

There is no `onEndReached`. For infinite or "load more" lists, accumulate rows into `data`
yourself, keep `sort` controlled so the table doesn't reorder what you have accumulated,
and put your button or intersection sentinel in the `footer` slot — it renders between the
table and the pager.

<!-- example:LoadMoreFooter -->
```tsx
<DataTable
  data={[
    { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
    { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
  ]}
  columns={[
    { key: "id", header: "Order" },
    { key: "customer", header: "Customer" },
    { key: "total", header: "Total", align: "right" },
  ]}
  rowKey={(order) => order.id}
  footer={
    <div className="mt-r3 flex justify-center">
      <Button variant="secondary">Load 25 more</Button>
    </div>
  }
/>
```
<!-- /example -->

## Theme tokens

**DataTable has no stylesheet of its own.** The grid is drawn by `Table`, and its rules —
including the `.data-table-expanded-*` animation used only here — live in `Table.css`.
That file is what reads `--C-BORDER-DEFAULT`, `--RADIUS-MD`, `--C-SURFACE-0`,
`--C-SURFACE-1`, `--C-SURFACE-2`, `--C-SURFACE-3`, `--C-TEXT-PRIMARY`, `--C-TEXT-MUTED`,
`--C-ACCENT`, `--C-BORDER-FOCUS`, `--SHADOW-SM`, `--BodyText-1`, `--BodyText-2`,
`--MOTION-DURATION-SHIFT` and `--MOTION-EASE-SHIFT`; override those to re-tint the grid,
the header band, the zebra stripe and the selected-row wash.

The rows below are the tokens **DataTable's own markup** adds on top, through Tailwind
utilities in `DataTable.tsx`. Change the variable and it re-tints at runtime, no rebuild.

| Where                          | Utility              | Override              |
| ------------------------------ | -------------------- | --------------------- |
| Expanded detail-row backdrop   | `bg-surface-1`       | `--C-SURFACE-1`       |
| Expander chevron ink           | `text-fg-secondary`  | `--C-TEXT-SECONDARY`  |
| Expander hover wash            | `hover:bg-surface-2` | `--C-SURFACE-2`       |
| Expander corner radius         | `rounded-md`         | `--RADIUS-MD`         |
| Expander hit-area padding      | `p-r6`               | `--R-SIZE-6`          |
| Chevron rotation + hover timing | `duration-fast`     | `--DURATION-FAST`     |
| Gap between table and pager    | `mt-r3`              | `--R-SIZE-3`          |

`--R-SIZE-3` is on the responsive `r`-scale and steps up at the 40rem viewport breakpoint
(`1rem` → `1.5rem`), so the pager sits further below the table on wider screens.
`--R-SIZE-6` is on the same scale but holds at `0.25rem` on both sides of that breakpoint,
so the expander's hit area is identical at every width.

The selected-row highlight is an 8% `--C-ACCENT` wash over the row background. That is a
very small luminance change on any theme, so treat it as reinforcement for the checkbox,
not as the signal itself.

## Gotchas

- **A controlled `sort` cannot be cleared, and clearing it hands sorting back to the
  table.** `sort` is typed `SortState | undefined` while `onSortChange` reports
  `SortState | null`, so the natural `useState<SortState | null>` has to be passed as
  `sort={sort ?? undefined}` — and `undefined` is exactly what the component reads as
  *uncontrolled*. The third click on a header (the one that clears the sort) therefore
  drops the table into uncontrolled mode, where it starts reordering rows itself from a
  stale internal sort state. Measured from `useState<SortState | null>(null)`: rows sit in
  source order `Charlie, Alice, Bob` for the first two clicks, then the third — the one
  that was meant to *clear* the sort — reorders them to `Alice, Bob, Charlie`. If your
  server owns the ordering, intercept `null` in `onSortChange` and substitute a default
  sort so the prop is never `undefined`.
- **`selectable` on its own renders dead checkboxes.** `selectedKeys` and
  `onSelectionChange` are both optional in the type, but the select handlers bail out
  unless both are present. `<DataTable … selectable />` renders the select-all box and one
  box per row, all permanently unchecked and ignoring every click.
- **`stickyHeader` has nothing to stick to.** `Table`'s wrapper sets `overflow-x: auto`,
  which makes that wrapper the nearest scroll container for the header, and DataTable
  exposes no `className`, `style` or `ref` with which to give it a height — so the wrapper
  never scrolls vertically and the header never sticks, however you scroll the page. Reach
  for `Table` directly, or `VirtualizedDataTable`, if you need a pinned header.
- **The loading and empty states are separate, thinner renders.** Both return before
  `footer` and the pager, and both rebuild the header row without `onSort`, without
  `aria-sort`, without the sort icons, and without the column `align`. A server-paged table
  whose current page comes back empty loses its pagination entirely — measured with
  `data={[]} page={3} totalPages={5}`: no pagination nav, no footer, and no way for the
  user to get back to page 2.
- **An empty table plus `renderExpanded` mismatches its own column count.** The empty
  branch omits the expander header cell but still spans the body cell across it — measured
  two `<th>` against `colspan="3"`.
- **The `index` argument is page-relative.** `rowKey`, `render` and `renderExpanded` all
  receive the index within the current page slice, not within `data`. A `render: (_, i) => i`
  column prints `0, 1` on page 1 and `0, 1` again on page 2, and an index-based `rowKey`
  therefore collides across pages — row 0 of page 2 shows as selected because row 0 of
  page 1 was. Key off a real identifier.
- **`striped` and `renderExpanded` fight.** The zebra is a `:nth-child(even)` rule, and an
  open detail row is a real `<tr>` in the same `<tbody>` — so expanding a row flips the
  stripe parity of every row beneath it, and the detail row picks up a stripe of its own.
  Pick one of the two features per table.
- **Expansion state is never pruned.** The internal expanded set keeps keys whose rows have
  left `data`, so a row that disappears and later comes back reappears already open.
- **`pageSize` beats `totalPages`.** Pass both and the derived client page count wins;
  your server's count is dropped.
- **Client-side, not server-renderable.** `DataTable.tsx` is `"use client"`.

## Accessibility

The output is a real `<table>` — `<thead>`, `<tbody>`, `<th>`, `<td>` — so a screen
reader's table navigation works, and `colSpan` is used for the detail and empty-state
cells.

- **Sortable headers are `<th>` elements, not buttons.** A sortable header gets
  `tabIndex={0}`, an `aria-sort` of `ascending` / `descending` / `none`, and an
  Enter/Space key handler. It gets no `role="button"` and contains no `<button>`, so a
  screen reader announces a column header whose sort state is known but whose
  *activatability* is signalled only by the arrow icon — and that icon carries
  `aria-hidden="true"` (lucide adds it to any icon with no children and no ARIA of its own), so
  it is not in the accessibility tree at all. Non-sortable headers carry no `aria-sort`, which
  is correct.
- **Header focus is visible.** `Table.css` gives a `:focus-visible` sortable header a 2px
  `--C-BORDER-FOCUS` outline, inset by 2px so it draws inside the cell.
- **The expander is a proper button.** It carries `aria-expanded` and an `aria-label` that
  flips between "Expand row" and "Collapse row". There is no `aria-controls`; the detail
  row is the immediately following `<tr>`, so DOM order carries the relationship. The
  button sets no custom focus style, leaving the browser's own outline in place.
- **Row checkboxes are named from the key.** Each is labelled "Select row" followed by the
  `rowKey` value, so an opaque key makes an opaque name — measured with a UUID-ish key:
  `Select row 8f3a-91c2-4de1`, which is what a screen reader spells out. The
  header box is labelled "Select all rows" and gets its `indeterminate` DOM property set
  imperatively when only some visible rows are selected.
- **Selection is announced by the checkbox alone.** The selected `<tr>` gets a colour wash
  and nothing else — no `aria-selected` (which would not be valid on a `table` row anyway).
  Anyone not seeing the tint relies entirely on the checkbox state, so keep the checkbox
  column visible.
- **The loading state emits one live region per skeleton cell.** Each
  [Skeleton](skeleton.md) is `role="status"` named "Loading" — measured 10 of them for
  `loadingRowCount={5}` across two columns. On a wide table that is a lot of simultaneous
  polite announcements; consider your own single status region instead.
- **The pager is a labelled landmark.** [Pagination](pagination.md) renders
  `<nav aria-label="Pagination">` with per-page buttons named "Page N" and `aria-current`
  on the current one.

## Related

`Table` · `VirtualizedDataTable` · [Pagination](pagination.md) ·
[Checkbox](checkbox.md) · [Skeleton](skeleton.md) · [EmptyState](empty-state.md) ·
[Badge](badge.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
