# calendar — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 319 · Calendar — the selected day fails AA on the fill it is designed for (med)

`.calendar-day[aria-selected="true"]` sets `background-color: var(--C-ACCENT)` and
`color: var(--C-TEXT-ON-ACCENT, var(--C-TEXT-INVERSE))` — the contract's own intended foreground /
background pair. Computed from the shipped theme files: **5.17:1** default, **2.80:1** `events`,
**3.81:1** `grimdark`, **14.84:1** `tech`. Two of the four shipped themes put the selected date's
digit below the 4.5:1 AA floor for body-size text, and `events` is below the 3:1 large-text floor
too. Because the selection is *also* the state that #314 may stop announcing, a user in `events` can
end up with no reliable indication of the chosen day at all. This is a token-level gap, not a
component one — every component that inks `--C-TEXT-ON-ACCENT` on `--C-ACCENT` inherits it.
**Fix:** correct the `--C-TEXT-ON-ACCENT` values in `events` and `grimdark` (or darken
`--C-ACCENT`), and add the pair to the contrast guard.

### 462 · Calendar · RangeCalendar — re-selecting the selected day re-emits (med)

`#324`'s root, one layer up and untreated. `d859a02` made `useControllableState`'s change gate's
equality injectable and defaulted `isEqual` to `Object.is`, so all 24 existing call sites were
unchanged; `5295190` then opted the two *pickers* in. The two calendars were not opted in:

- `Calendar.tsx:43-49` — `useControllableState<Date | null>({ value, defaultValue, onChange })`,
  no `isEqual`.
- `RangeCalendar.tsx:60-64` — `useControllableState<DateRange>({ … })`, no `isEqual`.

Both feed the gate a value that is rebuilt every commit, so `Object.is` can never hold:
`onDaySelect={(day) => setSelected(day)}` (`Calendar.tsx:57`) hands back a fresh `Date` built by the
month grid, and `RangeCalendar` constructs a new `{start, end}` object on every commit. Clicking the
day that is *already* selected therefore fires `onValueChange` with a value that did not change.

**Blast radius is the direct consumer.** `DatePicker` and `DateRangePicker` are shielded — they hold
their own `useControllableState` with `isSameDateValue` / `isSameDateRange` and sit above the
calendar — so this is invisible from the pickers and live for anyone rendering `<Calendar>` or
`<RangeCalendar>` themselves, which the docs present as supported. Consequences are #324's:
a controlled parent re-renders on a no-op click, dirty-tracking reports a change that did not happen,
autosave fires, audit logs record an edit.

**Fix:** pass the comparators that already exist —
`isEqual: isSameDateValue` on `Calendar`, `isEqual: isSameDateRange` on `RangeCalendar`, both from
`src/components/form/date-picker-internals.ts`. Day-granular is the right grain here for the same
reason it was there: every producer in the family is day-granular. Note the comparators currently
live in a `form/` module while these are `ui/` components — moving them to a shared location is part
of the fix, not a separate concern.
