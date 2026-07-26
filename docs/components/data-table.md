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
| `sort`              | `SortState \| null`                                                      | —                    |
| `defaultSort`       | `SortState \| null`                                                      | —                    |
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

`ColumnDef` and `SortState` are both exported from the package root, so a controlled sort
annotates as `useState<SortState | null>(null)` with an ordinary top-level import. (`SortState`
was missing from the barrel until 0.9.0, which is why older code reaches for the deep
`…/components/ui/DataTable` path; that path still resolves and means the same type.)

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
receives `null` on the step that clears the sort. `sort` and `defaultSort` are both typed
`SortState | null`, so that `null` goes straight back into the prop — a controlled table
stays controlled through the clear.

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
controlled `sort` or a controlled `page` opts out of that reset, so you own it. That reset
goes through the same setter as every other page move, so it **calls `onPageChange(1)`** if
you passed one; it fires only when the page actually moves, so sorting while already on page
1 emits nothing. When `pageSize` is set, any `totalPages` you pass is ignored.

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

The `sort={sort ?? undefined}` above is the shape older versions forced, and it is now
redundant: `sort={sort}` says the same thing, because the prop accepts `null`. Either way the
table stays controlled for the whole cycle — the state is seeded with a real sort, and what
matters is the *first* render, as the first [Gotcha](#gotchas) explains.

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
column. Only the body is replaced: the header, the `footer` slot and the pager are rendered
outside the three body branches, so they are **identical** in the loading, empty and loaded
states. That is a change in 0.9.0 and it cuts both ways — see [Gotchas](#gotchas).

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

Neither state is a separate render any more. There is one return, one `renderHeader()`, and
one `<Table.Body>` choosing between the skeleton rows, the real rows and the empty row — so a
server-paged table whose current page comes back empty keeps its pager and the user keeps a
way back to page 2. See [Gotchas](#gotchas) for what that costs.

## Density and stripes

`density` and `striped` are forwarded straight to the underlying [Table](table.md). `dense` also
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

**DataTable has no stylesheet of its own.** The grid is drawn by [Table](table.md), and its rules —
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

- **Controlled or uncontrolled is settled on the first render, and never revisited.** A
  `sort` prop that is present on mount — `null` included — makes the table controlled for
  the instance's life, so the `null` `onSortChange` emits can be fed straight back, and a
  later `undefined` (the legacy `sort={sort ?? undefined}`) is read as `null` rather than as
  a mode switch. The trap is the other direction: mount with `sort` already `undefined` —
  a `useState<SortState | null>(null)` coalesced with `?? undefined` — and the table is
  uncontrolled forever, sorting rows itself however the prop arrives afterwards. Measured
  with exactly that wiring on source order `Charlie, Alice, Bob`: click one gives
  `Alice, Bob, Charlie`, click two `Charlie, Bob, Alice`, and the third — the clear —
  returns them to source order, all while your state was tracking every emission. Pass
  `sort={sort}` from the first render, or remount with a `key` to re-decide.
- **`page` locks on the first render too, and independently of `sort`.** Mount with `page`
  defined and the table never writes its own page again — so a server-paged table whose
  parent ignores `onPageChange` genuinely stays put, where it used to flip uncontrolled on
  any `undefined` frame and move its own slice anyway (measured: a table whose parent refused
  the requested page still went from `["A","B"]` to `["E"]`). Mount with `page` `undefined`
  and a `page` you start passing later is **ignored**, silently. `page={p ?? undefined}` keeps
  whatever the first render decided; `page={p ?? 1}` is what you want if you mean controlled.
- **`selectable` on its own renders dead checkboxes.** `selectedKeys` and
  `onSelectionChange` are both optional in the type, but the select handlers bail out
  unless both are present. `<DataTable … selectable />` renders the select-all box and one
  box per row, all permanently unchecked and ignoring every click.
- **`stickyHeader` has nothing to stick to.** [Table](table.md)'s wrapper sets `overflow-x: auto`,
  which makes that wrapper the nearest scroll container for the header, and DataTable
  exposes no `className`, `style` or `ref` with which to give it a height — so the wrapper
  never scrolls vertically and the header never sticks, however you scroll the page. Reach
  for [Table](table.md) directly, or [VirtualizedDataTable](virtualized-data-table.md), if you need a pinned header.
- **The loading header's select-all checkbox is live, and it acts on stale rows.** The
  loading and empty states now share the one real header, so the select-all box and every
  sort affordance are active in states where they used to be inert markup. Select-all
  operates on the current page slice of whatever is in `data` — so if you leave the previous
  page mounted while refetching, clicking it during the load selects the keys of the rows the
  user can no longer see. Clear `data` alongside `loading` if that matters, or hide your own
  selection UI while a fetch is in flight. Sorting from a loading header is the same shape:
  it fires `onSortChange` against a dataset that is about to be replaced.
- **The loading and empty states are no longer thinner renders**, which is worth knowing if
  you have tests. Both keep the full header (sort handlers, `aria-sort`, sort icons, column
  `align`, the select-all cell) and both keep `footer` and the pager. A test that counted
  `<th>`, or asserted no `nav[aria-label="Pagination"]` on an empty table, or asserted a
  stripped header, now fails — loudly, which is the good case. Striping is still forced off
  in both.
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
- **The header is the same in every state**, so a screen reader keeps the column names, the
  `aria-sort` values and the select-all checkbox while the table is loading or empty, rather
  than having them appear and disappear around a refetch. The flip side is that those
  controls are *operable* then too — see [Gotchas](#gotchas).
- **The pager is a labelled landmark.** [Pagination](pagination.md) renders
  `<nav aria-label="Pagination">` with per-page buttons named "Page N" and `aria-current`
  on the current one.

## Related

[Table](table.md) · [VirtualizedDataTable](virtualized-data-table.md) · [Pagination](pagination.md) ·
[Checkbox](checkbox.md) · [Skeleton](skeleton.md) · [EmptyState](empty-state.md) ·
[Badge](badge.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
