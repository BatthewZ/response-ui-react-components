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
are plain `<thead>`/`<tbody>` passthroughs. `Table.Row` is the `<tr>` that reads `striped`.
`Table.HeaderCell` and `Table.Cell` are the `<th>`/`<td>` that read `density` — and the
header cell is where sorting lives.

| Part               | Renders   | Own props                                                                             |
| ------------------ | --------- | ------------------------------------------------------------------------------------- |
| `Table`            | `<div>` › `<table>` | `density?: "dense" \| "comfortable" \| "spacious"` (default `"comfortable"`) · `striped?: boolean` · `stickyHeader?: boolean` |
| `Table.Head`       | `<thead>` | —                                                                                     |
| `Table.Body`       | `<tbody>` | —                                                                                     |
| `Table.Row`        | `<tr>`    | `selected?: boolean`                                                                  |
| `Table.HeaderCell` | `<th>`    | `sortDirection?: "asc" \| "desc" \| false` · `onSort?: () => void`                     |
| `Table.Cell`       | `<td>`    | —                                                                                     |

Every part also accepts the props of the element it renders, so `className`, `id`,
`colSpan`, `scope`, `ref` and `aria-*` pass through. On the **root** those land on the
wrapper `<div>`, not on the `<table>` — which is the single sharpest edge on this
component. See [Gotchas](#gotchas).

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

Striping is pure CSS — `:nth-child(even)` counted among a row's siblings — so within each
`<tbody>` the tint follows DOM position, not data. Split your rows across two `Table.Body`
sections, or slot in a `<tr>` of your own, and the parity restarts or shifts.

## Sorting

`onSort` is the switch: pass it and the header cell becomes clickable, focusable, and
keyboard-operable (Enter and Space), gains a hover/active wash and grows a sort arrow.
`sortDirection` picks which arrow and sets `aria-sort` — `"asc"` and `"desc"` render the
up/down arrow tinted with the accent, `false` (or omitting it) renders a muted
double-headed arrow and `aria-sort="none"`. In the example, `sort` and `setSort` are a
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

`selected` adds one class and one background tint. It emits no `aria-selected` and no
`data-*` attribute, and the tint is thin — see [Accessibility](#accessibility) for the
measured numbers and why the example also puts the state into the row's text.

## Sticky header

<!-- example:StickyHeader -->
```tsx
<Table stickyHeader className="max-h-[9rem]">
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
the whole table away instead. That is what the `max-h-*` class above is for.

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

`Table.tsx` uses **no Tailwind utilities** — every rule lives in `Table.css` and reads the
contract variables directly. Override any of these and the table re-tints with the rest of
the app, at runtime, with no rebuild.

| Where                          | Override                                                  |
| ------------------------------ | --------------------------------------------------------- |
| Wrapper border · corners       | `--C-BORDER-DEFAULT` · `--RADIUS-MD`                      |
| Table background               | `--C-SURFACE-0`                                           |
| Header band · its 2px underline| `--C-SURFACE-1` · `--C-BORDER-DEFAULT`                    |
| Header label ink               | `--C-TEXT-PRIMARY`                                        |
| Sortable header hover · active | `--C-SURFACE-2` · `--C-SURFACE-3`                         |
| Sortable header focus outline  | `--C-BORDER-FOCUS`                                        |
| Sort arrow                     | `--C-TEXT-MUTED` unsorted · `--C-ACCENT` sorted           |
| Row divider                    | `--C-BORDER-DEFAULT`                                      |
| Striped row                    | `--C-SURFACE-1`                                           |
| Selected row                   | `--C-ACCENT`, mixed to 8% in oklch                        |
| Cell ink                       | `--C-TEXT-PRIMARY`                                        |
| Cell type step                 | `--BodyText-2` (dense) · `--BodyText-1` (comfortable, spacious) |
| Sticky header shadow           | `--SHADOW-SM`                                             |
| Sortable hover transition      | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`         |

The transition is dropped entirely under `prefers-reduced-motion: reduce`; nothing else in
the component animates.

Three things are **not** on the contract, and are worth knowing before you theme:

- **Cell padding is hard literals**, not the responsive `r`-scale that most components use.
  The type steps *are* responsive — `--BodyText-1` goes `0.875rem` → `1rem` at the 40rem
  breakpoint — so a row gets taller type on desktop inside padding that does not move with
  it. Override `.table-cell--*` yourself if that matters.
- **Only the size step is read, not its paired line height.** `Table.css` sets `font-size`
  from the `--BodyText-*` scale and leaves `line-height` to inherit, so row height tracks
  whatever the surrounding text is doing.
- **Header weight is a literal `font-weight: 600`,** not the contract's semibold token. A
  theme that changes its semibold weight — `grimdark` sets it to 700 — does not reach the
  table header.

## Gotchas

- **Rest props land on the wrapper, not the `<table>`.** `<Table aria-label="Invoices">`
  renders `<div class="table-wrapper" aria-label="Invoices">`, and a
  `getByRole("table", { name: "Invoices" })` finds nothing — the `<table>` element takes
  nothing from you at all, not even `className`. Name it with a `<caption>`. The flip side
  is useful: `role="region"`, `aria-label` and `tabIndex={0}` on the root are exactly what
  the horizontal scroller wants, and that is where they land.
- **`ref` is the wrapper `<div>`.** Typed `HTMLDivElement`, because that is what it is.
  There is no handle on the `<table>` node.
- **`stickyHeader` does nothing until the wrapper has a height.** The sticky offset is
  measured against the wrapper's own scrollport, and the wrapper is content-height by
  default. Pass a `max-h-*` or a `style={{ maxHeight: … }}` alongside it.
- **An `onClick` on `Table.HeaderCell` composes with the sort click.** Your handler runs
  first, then `onSort` — on the pointer path and the Enter/Space path alike, which previously
  diverged (your handler replaced `onSort` for clicks while keys still sorted). `onKeyDown`
  composes too; `preventDefault()` is the opt-out. **`tabIndex` and `aria-sort` are still
  shadowed** by a rest prop of the same name, so passing those still overrides what the cell
  computed.
- **`sortDirection` without `onSort` announces a sort it does not show.** The cell still
  gets `aria-sort="ascending"`, but with no `onSort` there is no arrow, no focusability and
  no sortable styling — screen-reader users hear the state and sighted users see nothing.
- **`selected` is a tint and nothing else.** No `aria-selected`, no `data-selected`, no
  focus or click behaviour. Selection is entirely yours to wire up and to announce.
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
- **A sortable header is not announced as actionable.** It gets `tabIndex={0}` plus
  Enter/Space handling, so it *is* keyboard-operable — but it keeps its `columnheader`
  role, with no `role="button"` and no button inside it. Nothing tells a screen-reader user
  that pressing the header does something; the arrow glyph is the only hint, and it is
  visual.
- **Sortable headers have a visible focus indicator.** `:focus-visible` (so keyboard only,
  not mouse) draws a 2px `--C-BORDER-FOCUS` outline with `outline-offset: -2px`, which puts
  it inside the cell rather than over its neighbours.
- **The sort arrow is low contrast.** Unsorted, it is `--C-TEXT-MUTED` on the
  `--C-SURFACE-1` header band: 2.43:1 in the default and `grimdark` themes, 2.37:1 in
  `events`, 2.06:1 in `tech` — all under the 3:1 that WCAG 1.4.11 asks of a non-text
  control. Sorted, it is `--C-ACCENT`: 4.95:1 in the default theme and 14.56:1 in `tech`,
  but 2.63:1 in `events` and 2.77:1 in `grimdark`.
- **`selected` is colour alone.** The row is `--C-ACCENT` mixed to 8%, which measures
  1.12:1 against an unselected row in the default theme, 1.08:1 in `events`, 1.13:1 in
  `tech` and 1.03:1 in `grimdark` — and no attribute carries the state. Put "selected" into
  the row's content, as the example above does, or drive selection with a real
  [Checkbox](checkbox.md) in a leading cell.
- **Name the table.** A `<caption>` child is the only route to an accessible name; the
  `aria-label` you would reach for first lands on the wrapper, which has no role.
- **Label the scroller if the table is wide.** The wrapper scrolls horizontally but
  announces nothing. `role="region"` plus an `aria-label` on the root makes it a named
  landmark, and `tabIndex={0}` guarantees a keyboard user can reach and scroll it.

## Related

[DataTable](data-table.md) · [VirtualizedDataTable](virtualized-data-table.md) · [DescriptionList](description-list.md) ·
[Pagination](pagination.md) · [EmptyState](empty-state.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
