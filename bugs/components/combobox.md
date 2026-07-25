# combobox — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 275 · Combobox — keyboard navigation has no perceptible indicator (high)

`.combobox-item[data-active]` is a `--C-SURFACE-1` background on the popup's `--C-SURFACE-0`:
**1.02–1.07:1** across all four shipped themes (computed from the shipped OKLCH values). Because
`useListNavigation` runs with `virtual: true`, no option ever takes DOM focus, so there is no
focus ring behind it — the background *is* the whole indicator. Measured: open the list, press
ArrowDown three times, and nothing on screen changes while `aria-activedescendant` walks correctly
down the rows; Enter then selects a row the user could not see was highlighted. Screen-reader users
are fine and sighted keyboard users are not, which is why this rates above its `MultiSelect` twin
(#264): `Combobox` is the library's primary long-list control.
**Fix:** give `[data-active]` an accent fill or a ≥3:1 inset border rather than the adjacent
surface step.

### 276 · Combobox — the chevron toggle can never close the popup (med)

The toggle `<button>` sits in `.combobox-input-wrap` beside the input, and the input alone is the
floating reference — so a `pointerdown` on the button is "outside" and `useDismiss` closes the
popup, which flushes synchronously (discrete event), and the button's `onClick` then reads
`open === false` and re-opens it. Measured with an `onOpenChange` spy: type to open, click the
chevron (`aria-label="Close"`) → the listbox is still present and the spy recorded
`[[false], [true]]`. A controlled consumer therefore sees a spurious close/open pair on every click.
**Fix:** register the toggle as part of the floating reference, or read `open` from a ref inside
`onClick`, so dismiss and toggle stop fighting.

### 277 · Combobox — `loading` counts options it does not render (med)

`ComboboxContent` computes `countItems(children)` *before* the `loading ? <Spinner/> : children`
swap and reports that number to `registerRenderedCount`, which resets `activeIndex` to `0`.
Measured with `loading` set: the input carries `aria-activedescendant="<id>-option-0"` while
`document.getElementById(...)` returns `null` and `screen.queryAllByRole("option").length === 0`.
Every async combobox in the library is in this state for the whole duration of the request.
**Fix:** `registerRenderedCount(loading ? 0 : itemCount)`.

### 278 · Combobox — mouse selection leaves focus on `<body>` (med)

`selectValue` sets state and closes the popup but never returns focus to the input, and the option
is a non-focusable `<div>`, so the pointerdown blurs the input and nothing catches it. Measured:
focus the input, click an option → `document.activeElement` is `BODY`, so the next Tab restarts
from the top of the document. Keyboard selection is unaffected — measured `INPUT.combobox-input`
after Enter. Instance of the pattern named for #257. (Measured in jsdom; the mechanism holds in
browsers, but the exact resting element could differ.)
**Fix:** refocus `refs.domReference` in `selectValue`, or `preventDefault` on the item's
`onMouseDown`.

### 279 · Combobox — nothing dismisses the popup when focus leaves (med)

Only `useDismiss` is registered (outside press + Escape); there is no `useFocus`, no focus-out
handling, and no `FloatingFocusManager`. Measured: type to open, press Tab → focus is on the next
control, the portalled listbox is **still mounted**, and the now-unfocused combobox still reports
`aria-expanded="true"`. Same defect as #265 in `MultiSelect`, so it is the floating-form pattern
rather than one component.
**Fix:** add focus-out handling alongside `useDismiss`.
