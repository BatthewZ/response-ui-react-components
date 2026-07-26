# DateRangePicker

Two typeable date fields and one shared calendar popover, for picking a start and an end
date together. Each endpoint accepts a date typed in the user's locale format or clicked in
the popover's two-month [RangeCalendar](range-calendar.md), endpoints entered in the wrong order are swapped
for you, and `name` emits two hidden `YYYY-MM-DD` inputs so a plain `<form>` post carries the
range with no client state.

<!-- example:Minimal -->
```tsx
<DateRangePicker name="stay" startPlaceholder="Check in" endPlaceholder="Check out" />
```
<!-- /example -->

| Prop               | Type                          | Default                       |
| ------------------ | ----------------------------- | ----------------------------- |
| `value`            | `DateRange`                   | — (uncontrolled)              |
| `defaultValue`     | `DateRange`                   | `{ start: null, end: null }`  |
| `onValueChange`    | `(range: DateRange) => void`  | —                             |
| `onChange`         | `(range: DateRange) => void`  | —                             |
| `defaultMonth`     | `Date`                        | first selected date, else today |
| `min`              | `Date`                        | —                             |
| `max`              | `Date`                        | —                             |
| `isDateDisabled`   | `(date: Date) => boolean`     | —                             |
| `locale`           | `string`                      | `"en-US"`                     |
| `formatOptions`    | `Intl.DateTimeFormatOptions`  | —                             |
| `numberOfMonths`   | `number`                      | `2`                           |
| `startPlaceholder` | `string`                      | — (no placeholder)            |
| `endPlaceholder`   | `string`                      | — (no placeholder)            |
| `rejectMessage`    | `(reason, text) => string`    | `` `${text} is not a date we can read.` `` |
| `error`            | `boolean`                     | `Field` state, else `false`   |
| `disabled`         | `boolean`                     | `false`                       |
| `name`             | `string`                      | —                             |
| `className`        | `string`                      | —                             |
| `ref`              | `Ref<HTMLDivElement>`         | —                             |
| …rest              | props of `<div>`; `color` is a compile error; `value` / `defaultValue` / `onChange` are re-typed above | — |

`DateRange` is `{ start: Date | null; end: Date | null }`, exported from the package root.
Both endpoints are independently nullable, which is what makes a half-picked range
representable — and what you receive mid-pick, so see [Gotchas](#gotchas).

`color` is the one prop you cannot pass at all: it is declared `color?: never`, so writing
one is a **compile error**. `Omit` alone was not enough — a JSX spread performs no
excess-property check, so a `color` in a spread object used to reach the wrapper `<div>` and
render as the legacy HTML attribute.

Rest props land on the **wrapper `<div>`**, not on either input: `className`, `id`,
`data-*`, `role` and `aria-*` all address the pair as a unit. It holds the field row and, below
it, the refusal message; the *field row* is the floating anchor the popover positions against,
so a message appearing does not push the calendar away from the fields. `onChange` is the exception — it carries the committed
`DateRange`, the same payload as `onValueChange` rather than a `ChangeEvent`, and is
destructured out before the spread so it never reaches the div. That is what makes
`{...form.field<DateRange>("stay")}` bind the pair — though the `aria-invalid` that binding
also emits lands on the wrapper like any other rest prop, so a store-level error reddens
neither field. Route that through an enclosing [Field](field.md) or the `error` prop
instead.

## What it renders

One `relative` wrapper containing, in DOM order: two hidden `<input type="hidden">` (only
when `name` is set), a field row holding the start [Input](input.md), an `aria-hidden` en-dash
separator, the end [Input](input.md) and an [IconButton](icon-button.md) that toggles the
popover — and after that row, the refusal message element. The popover itself is portalled to
the end of `<body>` and holds a [RangeCalendar](range-calendar.md).

The two text fields are the primary control — the calendar is an alternative, not the only
way in. Typing commits on **Enter** or on **blur**; there is no per-keystroke parsing, so a
half-typed date never briefly resolves to the wrong day.

## Controlled

<!-- example:Controlled -->
```tsx
<DateRangePicker
  value={stay}
  onValueChange={setStay}
  startPlaceholder="Check in"
  endPlaceholder="Check out"
/>
<Text variant="body-3" color="secondary">
  {stay.start && stay.end
    ? `${stay.start.toLocaleDateString()} – ${stay.end.toLocaleDateString()}`
    : "Pick a check-in and a check-out date"}
</Text>
```
<!-- /example -->

Uncontrolled is the default: pass `defaultValue` (or nothing) and read the range off
`onValueChange`, or off the form via `name`. Pass `value` and the component is controlled
for its whole life — the mode is locked on first render.

`onValueChange` fires **twice** for one calendar pick: once with
`{ start: <first day>, end: null }` when the first endpoint lands, then again with both. Any
handler that persists or validates on change has to tolerate that intermediate shape.

**The `DateRange` object no longer has to be stable.** Each field's text is *derived* from the
committed range, and the draft you are typing is a transient override on top of it that only a
commit clears — so a fresh literal `value={{ start, end }}` rebuilt on every parent render no
longer resets what you were typing. Measured: a half-typed `"06/1"` survives an unrelated
parent re-render, where it used to become `""`. The gate deciding whether `onValueChange` fires
compares both endpoints **day-granularly** for the same reason, so two ranges naming the same
two days are the same value.

## Bounds and blackout days

<!-- example:Bounds -->
```tsx
<DateRangePicker
  name="workshop"
  min={new Date(2026, 5, 1)}
  max={new Date(2026, 7, 31)}
  isDateDisabled={(day) => day.getDay() === 0 || day.getDay() === 6}
  defaultMonth={new Date(2026, 5, 1)}
  startPlaceholder="First day"
  endPlaceholder="Last day"
/>
```
<!-- /example -->

`min` and `max` grey out days in the calendar. `isDateDisabled` runs per day for anything
finer — weekends, booked-out dates, holidays.

They behave **differently for typed input**:

- Out of `[min, max]` → **clamped**, silently. With `min` at 1 June 2026, typing `01/01/2020`
  commits and redisplays as `6/1/2026`. A clamp is a successful commit, not a refusal.
- Rejected by `isDateDisabled` → **refused**. The committed endpoint does not move, your entry
  stays in the field, that field goes `aria-invalid`, and the `"unavailable"` message says so.
- Unparseable (`"garbage"`) → **refused** the same way, with the `"unparseable"` message.

Two of the three used to be silent, and the `isDateDisabled` case used to *clear* the endpoint
outright — the most plausible mistake of the three was the one that destroyed a committed date.
Both are fixed; see [Saying why a date was refused](#saying-why-a-date-was-refused). The clamp
is still silent by design, so if a bound matters to your server, validate there too.

## Saying why a date was refused

<!-- example:RejectMessage -->
```tsx
<DateRangePicker
  startPlaceholder="Check in"
  endPlaceholder="Check out"
  isDateDisabled={(day) => day.getDay() === 0}
  rejectMessage={(reason, text) =>
    reason === "unavailable"
      ? `No check-ins on ${text}.`
      : `${text} is not a date. Try MM/DD/YYYY.`
  }
/>
```
<!-- /example -->

`rejectMessage` is called with the reason — `"unparseable"` when the text could not be read at
all, `"unavailable"` when `isDateDisabled` refused the day it named — and the text that was
refused. It is the same prop, with the same signature, on [DatePicker](date-picker.md); there is
one convention between the two pickers, not two.

**Both endpoints share one message element**, below the pair. A commit that refuses both writes
both sentences into it, in field order, separated by a space — which is why the default quotes
the text back: that is what tells the two apart. `aria-invalid` is per field, so the red border
still points at the endpoint that caused it, and an endpoint the user never typed into is never
blamed.

The message is rendered in `--C-STATUS-ERROR` inside a polite live region that is mounted
whether or not it holds anything (a region created in the same commit as its first text is not
reliably announced — the same reason [TagInput](tag-input.md) and [Repeater](repeater.md) mount
theirs unconditionally). Return `""` to render nothing; `aria-invalid` still reflects the
refusal, because `""` removes the word, not the state.

Editing a refused field clears its message and its invalid state immediately, and `Enter` on a
draft already refused and not edited since is left alone, so the pair can still submit the form
it sits in rather than eating the key forever.

## Months shown

<!-- example:SingleMonth -->
```tsx
<DateRangePicker numberOfMonths={1} startPlaceholder="From" endPlaceholder="To" />
```
<!-- /example -->

Below the design system's 40rem breakpoint the calendar collapses to **one** paged month
whatever `numberOfMonths` says — stacked grids overflow a phone-width popover. In either
layout the ‹ › header buttons shift the whole visible window by exactly one month.

`defaultMonth` decides the opening month whether or not the range is set — it is the month
you named, so it beats the one inferred from `start`/`end`. Omit it and the calendar opens on
the range instead. Either way reopening re-anchors, because the popover unmounts when closed;
and while it is open, a range change from outside the calendar moves the view to follow it.

## Locale and display format

<!-- example:LocalizedFormat -->
```tsx
<DateRangePicker
  locale="en-GB"
  formatOptions={{ dateStyle: "medium" }}
  defaultValue={{ start: new Date(2026, 5, 14), end: new Date(2026, 5, 21) }}
/>
```
<!-- /example -->

`locale` does double duty — it names the months and weekdays in the calendar *and* decides
how a typed numeric date is read. `06/07/2026` is 7 June under `en-US` and 6 July under
`en-GB`; nothing on screen tells the user which, so set `locale` to match your audience.

`formatOptions` is passed to `Intl.DateTimeFormat` for the two fields only (the calendar
does not take it). Whatever you choose has to **survive a round trip**: the field renders
with `formatOptions`, and the user's edit is read back by a parser that understands either
three numbers in the locale's field order, or a localized month name plus a day and a year.
`{ dateStyle: "medium" }` round-trips in `en-GB` (`14 Jun 2026` → back to 14 June 2026). A
format that drops the year does not — see [Gotchas](#gotchas).

## In a Field

<!-- example:InField -->
```tsx
<Field error="Choose a check-in and a check-out date">
  <Label id="stay-label">Travel dates</Label>
  <DateRangePicker
    role="group"
    aria-labelledby="stay-label"
    name="stay"
    startPlaceholder="Check in"
    endPlaceholder="Check out"
  />
  <FieldError />
</Field>
```
<!-- /example -->

Both inputs read [Field](field.md)'s error from context, so an invalid field gives them
`aria-invalid="true"` and points their `aria-describedby` at the
[FieldError](field-error.md) with **no `error` prop passed**. Setting `error` explicitly
overrides the field in both directions — `error={false}` forces both inputs valid inside an
errored [Field](field.md).

The [Label](label.md) here carries no `htmlFor`, because there is no single control to point
it at: this is two inputs, and neither takes an `id`. Naming the pair is done with
`role="group"` and `aria-labelledby` on the wrapper instead, which rest props make possible.
Without that, the only names in the accessibility tree are the built-in `"Start date"` and
`"End date"` — see [Accessibility](#accessibility).

## Native form submission

<!-- example:NativeForm -->
```tsx
<form action="/api/bookings" method="post">
  <DateRangePicker name="stay" startPlaceholder="Check in" endPlaceholder="Check out" />
  <FormActions>
    <Button type="submit">Request booking</Button>
  </FormActions>
</form>
```
<!-- /example -->

`name="stay"` renders `<input type="hidden" name="stay.start">` and `<input type="hidden"
name="stay.end">`, each carrying a **local** `YYYY-MM-DD` string (built from the local
calendar fields, not `toISOString()`, so the day never shifts by one for a user east or west
of UTC). An empty endpoint submits `""`. The dot is just a character in the name, so
`FormData` hands you the two flat keys — `formData.get("stay.start")` and
`formData.get("stay.end")`; whether anything nests them into an object is your server-side
parser's business, not this component's.

## Disabled

<!-- example:Disabled -->
```tsx
<DateRangePicker
  disabled
  name="stay"
  defaultValue={{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 18) }}
/>
```
<!-- /example -->

## Theme tokens

DateRangePicker has no `.css` of its own. Everything it paints comes from Tailwind utilities
in its own `.tsx` and in the two same-directory modules it is built from — [Input](input.md), which
draws the fields, and `date-picker-internals`, which holds the popover shell's class list
(shared verbatim with [DatePicker](date-picker.md), so the two pickers can't drift apart). Override any
variable below and both re-tint at runtime, with no rebuild.

| Where                       | Utility                                                | Override                          |
| --------------------------- | ------------------------------------------------------ | --------------------------------- |
| Field row gaps              | `gap-r6`                                               | `--R-SIZE-6`                      |
| Field text                  | `text-body-2` `text-fg-primary`                        | `--BodyText-2` `--C-TEXT-PRIMARY` |
| Separator dash, placeholders| `text-fg-muted` `placeholder:text-fg-muted`            | `--C-TEXT-MUTED`                  |
| Field and popover fill      | `bg-surface-0`                                         | `--C-SURFACE-0`                   |
| Disabled field fill         | `disabled:bg-surface-3`                                | `--C-SURFACE-3`                   |
| Field border                | `border-border-strong`                                 | `--C-BORDER-STRONG`               |
| Popover border              | `border-border-default`                                | `--C-BORDER-DEFAULT`              |
| Focus ring and border       | `focus:ring-border-focus` `focus:border-border-focus` | `--C-BORDER-FOCUS` |
| Error border and ring       | `border-status-error` `focus:ring-status-error` | `--C-STATUS-ERROR`               |
| Field padding               | `px-r4` `py-r5`                                        | `--R-SIZE-4` `--R-SIZE-5`         |
| Popover padding             | `p-r5`                                                 | `--R-SIZE-5`                      |
| Corner radius               | `rounded-md`                                           | `--RADIUS-MD`                     |
| Popover shadow              | `shadow-md`                                            | `--SHADOW-MD`                     |
| Transition                  | `duration-fast`                                        | `--DURATION-FAST`                 |
| Refusal message             | `mt-r6` `text-body-3` `text-status-error`              | `--R-SIZE-6` `--BodyText-3` `--C-STATUS-ERROR` |

The spacing tokens are on the responsive `r`-scale and step up at the 40rem breakpoint:
`--R-SIZE-4` from `0.75rem` to `1.25rem` and `--R-SIZE-5` from `0.5rem` to `0.75rem`, so the
fields and the popover both loosen on desktop. `--R-SIZE-6` sits on the same scale but holds
at `0.25rem` on both sides, so the gap between the two fields and the trigger stays constant.

**The table stops at the popover's own frame.** The calendar drawn inside it belongs to
[RangeCalendar](range-calendar.md), which is not a same-directory sibling of this file — its day cells, range
fill, hover preview and header live in `Calendar.css` and are documented on its own page.
The trigger is an [IconButton](icon-button.md) and carries that component's tokens.

Three popover measurements are deliberately **off** the contract, because they are viewport
arithmetic rather than design decisions: a width of `calc(100vw - 1.5rem)` that relaxes to
`auto` from 40rem up, an unconditional `max-width` of the same value that keeps it there at
every size, and an `85vh` scroll cap. They keep a two-month calendar inside a phone screen;
a themeable value would not know the viewport.

The separator dash is `--C-TEXT-MUTED`, the contract's hint-level ink
([theme contract](../theme-contract.md)) — it is the only visual cue that the two fields form
one range, and it is `aria-hidden`, so nothing announces it. Name the group if that
relationship has to survive without sight of the dash.

## Gotchas

- **A clamp is still silent; the two refusals are not.** Outside `[min, max]` a typed date
  moves into range and commits with no signal. Unreadable text and an `isDateDisabled` day are
  refusals: the committed endpoint holds, your entry stays in the field, that field goes
  `aria-invalid`, and a message says which. See
  [Bounds and blackout days](#bounds-and-blackout-days).
- **A refusal leaves your typing in the field.** So a field showing `06/11` while the hidden
  input posts `2026-06-10` is the expected state, not a bug — the entry is kept so it can be
  corrected rather than retyped.
- **Reordering happens on commit, not on render — and a reversed range is the one case where
  a no-edit blur still fires.** Type or click the endpoints in either order and the earlier one
  lands in the start field. A reversed `value`/`defaultValue` renders exactly as given, but the
  commit pipeline runs on every blur, so simply focusing a field and tabbing away reorders it
  without an edit. Measured: `{ start: 20 June, end: 10 June }` renders `6/20/2026` /
  `6/10/2026`, and one no-edit blur rewrites the fields to `6/10/2026` / `6/20/2026` and fires
  `onValueChange`. A blur on an already-ordered range emits **0** — the pipeline still runs, it
  just resolves to the range already held and the change gate drops it (it used to fire one
  callback per blur regardless).
- **The popover does not close when a range completes.** Picking both endpoints leaves it
  open — reasonable, since adjusting an endpoint is common — so closing is the user's job:
  `Escape`, a click outside, or the calendar button again. There is no `open` prop and no
  `onOpenChange`, so you cannot open or close it from your own code either.
- **`onValueChange` emits a half-range** on the first calendar click — `{ start, end: null }`
  before the pair completes. Any handler that persists or validates on change has to tolerate
  that shape. (An inline `value={{ … }}` object no longer wipes what the user is typing; see
  [Controlled](#controlled).)
- **`formatOptions` that hides a field makes the displayed text uneditable.** The parser
  needs three numbers in the locale's field order, or a month name plus a day and a year.
  Give it `{ month: "2-digit", day: "2-digit" }` and a field renders as `06/10`, which parses
  to nothing. Typing a **complete** date over it still commits — measured, `06/05/2026` in
  the start field fires `onValueChange` with 5 June 2026 — but the field then redisplays
  `06/05`, so the committed year is never on screen. Editing the *displayed* text is still
  discarded, because it is not a date the parser can read — but it is no longer discarded in
  silence: that edit is a refusal now, so the field goes `aria-invalid` and the message names
  the text it could not read. Choose a format that shows every field the parser needs.
- **`disabled` does not stop submission.** It disables the two inputs and the trigger, but
  the hidden `name` inputs are never disabled, so a disabled picker still posts its dates —
  unlike a native disabled control, which the browser excludes.
- **No placeholders by default.** With `startPlaceholder`/`endPlaceholder` unset, an empty
  picker is two blank boxes and a dash. The `"Start date"` / `"End date"` names exist only in
  the accessibility tree. Pass both, or put a visible caption above the pair.
- **Client component.** It ships its own `"use client"`, so importing it into a Server
  Component is fine — it just marks the client boundary there. What has to survive that
  boundary is its props: `Date`, `string` and `number` serialize, but `isDateDisabled` and
  `onValueChange` are functions and do not, so pass those from a Client Component.

## Accessibility

Tab order is start field → end field → calendar button. Both fields are ordinary text inputs,
so every editing shortcut the platform provides works, and the range can be filled in without
ever opening the calendar.

- **The two fields are named `"Start date"` and `"End date"`,** hard-coded in English on the
  component. They take no `id`, so a `<label for>` has nothing to bind to, and the built-in
  `aria-label` would outrank it anyway. Neither name is localizable or overridable. Name the
  *pair* instead — `role="group"` plus `aria-labelledby` on the wrapper, as in
  [In a Field](#in-a-field) — so a screen-reader user hears "Travel dates, group" before
  "Start date, edit text".
- **The calendar button is the popover trigger,** labelled `"Open calendar"`, with
  `aria-haspopup="dialog"` and `aria-expanded`. Clicking or `Enter`/`Space` toggles it.
- **The start field also claims the popup it cannot open.** It carries
  `aria-haspopup="dialog"`, `aria-expanded` and (while open) `aria-controls`, because the
  floating reference props are spread onto it — but nothing on that input opens the popover.
  The end field carries none of it, so the same pair of controls announces asymmetrically.
- **Opening moves focus into the popover,** landing on its "Previous month" button. `Tab`
  walks the rest of the header and then reaches the day grid, where arrow keys move by day,
  `Home`/`End` by week edge, and `PageUp`/`PageDown` by month. Each day button is named with
  its full localized date and marked `aria-selected`; today gets `aria-current="date"`. In
  the single-month layout the header caption is itself a button that drills into a month
  and then a year picker.
- **The popover is non-modal and is not a focus trap.** It is portalled to the end of
  `<body>`, and it holds only a handful of tab stops — the header controls plus the one day
  button that owns the roving tab index. Tabbing past the last of them moves focus on to
  whatever follows the picker in the page **and closes the popover**. Measured at the default
  two months, the whole dialog is three `Tab`s wide: previous-month → next-month → the roving
  day, and the fourth `Tab` lands outside with the dialog already gone. `Escape` also closes
  it, and returns focus to the start field.
- **The `error` prop's state is conveyed by colour and `aria-invalid` only.** That red border
  carries no text; inside an errored [Field](field.md) the inputs point at the
  [FieldError](field-error.md), so render one with real content. The picker's *own* refusals do
  carry text — see [Saying why a date was refused](#saying-why-a-date-was-refused) — and
  standalone, that message's id is joined into both fields' `aria-describedby`. Inside a
  [Field](field.md) that renders a [FieldError](field-error.md) it is not: the field's error id
  wins there, because the description comes from [Input](input.md)'s own wiring. The message is
  still visible and still announced.
- **Selection is announced per day, not per range.** A day button says it is selected; nothing
  announces "8 nights" or "10 June to 18 June". The text fields hold the authoritative
  answer, which is another reason to name the group.

## Related

[RangeCalendar](range-calendar.md) · [Calendar](calendar.md) · [DatePicker](date-picker.md) · [Input](input.md) · [Field](field.md) ·
[FieldError](field-error.md) · [Label](label.md) · [IconButton](icon-button.md) ·
[FormActions](form-actions.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
