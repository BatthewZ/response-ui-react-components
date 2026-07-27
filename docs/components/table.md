# Table

The presentational `<table>`: real table markup in a scroll-safe wrapper, with three
densities, optional zebra striping, sortable header affordances and a sticky head — every
colour of it on the theme contract. Reach for it when you own the rows; reach for
[DataTable](data-table.md) when you want the sorting, selection and pagination written for you.

<!-- example:Minimal -->
```tsx
<Table>
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell>Invoice</Table.HeaderCell>
      <Table.HeaderCell>Customer</Table.HeaderCell>
      <Table.HeaderCell className="text-right">Amount</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.Cell>INV-1042</Table.Cell>
      <Table.Cell>Ada Lovelace</Table.Cell>
      <Table.Cell className="text-right">$1,200.00</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>INV-1043</Table.Cell>
      <Table.Cell>Grace Hopper</Table.Cell>
      <Table.Cell className="text-right">$860.00</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>INV-1044</Table.Cell>
      <Table.Cell>Alan Turing</Table.Cell>
      <Table.Cell className="text-right">$2,415.50</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```
<!-- /example -->

**Anatomy.** `Table` renders a wrapper `<div class="table-wrapper">` — the horizontal
scroller, the border and the rounded corners — around a `<table>` that holds your
`children`. It is also the provider: `density` and `striped` are set once on the root and
travel by context, so the five sub-parts never take them. `Table.Head` and `Table.Body`
are near-passthroughs for `<thead>`/`<tbody>` — `Table.Body` also numbers its direct
`Table.Row` children so the zebra can key off data position. `Table.Row` is the `<tr>` that
reads `striped` and decides its own band.
`Table.HeaderCell` and `Table.Cell` are the `<th>`/`<td>` that read `density` — and the
header cell is where sorting lives.

| Part               | Renders   | Own props                                                                             |
| ------------------ | --------- | ------------------------------------------------------------------------------------- |
| `Table`            | `<div>` › `<table>` | `density?: "dense" \| "comfortable" \| "spacious"` (default `"comfortable"`) · `striped?: boolean` · `stickyHeader?: boolean` · `maxHeight?: number \| string` (caps the wrapper — what `stickyHeader` pins against; a number is px) · `tableProps?: ComponentPropsWithRef<"table">` (the only route to the inner `<table>`) |
| `Table.Head`       | `<thead>` | —                                                                                     |
| `Table.Body`       | `<tbody>` | —                                                                                     |
| `Table.Row`        | `<tr>`    | `selected?: boolean` (emits `aria-selected` + `data-selected`; **omit it entirely** on a table with no selection) · `index?: number` (data position; decides the zebra band — `Table.Body` supplies it for its own children) |
| `Table.HeaderCell` | `<th>`    | `sortDirection?: "asc" \| "desc" \| false` · `onSort?: () => void` · `sortLabel?: string` (words read before the column in the sort button's name; default `"Sort by"`, `""` drops them) |
| `Table.Cell`       | `<td>`    | —                                                                                     |

Every part also accepts the props of the element it renders, so `className`, `id`,
`colSpan`, `scope`, `ref` and `aria-*` pass through. On the **root** those land on the
wrapper `<div>`, not on the `<table>` — `tableProps` is what reaches the table element.
See [Gotchas](#gotchas).

## Density

One prop on the root changes the padding and the type step of every cell, header cells
included:

<!-- example:Dense -->
```tsx
<Table density="dense">
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell>Build</Table.HeaderCell>
      <Table.HeaderCell>Branch</Table.HeaderCell>
      <Table.HeaderCell>Duration</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.Cell>#4181</Table.Cell>
      <Table.Cell>main</Table.Cell>
      <Table.Cell>2m 14s</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>#4180</Table.Cell>
      <Table.Cell>release/2.4</Table.Cell>
      <Table.Cell>3m 02s</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>#4179</Table.Cell>
      <Table.Cell>fix/oklch-scrim</Table.Cell>
      <Table.Cell>1m 48s</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```
<!-- /example -->

`dense` is `0.25rem 0.75rem` with the smaller body type; `comfortable` (the default) is
`0.625rem 1rem`; `spacious` is `1rem` all round. Both cell types get the same class, so a
header row and its body rows always agree.

## Striped rows

<!-- example:Striped -->
```tsx
<Table striped>
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell>Region</Table.HeaderCell>
      <Table.HeaderCell className="text-right">Signups</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.Cell>North America</Table.Cell>
      <Table.Cell className="text-right">12,480</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>Europe</Table.Cell>
      <Table.Cell className="text-right">9,315</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>Asia Pacific</Table.Cell>
      <Table.Cell className="text-right">7,902</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>Latin America</Table.Cell>
      <Table.Cell className="text-right">3,144</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```
<!-- /example -->

The band follows the **data index**, not DOM position. `Table.Body` numbers its own direct
`Table.Row` children, so the markup above needs nothing extra. When your rows are generated —
a `.map`, a virtualised window, anything that puts a `<tr>` between two data rows — pass
`index` yourself and the parity survives it; a `<tr>` of your own slotted in no longer shifts
every band beneath it. A row carrying an explicit `index` is never renumbered, so you can mix
the two. Splitting rows across two `Table.Body` sections restarts the numbering, which is
usually what you want for a second logical table.

## Sorting

`onSort` is the switch: pass it and the header cell wraps its label in a real `<button>`,
gains a hover/active wash and grows a sort arrow. `sortDirection` picks which arrow and
sets `aria-sort` on the `<th>` — `"asc"` and `"desc"` render the up/down arrow tinted with
the accent, `false` (or omitting it) renders a muted double-headed arrow and
`aria-sort="none"`. In the example, `sort` and `setSort` are a
`useState<"asc" | "desc" | false>(false)` in your own component.

<!-- example:Sortable -->
```tsx
<Table>
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell
        sortDirection={sort}
        onSort={() => setSort(sort === false ? "asc" : sort === "asc" ? "desc" : false)}
      >
        Customer
      </Table.HeaderCell>
      <Table.HeaderCell>Plan</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Ada Lovelace</Table.Cell>
      <Table.Cell>Enterprise</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>Grace Hopper</Table.Cell>
      <Table.Cell>Team</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```
<!-- /example -->

**`Table` does not sort anything.** It draws the affordance and announces the state; the
rows come out in the order you passed them. Reorder your data in the `onSort` handler, or
use [DataTable](data-table.md), which wraps this component and owns a sort state for you.

### Where the control lives

The `<th>` keeps `role="columnheader"` and carries `aria-sort` — the only two roles ARIA
supports that state on. Inside it sits the `<button>`: it holds the tab stop, it is what
announces as pressable, and it is what Enter and Space activate. That is the
[WAI-ARIA APG sortable-table shape](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/),
and before v0.10.0 this component had neither half of it — see
[Accessibility](#accessibility) and the note on handler composition in [Gotchas](#gotchas).

The button's accessible name is the action plus the column: **"Sort by Customer"**.
`sortLabel` is the word or words in front — `sortLabel="Trier par"` for a French app,
`sortLabel=""` to drop them and leave the button named by the column alone. They reach the
button through `aria-labelledby` and are `aria-hidden` inside the cell, so the
*columnheader* is still named plain "Customer" and a data cell in that column does not
announce the verb with every value.

The **whole cell** stays clickable, hoverable and the sort target — the button is
inline-level and does not fill it. Only the tab stop and the focus ring moved.

## Selected rows

<!-- example:SelectedRow -->
```tsx
<Table>
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell>Customer</Table.HeaderCell>
      <Table.HeaderCell>Plan</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row selected>
      <Table.Cell>
        Ada Lovelace <span className="sr-only">(selected)</span>
      </Table.Cell>
      <Table.Cell>Enterprise</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>Grace Hopper</Table.Cell>
      <Table.Cell>Team</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```
<!-- /example -->

`selected` paints the row and states it: the `<tr>` gets `aria-selected` and, when true,
`data-selected="true"`, plus a 3px `--C-ACCENT` marker down its leading edge. The tint alone
is thin — see [Accessibility](#accessibility) for the measured numbers.

**Pass `selected` only where selection exists.** `selected={false}` is not the same as
leaving it off: it publishes `aria-selected="false"`, which tells assistive tech that this
table's rows *are* selectable. A plain report table should pass nothing. Your own
`aria-selected` still wins over the component's if you set one.

## Sticky header

<!-- example:StickyHeader -->
```tsx
<Table stickyHeader maxHeight="9rem">
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell>Commit</Table.HeaderCell>
      <Table.HeaderCell>Author</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.Cell>abd281f</Table.Cell>
      <Table.Cell>Ada Lovelace</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>7c0f543</Table.Cell>
      <Table.Cell>Grace Hopper</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>21b42e5</Table.Cell>
      <Table.Cell>Alan Turing</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>389765f</Table.Cell>
      <Table.Cell>Ada Lovelace</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>d12c4e0</Table.Cell>
      <Table.Cell>Grace Hopper</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```
<!-- /example -->

`stickyHeader` puts `position: sticky; top: 0` on the `<thead>`, plus a small shadow under
the header cells to separate them from the rows sliding underneath. The sticky offset
resolves against the **wrapper**: `overflow-x: auto` makes the wrapper's `overflow-y`
compute to `auto` too, so the wrapper — not the viewport — is the header's scrollport, and
the wrapper is where the height has to come from. Leave its height to content, as every
other example here does, and there is nothing to scroll past the header: the page scrolls
the whole table away instead. `maxHeight` is that bound — `maxHeight={320}` for pixels, any
CSS length as a string. It lands as an inline `max-height` on the wrapper, so a
`className` (`max-h-*`) or an explicit `style` does the same job, and an explicit
`style={{ maxHeight }}` wins over the prop.

A **height-bounded flex or grid parent** bounds it too, with no prop at all: the wrapper is
a scroll container, so its automatic minimum size is `0` and it shrinks to the track rather
than pushing past it. `maxHeight` is the route that does not depend on the layout around
the table.

## Naming the table, and its rows

<!-- example:CaptionAndRowHeaders -->
```tsx
<Table>
  <caption className="sr-only">Storage used by plan</caption>
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell scope="col">Plan</Table.HeaderCell>
      <Table.HeaderCell scope="col" className="text-right">
        Storage
      </Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.HeaderCell scope="row">Team</Table.HeaderCell>
      <Table.Cell className="text-right">250 GB</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.HeaderCell scope="row">Enterprise</Table.HeaderCell>
      <Table.Cell className="text-right">2 TB</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```
<!-- /example -->

`children` go straight inside the `<table>`, so a `<caption>` — visible or `sr-only` — is
how you give the table an accessible name. `scope` passes through on `Table.HeaderCell`,
which is also usable inside `Table.Body` to mark the cell that labels a row.

## Theme tokens

Apart from `sr-only` on the sort button's hidden action word, `Table.tsx` uses **no Tailwind
utilities** — every rule lives in `Table.css` and reads the contract variables directly.
Override any of these and the table re-tints with the rest of the app, at runtime, with no
rebuild.

| Where                          | Override                                                  |
| ------------------------------ | --------------------------------------------------------- |
| Wrapper border · corners       | `--C-BORDER-DEFAULT` · `--RADIUS-MD`                      |
| Table background               | `--C-SURFACE-0`                                           |
| Header band · its 2px underline| `--C-SURFACE-1` · `--C-BORDER-DEFAULT`                    |
| Header label ink · weight      | `--C-TEXT-PRIMARY` · `--Semibold-Weight`                  |
| Sortable header hover · active | `--C-SURFACE-2` · `--C-SURFACE-3`                         |
| Sort button focus outline      | `--C-BORDER-FOCUS`                                        |
| Sort arrow                     | `--C-TEXT-MUTED` unsorted · `--C-ACCENT` sorted           |
| Row divider                    | `--C-BORDER-DEFAULT`                                      |
| Striped row                    | `--C-SURFACE-1`                                           |
| Selected row wash              | `--C-ACCENT`, mixed to 8% in oklch                        |
| Selected row marker            | `--C-ACCENT` at full strength · width `--_table-selected-marker-width` (3px, private) |
| Cell ink                       | `--C-TEXT-PRIMARY`                                        |
| Cell type step                 | `--BodyText-2` (dense) · `--BodyText-1` (comfortable, spacious) |
| Sticky header shadow           | `--SHADOW-SM`                                             |
| Sortable hover transition      | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`         |

The transition is dropped entirely under `prefers-reduced-motion: reduce`; nothing else in
the component animates.

Two things are **not** on the contract, and are worth knowing before you theme:

- **Cell padding is hard literals**, not the responsive `r`-scale that most components use.
  The type steps *are* responsive — `--BodyText-1` goes `0.875rem` → `1rem` at the 40rem
  breakpoint — so a row gets taller type on desktop inside padding that does not move with
  it. Override `.table-cell--*` yourself if that matters.
- **Only the size step is read, not its paired line height.** `Table.css` sets `font-size`
  from the `--BodyText-*` scale and leaves `line-height` to inherit, so row height tracks
  whatever the surrounding text is doing.

## Gotchas

- **Rest props land on the wrapper, not the `<table>`.** `<Table aria-label="Invoices">`
  renders `<div class="table-wrapper" aria-label="Invoices">`, and a
  `getByRole("table", { name: "Invoices" })` finds nothing. That is deliberate — `role="region"`,
  `aria-label` and `tabIndex={0}` on the root are exactly what the horizontal scroller wants.
  For the `<table>` element itself use **`tableProps`**: `<Table tableProps={{ "aria-label":
  "Invoices" }}>` names the table, and its `className` merges with the component's own. A
  `<caption>` child still works too.
- **`ref` is the wrapper `<div>`.** Typed `HTMLDivElement`, because that is what it is.
  There is no handle on the `<table>` node.
- **`stickyHeader` does nothing until the wrapper has a height.** The sticky offset is
  measured against the wrapper's own scrollport, and the wrapper is content-height by
  default. Pass `maxHeight` alongside it (or a `max-h-*`, or your own
  `style={{ maxHeight: … }}`, or put the table in a height-bounded flex/grid parent).
- **An `onClick` on `Table.HeaderCell` composes with the sort click.** Your handler runs
  first, then `onSort` — on the pointer path and the Enter/Space path alike, which previously
  diverged (your handler replaced `onSort` for clicks while keys still sorted). `onKeyDown`
  runs first too; `preventDefault()` on either is the opt-out. This survived the move to an
  inner `<button>` (v0.10.0) because the button holds **no handler of its own**: its click
  bubbles to the `<th>`, where the same composed `onClick` runs, and Enter/Space reach that
  handler as the button's own activation — which a `preventDefault()` on your `onKeyDown`
  suppresses, exactly as it used to suppress the cell's key handler.
  **One half did change**: keyboard activation is now a real click, so your `onClick` runs
  on the Enter/Space path as well. It used to run only on the pointer path.
  **`aria-sort` and `aria-labelledby` are still shadowed** by a rest prop of the same name —
  and a sortable cell now computes an `aria-labelledby` of its own (that is what keeps the
  hidden "Sort by" out of the *columnheader's* name), so overriding it is yours to get right.
  **`tabIndex` is no longer shadowed** — the cell does not set one any more, so a `tabIndex`
  you pass is simply yours, and it adds a second tab stop in front of the button rather than
  replacing it.
- **`sortDirection` without `onSort` is display-only, and it does show.** The cell gets
  `aria-sort` **and** the matching arrow, so the state is announced and visible. What it does
  not get is the button, the tab stop or the sortable hover/active styling: it is a statement
  about the data, not a control. `sortDirection={false}` with no `onSort` renders and
  announces nothing.
- **`selected` states the row, but does not select it.** It emits `aria-selected`, adds
  `data-selected="true"` while true, tints the row and draws the leading marker — and that
  is all. There is no focus behaviour, no click handling and no selection model: wiring the
  click, holding the set and rendering the checkbox are yours (or use
  [DataTable](data-table.md), which does all three). Note the attribute is emitted whenever
  the prop is *present*, `false` included, so leaving it off is how you say "these rows are
  not selectable".
- **Sub-parts throw outside `<Table>`.** All five call the context hook, so a stray
  `Table.Cell` raises `"Table compound components must be used within <Table>"`. Wrapping
  them in your own components is fine; rendering them outside the root is not.
- **You cannot re-density one cell with the modifier class.** `cn` does not dedupe
  `table-cell--*` — they are not Tailwind utilities — so `className="table-cell--dense"`
  inside a `density="spacious"` table leaves both classes on the element and `Table.css`
  source order decides, which means `spacious` wins. Set `density` on the root, or override
  the padding directly.
- **Client component.** `Table.tsx` opens with `"use client"` (it creates a context), so it
  becomes a client boundary in an RSC tree.

## Accessibility

The markup is a real `<table>` of `<thead>`/`<tbody>`, `<tr>`, `<th>` and `<td>`, so row
and column counts, header association and table navigation mode all work without any ARIA
from the component.

- **Sorting is announced properly.** `aria-sort` is set to `ascending`, `descending` or
  `none` on every cell that has an `onSort`, and the arrow itself renders
  `aria-hidden="true"` (lucide adds it to any icon with no children and no ARIA of its
  own), so the direction is spoken once rather than twice.
- **A sortable header is announced as actionable.** The label sits in a real
  `<button type="button">` inside the `<th>`, so it reports the `button` role, takes the tab
  stop, and Enter and Space activate it natively. `aria-sort` stays on the `<th>` — ARIA
  supports that state on `columnheader` and `rowheader` and on nothing else, so moving it to
  the button would drop it. The button is named "Sort by <column>" via `aria-labelledby`;
  the arrow is `aria-hidden` and is not part of it. *Before v0.10.0 the `<th>` carried
  `tabIndex={0}` and its own Enter/Space handling and nothing else, so it was operable
  without ever announcing that it was.*
- **The sort button has a visible focus indicator.** `.table-header-cell__sort-button:focus-visible`
  (so keyboard only, not mouse) draws a 2px `--C-BORDER-FOCUS` outline at
  `outline-offset: 2px`, so the ring is around the label rather than around the whole cell —
  which is where it used to be, when the cell was the tab stop. Measured in Firefox at
  `density="dense"`, the tightest of the three: the ring's outer edge lands exactly on the
  cell's top edge and 1px inside its bottom, so it never crosses into a neighbouring cell.
  The cell keeps its own `:focus-visible` rule for the case where you pass a `tabIndex` and
  focus the `<th>` yourself.
- **The sort arrow now clears its floor in both states.** Measured against
  `@batthewz/response-ui-css` **v0.10.1** on the `--C-SURFACE-1` header band: unsorted, it is
  `--C-TEXT-MUTED` at **4.74 / 4.70 / 4.78 / 4.90:1** (default / `events` / `tech` /
  `grimdark`); sorted, it is `--C-ACCENT` at **4.95 / 4.74 / 14.56 / 5.32:1**. Both clear the
  3:1 WCAG 1.4.11 asks of a non-text control by a wide margin. This bullet used to record the
  opposite — 2.06–2.43 unsorted and 2.63–2.77 sorted in two themes — and both were fixed
  upstream in the palette rather than here: `--C-TEXT-MUTED` and `--C-ACCENT` in **v0.10.0**.
- **`selected` reaches assistive tech.** A `<tr>` inside a `<table>` maps to role `row`,
  and ARIA 1.2 lists `aria-selected` among that role's supported states in exactly that
  context — no `role="grid"` is needed, and none is set, because `grid` would promise
  cell-level arrow-key navigation this component does not implement. `data-selected="true"`
  rides along for styling. Both are emitted only when you pass `selected`.
- **The tint is reinforcement; the marker is the signal.** Measured from rendered pixels in
  Firefox 146 against `@batthewz/response-ui-css` v0.10.0, the 8% `--C-ACCENT` wash reads
  **1.11:1** against an unselected row in the default theme, **1.12:1** in `events`,
  **1.13:1** in `tech` and **1.07:1** in `grimdark` — and against a *striped* neighbour
  **1.06 / 1.08 / 1.11 / 1.00**, so in `grimdark` a selected row and an ordinary banded row
  are the same luminance to the pixel. That is why a selected row also paints a 3px
  `--C-ACCENT` bar down its inline-start edge: present-or-absent rather than a hue shift, and
  measured at **4.65 / 4.38 / 13.08 / 5.30** against the washed row, clearing the 3:1 WCAG
  1.4.11 asks of a non-text indicator in all four measured themes. Measured against the default theme and the
  worked examples; these numbers do not transfer to your own theme — re-check them against
  your values. The bar is a `background-image`, so
  it costs no layout and selecting a row reflows nothing. Under `dir="rtl"` it moves to the
  other edge.
- **A visible cue is still worth adding for a table you drive yourself.** The marker and
  `aria-selected` say *that* a row is selected; they do not say how to change it. Drive
  selection with a real [Checkbox](checkbox.md) in a leading cell — which is what
  [DataTable](data-table.md) does — or put the word into the row's content, as the example
  above does.
- **Name the table.** Either a `<caption>` child or `tableProps={{ "aria-label": … }}`. The
  bare `aria-label` you would reach for first lands on the wrapper, which has no role.
- **Label the scroller if the table is wide.** The wrapper scrolls horizontally but
  announces nothing. `role="region"` plus an `aria-label` on the root makes it a named
  landmark, and `tabIndex={0}` guarantees a keyboard user can reach and scroll it.

## Related

[DataTable](data-table.md) · [VirtualizedDataTable](virtualized-data-table.md) · [DescriptionList](description-list.md) ·
[Pagination](pagination.md) · [EmptyState](empty-state.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
