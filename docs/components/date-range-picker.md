# DateRangePicker

Two typeable date fields and one shared calendar popover, for picking a start and an end
date together. Each endpoint accepts a date typed in the user's locale format or clicked in
the popover's two-month `RangeCalendar`, endpoints entered in the wrong order are swapped
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
| `defaultMonth`     | `Date`                        | first selected date, else today |
| `min`              | `Date`                        | —                             |
| `max`              | `Date`                        | —                             |
| `isDateDisabled`   | `(date: Date) => boolean`     | —                             |
| `locale`           | `string`                      | `"en-US"`                     |
| `formatOptions`    | `Intl.DateTimeFormatOptions`  | —                             |
| `numberOfMonths`   | `number`                      | `2`                           |
| `startPlaceholder` | `string`                      | — (no placeholder)            |
| `endPlaceholder`   | `string`                      | — (no placeholder)            |
| `error`            | `boolean`                     | `Field` state, else `false`   |
| `disabled`         | `boolean`                     | `false`                       |
| `name`             | `string`                      | —                             |
| `className`        | `string`                      | —                             |
| `ref`              | `Ref<HTMLDivElement>`         | —                             |
| …rest              | props of `<div>`, minus `onChange` / `value` / `defaultValue` / `color` | — |

`DateRange` is `{ start: Date | null; end: Date | null }`, exported from the package root.
Both endpoints are independently nullable, which is what makes a half-picked range
representable — and what you receive mid-pick, so see [Gotchas](#gotchas).

Rest props land on the **wrapper `<div>`**, not on either input: `className`, `id`,
`data-*`, `role` and `aria-*` all address the pair as a unit. That div is also the floating
anchor the popover positions against.

## What it renders

One `relative` wrapper containing, in DOM order: two hidden `<input type="hidden">` (only
when `name` is set), the start [Input](input.md), an `aria-hidden` en-dash separator, the end
[Input](input.md), and an [IconButton](icon-button.md) that toggles the popover. The popover
itself is portalled to the end of `<body>` and holds a `RangeCalendar`.

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

**Hold the `DateRange` in state, don't build it inline.** The text drafts are re-seeded from
`value` by a *reference* comparison, so a fresh object literal — `value={{ start, end }}`
rebuilt on every parent render — resets whatever the user was typing the moment anything
else in the parent re-renders. `value={stateVariable}` is stable and does not.

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

They behave **differently for typed input**, and the difference is not cosmetic:

- Out of `[min, max]` → **clamped**. With `min` at 1 June 2026, typing `01/01/2020` commits
  and redisplays as `6/1/2026`.
- Rejected by `isDateDisabled` → **cleared**. The endpoint becomes `null` and the field goes
  empty, discarding whatever was previously committed there.
- Unparseable (`"garbage"`) → **reverted** to the last committed value.

Three inputs, three different outcomes, none of them signalled to the user. If a blackout
date matters, validate the committed range yourself and surface it through
[FieldError](field-error.md).

## Months shown

<!-- example:SingleMonth -->
```tsx
<DateRangePicker numberOfMonths={1} startPlaceholder="From" endPlaceholder="To" />
```
<!-- /example -->

Below the design system's 40rem breakpoint the calendar collapses to **one** paged month
whatever `numberOfMonths` says — stacked grids overflow a phone-width popover. In either
layout the ‹ › header buttons shift the whole visible window by exactly one month.

`defaultMonth` only decides the opening month while the range is still empty. Once `start`
(or `end`) is set, the calendar anchors on it instead: with `defaultMonth` at January 2026
and a `defaultValue` starting in September, the popover opens on September/October. Reopening
always re-anchors, because the popover unmounts when closed.

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
errored `Field`.

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
in its own `.tsx` and in the two same-directory modules it is built from — `Input`, which
draws the fields, and `date-picker-internals`, which holds the popover shell's class list
(shared verbatim with `DatePicker`, so the two pickers can't drift apart). Override any
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
| Focus ring and border       | `focus:ring-border-focus` `focus:border-border-focus`  | `--C-BORDER-FOCUS`                |
| Error border and ring       | `border-status-error` `focus:ring-status-error`        | `--C-STATUS-ERROR`                |
| Field padding               | `px-r4` `py-r5`                                        | `--R-SIZE-4` `--R-SIZE-5`         |
| Popover padding             | `p-r5`                                                 | `--R-SIZE-5`                      |
| Corner radius               | `rounded-md`                                           | `--RADIUS-MD`                     |
| Popover shadow              | `shadow-md`                                            | `--SHADOW-MD`                     |
| Transition                  | `duration-fast`                                        | `--DURATION-FAST`                 |

The spacing tokens are on the responsive `r`-scale and step up at the 40rem breakpoint:
`--R-SIZE-4` from `0.75rem` to `1.25rem` and `--R-SIZE-5` from `0.5rem` to `0.75rem`, so the
fields and the popover both loosen on desktop. `--R-SIZE-6` sits on the same scale but holds
at `0.25rem` on both sides, so the gap between the two fields and the trigger stays constant.

**The table stops at the popover's own frame.** The calendar drawn inside it belongs to
`RangeCalendar`, which is not a same-directory sibling of this file — its day cells, range
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

- **A typed date fails three different ways, all silently.** Outside `[min, max]` it clamps,
  an `isDateDisabled` day *clears* the endpoint outright, and unparseable text reverts — so
  the most plausible mistake of the three is the one that destroys a committed date. See
  [Bounds and blackout days](#bounds-and-blackout-days).
- **Reordering happens on commit, not on render.** Type or click the endpoints in either
  order and the earlier one lands in the start field. A reversed `value`/`defaultValue`
  renders exactly as given — but a commit is unconditional, so simply focusing a field and
  tabbing away reorders it without an edit. Measured:
  `{ start: 20 June, end: 10 June }` renders `6/20/2026` / `6/10/2026`, and one no-edit blur
  rewrites the fields to `6/10/2026` / `6/20/2026` and fires `onValueChange`.
- **The popover does not close when a range completes.** Picking both endpoints leaves it
  open — reasonable, since adjusting an endpoint is common — so closing is the user's job:
  `Escape`, a click outside, or the calendar button again. There is no `open` prop and no
  `onOpenChange`, so you cannot open or close it from your own code either.
- **`onValueChange` emits a half-range** on the first calendar click, and an inline
  `value={{ … }}` object wipes whatever the user is typing. Both are the same trap from
  different ends — see [Controlled](#controlled).
- **`formatOptions` that hides a field makes the displayed text uneditable.** The parser
  needs three numbers in the locale's field order, or a month name plus a day and a year.
  Give it `{ month: "2-digit", day: "2-digit" }` and a field renders as `06/10`, which parses
  to nothing. Typing a **complete** date over it still commits — measured, `06/05/2026` in
  the start field fires `onValueChange` with 5 June 2026 — but the field snaps straight back
  to `06/05`, so the committed year is never on screen and any edit of the visible text is
  dropped with no signal.
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
- **Error state is conveyed by colour and `aria-invalid` only.** The red border carries no
  text; inside an errored [Field](field.md) the inputs point at the
  [FieldError](field-error.md), so render one with real content.
- **Selection is announced per day, not per range.** A day button says it is selected; nothing
  announces "8 nights" or "10 June to 18 June". The text fields hold the authoritative
  answer, which is another reason to name the group.

## Related

`RangeCalendar` · `Calendar` · `DatePicker` · [Input](input.md) · [Field](field.md) ·
[FieldError](field-error.md) · [Label](label.md) · [IconButton](icon-button.md) ·
[FormActions](form-actions.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
