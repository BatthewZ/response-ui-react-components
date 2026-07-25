# table — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 349 · Table — every prop lands on the wrapper, so the `<table>` can never be named (med)

`TableRoot` renders `<div ref={ref} className={cn("table-wrapper", className)} {...props}>` around a
`<table>` that receives only its own two classes. Measured: `<Table aria-label="Invoices" id="inv"
data-x="1">` renders `<div class="table-wrapper" aria-label="Invoices" id="inv" data-x="1">`, the
`<table>`'s attribute list is exactly `["class"]`, and `getByRole("table", {name: "Invoices"})`
returns `null` — every table in the library is unnamed in a screen reader's table list unless the
caller happens to know to pass a `<caption>` child (measured: a `<caption>` does name it). Not a
`Table`-only problem: it is the reason `VirtualizedDataTable` cannot be given `aria-rowcount` from
the call site (#372).
**Fix:** forward `aria-label`/`aria-labelledby`/`id` to the `<table>`, or accept a dedicated
`label`/`tableProps` prop.

### 350 · Table — a caller `onClick` on `Table.HeaderCell` replaces the sort click (med)

`TableHeaderCell` sets `onClick={onSort}` and then spreads `{...props}` *after* it, so the last
writer wins. Measured: `<Table.HeaderCell onSort={fn} onClick={g}>` — one pointer click gives `g` 1
call and `fn` **0**; `keyDown` Enter then Space still gives `fn` 2 calls, because the key handler is
a separate prop the caller did not overwrite. Mouse and keyboard therefore do different things on
the same header. `onKeyDown`, `tabIndex` and `aria-sort` are shadowed by the same mechanism.
**Fix:** compose the handlers (call the caller's, then the internal one) instead of spreading rest
after them.

### 351 · Table — `selected` is conveyed by an 8% wash and nothing else (med)

`Table.Row selected` emits only `class="table-row table-row--selected"` — measured, the row's full
attribute list is `["class"]` plus whatever the caller passed, `aria-selected` is `null`, and the
accessibility tree is byte-identical to an unselected row. The tint is
`color-mix(in oklch, var(--C-ACCENT) 8%, transparent)` over the table's `--C-SURFACE-0`; composited
the way a browser composites it (gamma-encoded sRGB) it measures **1.12:1** default, **1.08:1**
`events`, **1.13:1** `tech`, **1.03:1** `grimdark` against an unselected row — far below the 3:1
WCAG 1.4.11 asks of a non-text indicator. Selection-by-colour-alone, the same shape as `CalendarBase`
(#315).
**Fix:** emit `data-selected` (and `aria-selected` under a `grid` role) and raise the mix above 3:1.

### 352 · Table — `stickyHeader` does nothing until the wrapper is given a height (med)

`.table--sticky-header .table-head` sets `position: sticky; top: 0`, which resolves against the
nearest scroll container. `.table-wrapper` sets `overflow-x: auto`, which per the overflow spec
forces `overflow-y` to compute to `auto` — so the wrapper, not the viewport, is the scrollport — and
the wrapper has no height, so it never scrolls vertically. Measured in Chromium: computed
`overflow-y` on `.table-wrapper` is `auto`; with no height `scrollHeight === clientHeight` (507/507,
not scrollable) and a 200px **page** scroll moves the `<thead>`'s viewport `y` by exactly **−200px**
— it does not pin. With `max-height: 9rem` the same wrapper becomes scrollable (144/507) and
`scrollTop = 120` leaves the `<thead>` at the wrapper's top edge. So the prop appears to do nothing
unless the caller already knows to add `max-h-*`.
**Fix:** set a `max-height`/`overflow-y` on `.table-wrapper` when `stickyHeader` is on rather than
relying on the caller.

### 353 · Table — a sortable header is operable but never announced as activatable (med)

A `<th>` with `onSort` gets `tabIndex={0}`, an Enter/Space `keydown` handler and an `aria-sort`, but
keeps its implicit `columnheader` role: measured, the element's `role` attribute is `null`, there is
no `role="button"` and no `<button>` inside it, and the only affordance is the arrow glyph — which
lucide renders `aria-hidden="true"` (measured), so it is not in the accessibility tree at all. A
keyboard user hears "column header, Customer, ascending" and is told nothing about pressing it.
**Fix:** wrap the header content in a real `<button>`, per the ARIA sortable-column pattern.
