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
~~**Fix:** include `locale`/`formatOptions` in the reseed condition, reformatting the draft when
either changes.~~

**This prescription is moot — there is no reseed condition any more.** `5295190` deleted the reseed
and `lastFormattedRef` outright rather than repairing them: `DatePicker.tsx:108` now derives the field
text on every render (`const text = draft ?? display(selected, locale, formatOptions)`), so `locale`
is read unconditionally and cannot be left out of a condition that no longer exists. The draft is a
transient `string | null` override that every commit path clears. Re-measured on the `en-US` → `en-GB`
switch: the field reformats to `06/05/2026` and a subsequent focus/blur emits **0**, where it
previously committed Jun 5. Closed as a side effect of #324/#325 — see the ledger for status.

### 324 · DatePicker — every blur commits, even with no edit (med)

`handleBlur` calls `commit()` unconditionally, and `commit` calls `setSelected` on any parseable
draft, and `useControllableState` notifies on every setter call. Measured with
`defaultValue={Jun 10 2026}`: click the field, click away, repeat → `onValueChange` fires **twice**
with two distinct `Date` objects for a value that never changed. An untouched *empty* picker fires
`onValueChange(null)` on its first blur. Consequences: a controlled parent re-renders on every blur,
dirty-tracking ("has this form changed?") reports a change that did not happen, autosave fires, and
audit logs record an edit.
**Fix, as applied** (`d859a02` + `5295190`, both needed): rather than guarding the call site,
`useControllableState`'s change gate took an injectable `isEqual` (defaulting to `Object.is`, so all
24 existing call sites were untouched), and `DatePicker.tsx:101` opted in with
`isEqual: isSameDateValue` — day-granular, because every producer in this family is
(`parseDateInput` yields midnight, the calendar yields a grid day, `toISODate` submits a day).
`handleBlur` still commits unconditionally; the fresh `Date` from `clampDate` now simply compares
equal to the committed day, so a no-edit blur emits **0** (was 1). Note the same gate is *not* opted
in on `Calendar`/`RangeCalendar` — that is #462.

### 325 · DatePicker — the controlled re-seed compares `Date`s by identity (med)

`if (selected !== lastFormattedRef.current)` is a reference comparison, so a parent that builds
`value={new Date(row.dueDate)}` inline produces a *different object every render* and reseeds the
draft each time. Measured: parent renders `<DatePicker value={new Date(2026,0,15)}/>`; the user types
`12/25/20`; an unrelated parent state change re-renders → the input snaps back to `1/15/2026`
mid-keystroke. `value={stateVariable}` is unaffected, which is why this survives casual testing —
but the inline form is the most natural-looking controlled usage and it destroys typing.
~~**Fix:** compare by calendar day (`getTime()`/`isSameDay`) rather than object identity.~~

**Superseded by a stronger fix — the comparison was removed, not corrected.** `5295190` deleted the
reseed and `lastFormattedRef` and made the draft a transient override over text derived from the
committed `Date` (`DatePicker.tsx:107-108`), so no `Date` identity comparison remains to get wrong.
An inline `value={new Date(…)}` on an unrelated parent re-render no longer touches in-progress
typing. Same treatment applied to #335 one component over.

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

### 429 · DatePicker — the advertised `form.field()` binding crashes it (high)

`onChange` is `Omit`ted from the public type and not destructured, and a JSX spread does
no excess-property checking, so `<DatePicker {...form.field<Date>("due")} />` — the binding
**README.md:203 and AGENTS.md:249 both advertise** — typechecks clean and then throws
`TypeError: d.getFullYear is not a function` (src/util/date.ts:130 via DatePicker.tsx:184)
on the first keystroke, because the form's handler receives a DOM event and writes it where
a `Date` is expected. Same class as #245, same measured severity: the documented binding
is a crash.
**Fix direction is a door** — see PLAN.md §3. The narrow patch (destructure `onChange` out)
stops the crash but leaves the control inert, since `field()` also supplies `value`.
