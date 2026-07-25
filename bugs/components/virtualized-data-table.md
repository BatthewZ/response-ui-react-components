# virtualized-data-table — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 368 · VirtualizedDataTable — `striped` bands the render window, not the dataset (med)

The zebra is `.table-row--striped:nth-child(even)`, counted among the `<tbody>`'s children — and the
top spacer `<tr>` is one of those children whenever the window has scrolled off the top. Measured in
Chromium against the exact markup the component emits (`rowHeight` 40, `overscan` 0): with
`startIndex = 0` and no top spacer, the striped dataset rows are **1, 3**; with `startIndex = 6` and
a top spacer they are **6, 8, 10**; with `startIndex = 7`, **7, 9, 11**. Since the window start moves
one row at a time, the entire zebra pattern inverts on every single row of scroll, and the first row
of the window is always the striped one.
**Fix:** stripe from the absolute row index (a per-row class computed from `startIndex + i`) rather
than `:nth-child(even)`.

### 369 · VirtualizedDataTable — the select-all key list walks the whole dataset on every render (med)

`const allKeys = useMemo(() => sortedData.map((row, i) => rowKey(row, i)), [sortedData, rowKey])`
is gated on nothing — not on `selectable`, not on `selectedKeys` being present. Measured: rendering
**100,000** rows with `selectable={false}` invokes `rowKey` **100,068** times, which is precisely the
work a virtualizer exists to avoid. Worse, the memo key includes `rowKey`, so an inline
`rowKey={(r) => r.id}` — the shape every example uses — is a new function on every parent render and
repeats the full pass each time (measured 50,068 → 100,084 on a 50,000-row table after one re-render).
**Fix:** gate the `allKeys` memo (and `allSelected`/`someSelected`) on
`selectable && selectedKeys != null`.

### 370 · VirtualizedDataTable — controlled `sort` flips to uncontrolled on the clearing click (med)

Identical mechanism to #357: `sort?: SortState` cannot express the `null` the cycle's third step
emits, and `isControlledSort = sortProp !== undefined`. Measured with
`useState<SortState | null>(null)` + `sort={sort ?? undefined}` + `onSortChange={setSort}`: clicks 1
and 2 leave source order, click 3 reorders to `Alice, Bob, Charlie` with `aria-sort="ascending"` off
an `internalSort` seeded by click 1. Measured with an **asynchronous** parent commit (a `setTimeout`
standing in for a server round trip), the same reorder appears the moment the `undefined` prop lands
— no further click. Measured with a **non-null** seed (`sort` never null, as the page's server
example does it), the table stays controlled for the whole cycle and the rows never move, which is
the fix in miniature.
**Fix:** type `sort?: SortState | null` and decide controlled-ness from a distinct signal (property
presence, or `onSortChange` being supplied).

### 371 · VirtualizedDataTable — `selectable` alone renders an enabled, inert checkbox column (med)

Same shape as #359. Measured with `<VirtualizedDataTable data={rows} columns rowKey rowHeight={40}
selectable />`: 4 checkboxes render, all unchecked and **not** `disabled`; clicking the select-all
box leaves `checked` false and calls nothing, because `handleSelectAll` early-returns on the missing
props. On this component the cost is higher than on `DataTable`, because the affordance implies a
select-all over the whole dataset.
**Fix:** make the three props a discriminated union, or render the column disabled and warn in dev.

### 372 · VirtualizedDataTable — a windowed table reports the window's size as the table's (med)

Measured on a 1,000-row dataset: `table.getAttribute("aria-rowcount")` is `null`, the table's `role`
is `null` (so it is a plain `table`, not a `grid`), no row carries `aria-rowindex`, and the
`<tbody>` holds **17** `<tr>`. A screen reader therefore announces a 17-row table whose contents
silently mutate as the user scrolls, with no way to report "row 4,201 of 50,000". It is not fixable
from the call site either: `VirtualizedDataTableProps` accepts no DOM props, and `Table`'s rest
spread lands on the wrapper `<div>`, not the `<table>` (#349).
**Fix:** set `role="grid"` + `aria-rowcount={data.length}` on the `<table>` and `aria-rowindex` per
row — which requires `Table` to forward attributes to the `<table>` element.

### 373 · VirtualizedDataTable — row checkboxes are named with the raw key (med)

Same defect as #362, one component over, and here without even a page-slice to keep the keys short:
measured, `rowKey={(inv) => inv.id}` returning `"inv_0"` produces `aria-label="Select row inv_0"`.
Database identifiers are the normal case for a 50,000-row table, and there is no prop to supply a
human-readable name.
**Fix:** add `rowLabel?: (row: T, index: number) => string`, defaulting to the current string.
