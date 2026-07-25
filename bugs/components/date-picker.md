# date-picker — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 323 · DatePicker — a runtime `locale` change silently rewrites the date (med)

The draft is reseeded only when `selected !== lastFormattedRef.current`; `locale` and `formatOptions`
are read inside `display()` but are not part of that condition. Measured: render
`defaultValue={May 6 2026} locale="en-US"` → the field shows `5/6/2026`; switch the prop to `en-GB`
(the text does not change); focus and blur → `parseDateInput` reads the same string day-first and
`onValueChange` fires with **Fri Jun 05 2026**. A language switcher therefore mutates every date
field on the page the next time the user touches one, with no warning and no way to tell from the
screen that it happened.
**Fix:** include `locale`/`formatOptions` in the reseed condition, reformatting the draft when
either changes.

### 324 · DatePicker — every blur commits, even with no edit (med)

`handleBlur` calls `commit()` unconditionally, and `commit` calls `setSelected` on any parseable
draft, and `useControllableState` notifies on every setter call. Measured with
`defaultValue={Jun 10 2026}`: click the field, click away, repeat → `onValueChange` fires **twice**
with two distinct `Date` objects for a value that never changed. An untouched *empty* picker fires
`onValueChange(null)` on its first blur. Consequences: a controlled parent re-renders on every blur,
dirty-tracking ("has this form changed?") reports a change that did not happen, autosave fires, and
audit logs record an edit.
**Fix:** only call `setSelected` when the parsed result differs from the current committed day.

### 325 · DatePicker — the controlled re-seed compares `Date`s by identity (med)

`if (selected !== lastFormattedRef.current)` is a reference comparison, so a parent that builds
`value={new Date(row.dueDate)}` inline produces a *different object every render* and reseeds the
draft each time. Measured: parent renders `<DatePicker value={new Date(2026,0,15)}/>`; the user types
`12/25/20`; an unrelated parent state change re-renders → the input snaps back to `1/15/2026`
mid-keystroke. `value={stateVariable}` is unaffected, which is why this survives casual testing —
but the inline form is the most natural-looking controlled usage and it destroys typing.
**Fix:** compare by calendar day (`getTime()`/`isSameDay`) rather than object identity.

### 326 · DatePicker — opening the calendar focuses the wrong control (med)

`FloatingFocusManager` is given no `initialFocus`, so it focuses the first tabbable node in the
popover — the "Previous month" `IconButton`. Measured: open by click or keyboard, press `ArrowRight`,
and focus is still on "Previous month" with no day moved; the dialog's tab stops are
`Previous month → the month caption → Next month → the roving day`, so **three** `Tab`s are needed
before the arrow keys do anything. The whole point of the roving tab index in the grid is that a
keyboard user lands on the selected day and arrows from there.
**Fix:** pass `initialFocus` pointing at the roving day button (`[data-day]` with `tabIndex={0}`).

### 327 · DatePicker — control labels are hard-coded English (med)

"Open calendar", "Clear date" and the dialog's "Choose date" are literals on elements the caller
cannot reach (rest props go to the visible input, not to the buttons or the popover), and
`CalendarBase` adds "Previous month"/"Next month" the same way. Measured with `locale="fr-FR"`: the
month names, weekday headers and per-day accessible names are all correctly French, and the controls
around them still announce English. There is no `labels`/`messages` prop, and `aria-label` on the
component lands on the text input. Instance of the "hard-coded English in unreachable strings"
pattern (#39, #64, #218, #222, #243, #259).
**Fix:** accept a `labels` prop (or derive from `locale`) for the three DatePicker strings and
forward the pair down to `Calendar`.

### 328 · DatePicker — the text input advertises a dialog it cannot open (med)

`getReferenceProps()` is spread onto the `Input`, but `useInteractions` is built from
`[dismiss, role]` only — there is no `useClick`, `useFocus` or keydown that opens the popover from
the reference. Measured: the input renders `aria-haspopup="dialog"` and `aria-expanded="false"`
closed, and gains `aria-controls="_r_8_"` when open; clicking it or pressing `Enter` on it never
opens anything (`Enter` commits the typed date instead). The trigger `IconButton` meanwhile carries
hand-written `aria-haspopup`/`aria-expanded` but **no** `aria-controls`. So the popup is announced
twice, on the wrong control, and the control that actually owns it is not linked to it. Same defect
as #333 in `DateRangePicker` — they share `date-picker-internals` and the same shape of wiring.
**Fix:** spread `getReferenceProps()` on the `IconButton` and drop its duplicate hand-written ARIA,
keeping `onBlur`/`onKeyDown` on the input.
