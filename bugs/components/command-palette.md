# command-palette — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 398 · CommandPalette — the highlighted option has no visible indicator (high)

The only style on the active row is `background: var(--C-SURFACE-2)` over the panel's `--C-SURFACE-0` —
no border, no ink change, no weight change. Measured 1.10 / 1.08 / 1.08 / 1.16:1 in
default / events / tech / grimdark, against WCAG 1.4.11's 3:1 floor. Because focus is virtual (DOM
focus never leaves the search input) there is no focus ring either, so a keyboard user pressing
ArrowDown sees nothing change on screen and fires `Enter` on a command they could not see was selected.
Same class as Combobox #275 / MultiSelect #264, one surface step up the ramp.
**Fix:** give `.command-palette-option[data-active]` a border/outline or an ink+weight change, not
tint alone.

### 399 · CommandPalette — arrow keys move out of visual order (med)

Arrow/Home/End traverse the flat `filtered` array while the DOM renders grouped (groups in first-seen
order). With `items = [New document(File), Copy(Edit), Save(File)]` the palette renders
`[New document, Save, Copy]` but ArrowDown visits `[New document, Copy, Save]` — measured — so the
highlight jumps between non-adjacent rows whenever a group's members are not contiguous in `items`.
**Fix:** derive `activeIndex` from the grouped render order rather than from `filtered`.

### 400 · CommandPalette — the highlight resets on an unstable `items`/`filter` identity (med)

The effect that snaps `activeIndex` to the first selectable row is keyed on `findSelectable` →
`filtered` → the `items`/`filter` props. Measured: `<CommandPalette items={[…inline literal]} />`, user
arrows to row 3 ("Save all"), an unrelated parent state change re-renders, highlight snaps back to
row 1 ("New document"). A module-scope array (or `useCallback` filter) survives — measured.
**Fix:** key that effect on `query` alone, or clamp `activeIndex` instead of resetting it.

### 401 · CommandPalette — the search input can never be given an accessible name (med)

The input has no `aria-label`/`aria-labelledby`/`<label>`, and rest props (including a caller's
`aria-label`) are spread on the `<dialog>` instead. Measured: `<CommandPalette aria-label="Search
commands" />` renames the *dialog* (`dialog[aria-label="Search commands"]`) and leaves the combobox
with only the browser's `placeholder` fallback for a name — and nothing at all under `placeholder=""`.
**Fix:** add an `inputProps`/`aria-label` pass-through, or a visually hidden `<label>`.

### 402 · CommandPalette — no live region announces the result count (med)

Filtering swaps the option list silently and the `emptyMessage` node is not announced either.
Measured: the rendered DOM contains 0 `aria-live` nodes, so a screen-reader user typing four
characters that narrow 50 commands to 0 hears nothing and keeps typing into a dead list.
**Fix:** render a visually hidden `aria-live="polite"` result count.

### 403 · CommandPalette — the ARIA nesting is not the listbox shape (med)

Options sit in an unroled `<ul>` (implicit `role="list"`) inside `<li role="group">`, so the listbox
does not directly own its options; measured DOM is
`ul[role=listbox] > li[role=group] > ul > li[role=option]`. An item with no `group` still gets a
`<li role="group">` wrapper with no `aria-labelledby`. The structure is measured; screen-reader
position-reporting outcome is reasoned (the page hedges it rather than naming a result).
**Fix:** `role="presentation"` on the inner `<ul>`, and omit the group wrapper when `group == null`.

### 404 · CommandPalette — group headers and the empty message are illegible (med)

`--C-TEXT-MUTED` on `--C-SURFACE-0`: 2.54 / 2.45 / 2.10 / 2.59:1 across default / events / tech /
grimdark, below the 4.5:1 body-text floor, and the empty message is the only content on screen in its
state (`"No results"` at 2.10:1 in `tech`). The placeholder can live at that ratio; the headers and
empty message cannot. Instance of #51.
**Fix:** use `--C-TEXT-SECONDARY` (7.56 / 7.40 / 5.76 / 5.95:1) for the header and empty message.
