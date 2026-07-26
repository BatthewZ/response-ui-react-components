# data-table — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 357 · DataTable — a controlled `sort` cannot be cleared, and clearing it silently un-controls the table (high)

`sort?: SortState` cannot hold the `null` that `onSortChange` emits, and `isControlledSort` is
`sortProp !== undefined` — so the idiomatic `useState<SortState | null>(null)` passed as
`sort={sort ?? undefined}` starts **uncontrolled**, and every click taken while uncontrolled runs
`setInternalSort`. Measured end to end with `data = [Charlie, Alice, Bob]`, one sortable column,
`onSortChange={setSort}`: click 1 is uncontrolled, so it seeds `internalSort = {customer, asc}` and
hands the parent `{asc}`; clicks 1 and 2 then render in source order (controlled, `aria-sort`
ascending then descending); click 3 — the one that is supposed to **clear** the sort — emits `null`,
the prop becomes `undefined`, the table reads that as uncontrolled, finds the stale
`internalSort = {asc}` from click 1 and reorders the rows to `Alice, Bob, Charlie` with
`aria-sort="ascending"`. No further click is needed, and nothing puts it back: the prop that arrived
is `undefined`. If the server owns the ordering, the display now silently disagrees with it.
**Fix:** type `sort?: SortState | null` and derive controlled-ness from property presence
(`"sort" in props`) rather than from `undefined`.

### 358 · DataTable — the loading and empty branches drop `footer` and the pager (med)

Both early returns render a bare `<Table>` and return before `{footer}` and
`renderPaginationBlock()`. Measured: `<DataTable data={[]} page={3} totalPages={5}
onPageChange={fn} footer={<LoadMore/>} />` renders **0** `nav[aria-label="Pagination"]` and **0**
footer nodes, while the same props with non-empty `data` render 1 of each. A user on a server-paged
screen whose page 3 comes back empty has no control left with which to get back to page 2 —
the state that most needs the pager is the one that removes it.
**Fix, as applied** (`7f651a6`) — stronger than the prescription, which would have left three places
to keep in sync. The early returns are gone: `DataTable` has a **single** return (`:419-433`) with one
`renderHeader()`, one `<Table.Body>` choosing between `renderLoadingRows`/`renderRows`/`renderEmptyRow`,
and `{footer}` (`:428`) + `renderPaginationBlock()` (`:430`) outside all three, so no future state can
drop them again. Deliberate side effect: the loading state gains the outer `<div>` the other two
already had.

### 359 · DataTable — `selectable` alone renders permanently dead checkboxes (med)

`selectedKeys` and `onSelectionChange` are both optional in `DataTableProps`, but `handleSelectAll`
and `handleSelectRow` open with `if (!onSelectionChange || !selectedKeys) return`, and
`checked={selectedKeys?.has(key) ?? false}`. Measured: `<DataTable data={3 rows} columns rowKey
selectable />` renders 4 checkboxes, all `checked === false` and **none** `disabled`, and clicking
one leaves every box unchecked and calls nothing. The control looks live and is inert. Expansion,
one prop group over, already solves this correctly with `useControllableState`.
**Fix:** pair the three props in a discriminated union, or manage selection internally when
uncontrolled.

### 360 · DataTable — `index` is page-relative, so index-based keys collide across pages (med)

`pageData.map((row, i) => …)` passes the slice index to `rowKey`, `column.render` and
`renderExpanded`. Measured with `pageSize={2}` and a `render: (_r, i) => String(i)` column: page 1
prints `0, 1` and page 2 prints `0, 1` again. An index-based `rowKey` therefore returns the same key
for row 0 of every page, so selecting row 0 on page 1 shows row 0 of page 2 as selected, and React
sees the same keys across a page change.
**Fix:** pass `start + i` in the paged path.

**Re-verified after `7f651a6` and deliberately not applied.** The paging migration onto
`useControllableState` changed *who owns* the page, not which index is passed —
`pageData.map((row, i) => …)` still hands the slice index to `column.render` (`:397`) and
`renderExpanded` (`:407`). Handed back to the owner because `rowKey`, `column.render` and
`renderExpanded` are three **public callbacks**: any consumer who noticed the current behaviour may
already compensate for it, so `start + i` is a silent breaking change to their code, not a fix they
would see. Needs an owner decision (change it, or document the slice index as the contract).

### 361 · DataTable — `stickyHeader` is unreachable, not merely inert (med)

`DataTable` forwards `stickyHeader` to `Table`, whose sticky header resolves against the
`.table-wrapper` scrollport (#352) — and `DataTableProps` is a plain object type with no
`className`, `style` or `ref`, so there is no way from the call site to give that wrapper a height.
The prop is therefore not just default-off-by-accident (as on `Table`, where `max-h-*` fixes it) but
has no working configuration at all: `<DataTable stickyHeader />` inside any scrolling ancestor
never pins its header.
**Fix:** accept `className`/`style` (or a `maxHeight` prop) and forward it to `Table`.

### 362 · DataTable — row checkboxes are named by interpolating the raw row key (med)

`aria-label={`Select row ${key}`}` puts whatever `rowKey` returned straight into the accessible
name. Measured with `rowKey={(r) => r.uid}` and a uid of `"8f3a-91c2-4de1"`: the checkbox's name is
`"Select row 8f3a-91c2-4de1"`, which a screen reader spells out character by character. The English
string is also unreachable for translation — the same hard-coded-`aria-label` pattern as `SearchInput`
(#222), `OTPInput` (#243) and `Repeater` (#259).
**Fix:** add an optional `rowLabel?: (row: T, index: number) => string` defaulting to the current
behaviour.
