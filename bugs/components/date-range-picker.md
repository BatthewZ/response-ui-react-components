# date-range-picker — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 333 · DateRangePicker — the start input claims the popup, the trigger owns it (med)

`referenceProps` (from `getReferenceProps()`) is spread onto the **start** `Input` only. Measured
with the popover open: the start input renders `aria-haspopup="dialog" aria-expanded="true"
aria-controls="_r_4_"`, the end input renders none of the three, and the "Open calendar"
`IconButton` — the only control that toggles the dialog — has hand-written `aria-haspopup` and
`aria-expanded` but no `aria-controls`. A screen-reader user is told the start textbox opens a
dialog (nothing on it does), told nothing about the end textbox, and given no association from the
real trigger to the thing it controls. The two fields also announce asymmetrically despite being a
matched pair.
**Fix:** spread `getReferenceProps()` on the `IconButton` and drop its duplicate ARIA; keep
`onBlur`/`onKeyDown` on the two inputs.

### 334 · DateRangePicker — a blacked-out typed date destroys a committed endpoint (med)

`resolve()` returns `null` for a draft that parses but that `isDateDisabled` rejects, and `commit`
treats "parsed" as valid, so `start`/`end` is set to that `null`. Unparseable text takes the other
branch and is preserved. Measured with
`defaultValue={{start: 1 Jun 2026, end: 30 Jun 2026}}` and weekends blocked: typing `06/13/2026` (a
Saturday) into the start field and blurring leaves the field **empty** and fires
`onValueChange({start: null, end: 30 Jun})` — no message, no `aria-invalid`. Typing `garbage` instead
reverts harmlessly. The more plausible user mistake is the destructive one, and it silently deletes
data the user did not touch.
**Fix:** in `commit`, treat a parseable-but-disabled draft like an invalid one — fall back to
`range.start`/`range.end` rather than to `resolve()`'s `null`.

### 335 · DateRangePicker — the draft re-seed compares the range by identity (med)

`if (range !== lastRangeRef.current)` compares object references, so a controlled
`value={{ start, end }}` written as a fresh literal is a new object on every parent render and
reseeds both drafts. Measured: parent renders
`<DateRangePicker value={{start: new Date(2026,5,10), end: null}}/>`; the user types `06/1` into the
end field; any unrelated parent re-render makes the check true and the draft goes `"06/1"` → `""`.
`value={stateVariable}` is stable and unaffected, but `value={{ start, end }}` inline is the shape
most callers reach for first. Same defect as #325 one component over.
**Fix:** compare endpoint timestamps (`start?.getTime()` / `end?.getTime()`) instead of identity.

### 336 · DateRangePicker — both fields are named in hard-coded English and take no `id` (med)

`aria-label="Start date"` and `aria-label="End date"` are literals on the two `Input`s; rest props
land on the wrapper `div`, so no caller can rename them, and no `id` is forwarded to either input.
Measured with `locale="fr-FR"`: French month names in the calendar, two inputs still announced
"Start date"/"End date". Because the fields have no `id`, `<Label htmlFor>` has nothing to bind to —
and even if it did, an `aria-label` outranks a native label in the accessible-name computation, the
same trap measured on `SearchInput` (#222). The documented workaround (name the *pair* with
`role="group"` + `aria-labelledby`) works, but leaves the two English field names underneath it.
**Fix:** accept `startLabel`/`endLabel` props defaulting to the current strings, and forward an `id`
to each input.
