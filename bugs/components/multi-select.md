# multi-select — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 263 · MultiSelect — the rest-spread names the wrapper, not the combobox (med)

`{...props}` is applied to the outer `<div class="multiselect">`; the input receives only what
the component itself passes through `getReferenceProps`, and `aria-label` is the sole naming prop
in that list. Measured with `<MultiSelect id="skills" aria-labelledby="lbl" aria-label="Skills"/>`:
the wrapper reads `id="skills" aria-labelledby="lbl"`, the input reads `id=null`
`aria-labelledby=null`. So the `<Label htmlFor>` + `id` pattern that `select.md`, `input.md` and
`tag-input.md` all document does not work here, and dropping `aria-label` leaves the combobox with
no accessible name at all. (`name` is *not* part of this: it is absent from a `div`'s prop type, so
it does not compile — see the batch-J note above.)
**Fix:** destructure `id` / `aria-labelledby` out and forward them through `getReferenceProps`.

### 264 · MultiSelect — the keyboard highlight is invisible (med)

`.multiselect-item[data-active]` sets a `--C-SURFACE-1` background and nothing else — no border,
no ink change, no outline — over the listbox's `--C-SURFACE-0`. Computed from the shipped OKLCH
values: **1.05** default, **1.03** `events`, **1.02** `tech`, **1.07** `grimdark`. Measured
interaction: open the list and press ArrowDown → `aria-activedescendant` correctly becomes
`…-option-0` and `data-active` lands on the right row, and nothing visibly changes. Navigation is
`virtual: true`, so no option ever takes DOM focus either; there is no second cue. WCAG 1.4.11
asks 3:1 of a focus indicator. Same defect as #275 in the sibling `Combobox`.
**Fix:** give `[data-active]` an accent fill or a ≥3:1 inset border, not an adjacent surface step.

### 265 · MultiSelect — the list cannot be closed from the control, and blur does not dismiss it (med)

The control's `onClick` is `if (!open) setOpen(true); inputRef.current?.focus();` — it never
toggles — and the chevron is a `<span>` *inside* that control, which is also the floating
reference, so `useDismiss`'s outside-press check never fires for it. Measured: click the control
(open), click the chevron (still open), click the control again (still open). `useDismiss` alone
handles no focus-out either — measured with a following `<button>`, Tab moves focus to it and the
portalled listbox stays mounted over the page. Only Escape or an outside pointer press closes it,
so the chevron looks like a toggle and is not one, and a form full of these can strand panels.
**Fix:** toggle on control click, and add focus-out dismissal alongside `useDismiss`.

### 266 · MultiSelect — `Enter` with nothing highlighted submits the form (med)

`handleKeyDown` calls `event.preventDefault()` only inside the `Enter && open && activeIndex != null`
branch. Opening by *click* leaves `activeIndex` null (measured: `aria-activedescendant` is null
after a control click; only ArrowDown seeds it). Measured in a `<form onSubmit>`: click the
control, press Enter → **one submit fired**, with the menu still open. A user pressing Enter to
"confirm" their chips submits the form instead.
**Fix:** `preventDefault()` whenever the list is open, not only when a toggle happens.

### 267 · MultiSelect — removing a chip drops focus to the body (med)

The chip's × unmounts itself on click and the handler does not restore focus. Measured: select two
skills, focus the input, click the × on the first chip → `document.activeElement === document.body`,
so the next Tab restarts from the top of the document. The *option* click path gets this right —
it calls `inputRef.current?.focus()` — the remove handler simply omits the same call, which makes
the fix a one-liner. Instance of the pattern named for #257.
**Fix:** focus the input after `removeAt`.
