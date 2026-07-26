# DatePicker

A single-date field that is a text input first and a calendar second: type `12/25/2026` and
press Enter, or open the popover and click a day. It commits a real `Date`, posts a
machine-readable `YYYY-MM-DD` through a hidden input so a plain `<form>` works, and takes both
its parsing and its formatting from the `locale` you hand it.

<!-- example:Minimal -->
```tsx
<Label htmlFor="due-date">Due date</Label>
<DatePicker id="due-date" placeholder="MM/DD/YYYY" />
```
<!-- /example -->

| Prop             | Type                          | Default                                |
| ---------------- | ----------------------------- | -------------------------------------- |
| `value`          | `Date \| null`                | — (uncontrolled)                       |
| `defaultValue`   | `Date`                        | — (starts empty)                       |
| `onValueChange`  | `(d: Date \| null) => void`   | —                                      |
| `onChange`       | `(d: Date \| null) => void`   | —                                      |
| `min`            | `Date`                        | —                                      |
| `max`            | `Date`                        | —                                      |
| `isDateDisabled` | `(date: Date) => boolean`     | —                                      |
| `locale`         | `string`                      | `"en-US"`                              |
| `formatOptions`  | `Intl.DateTimeFormatOptions`  | — (the locale's short numeric date)    |
| `placeholder`    | `string`                      | —                                      |
| `error`          | `boolean`                     | `Field` state, else `false`            |
| `disabled`       | `boolean`                     | `false`                                |
| `clearable`      | `boolean`                     | `false`                                |
| `rejectMessage`  | `(reason, text) => string`    | `` `${text} is not a date we can read.` `` |
| `labels`         | `DatePickerLabels`            | English strings                        |
| `weekStartsOn`   | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | `0` (Sun) — forwarded to the calendar |
| `numberOfMonths` | `number`                      | `1` — forwarded to the calendar        |
| `showToday`      | `boolean`                     | `false` — forwarded to the calendar    |
| `todayLabel`     | `string`                      | `"Today"` — forwarded to the calendar  |
| `name`           | `string`                      | — (no hidden input is rendered)        |
| `className`      | `string`                      | — (lands on the **wrapper**, see below) |
| `ref`            | `Ref<HTMLInputElement>`       | — (the visible text input)             |
| …rest            | props of `<input>`; `value` / `defaultValue` / `min` / `max` / `onChange` are re-typed above | — |

The rest props go to the visible text input, so `id`, `aria-label`, `required`, `autoFocus`,
`onFocus` and friends all land where you expect. Five native attributes are re-typed rather
than passed through: `value`, `defaultValue`, `min` and `max` take `Date`s here, and
`onChange` carries the committed `Date | null` — the same payload as `onValueChange`, not a
`ChangeEvent`. Both are destructured out and never reach an element, which is what lets
`{...form.field<Date | null>("dueDate")}` bind the picker. `className` is the exception to the
passthrough rule: it is merged onto the positioning wrapper `<div>`, which is where you set
the field's width.

The component renders a `<div>` wrapper containing the hidden input (only when you pass
`name`), the visible [Input](input.md), an [IconButton](icon-button.md) cluster pinned to the
right edge, and — while open — a portalled `role="dialog"` popover holding a [Calendar](calendar.md).

## Typing, and when the value commits

There are two states in play: the **draft string** you are typing, and the **committed
`Date`**. They are separate, and the draft only becomes a value on `Enter` or on blur.

A commit runs one pipeline: parse the draft for the current `locale` → clamp to `[min, max]`
→ reject if `isDateDisabled` says so → fire `onValueChange` → reformat the field from the
committed `Date`. An empty field commits `null`.

**A refusal keeps what you typed.** If the parse fails, or `isDateDisabled` rejects the day,
the committed `Date` does not move — but the draft stays in the field, the field goes
`aria-invalid`, and a message says why. That is the rule this library follows everywhere a
control commits or rejects: clear the input on success, or when what is left is blank, never on
a refusal, because the entry that needs correcting is the one you would be throwing away.
(This changed: a refusal used to snap the field back to the last committed value, silently.)

Editing after a refusal clears the message and the invalid state immediately — the message
quotes your text, so it comes down the moment that text starts changing. `Enter` on a draft
that has already been refused and not edited since is left alone, so the field can still
submit the form it sits in rather than eating the key forever.

## Saying why a date was refused

<!-- example:RejectMessage -->
```tsx
<Label htmlFor="booking-date">Booking date</Label>
<DatePicker
  id="booking-date"
  isDateDisabled={(date) => date.getDay() === 0}
  rejectMessage={(reason, text) =>
    reason === "unavailable"
      ? `We are closed on ${text}. Pick a weekday.`
      : `${text} is not a date. Try MM/DD/YYYY.`
  }
/>
```
<!-- /example -->

`rejectMessage` is called with the reason — `"unparseable"` when the text could not be read at
all, `"unavailable"` when `isDateDisabled` refused the day it named — and the text that was
refused. It is the same prop, with the same signature, on
[DateRangePicker](date-range-picker.md); there is one convention between the two pickers, not
two.

Whatever it returns is rendered below the field in `--C-STATUS-ERROR`, inside a polite live
region that is mounted whether or not it holds anything (a region created in the same commit as
its first text is not reliably announced — the same reason [TagInput](tag-input.md) and
[Repeater](repeater.md) mount theirs unconditionally). Return `""` to render nothing;
`aria-invalid` still reflects the refusal, because `""` removes the word, not the state.

Parsing is deliberately forgiving. It first reads three runs of digits in the locale's own
field order (`en-US` → month/day/year, `en-GB` → day/month/year), taking a two-digit year as
`20yy`; failing that it looks for a localized month name plus a day and a year in any order,
so `Sep 4, 2026` and `13 June 2026` both parse. When it does give up, it says so — see
[Saying why a date was refused](#saying-why-a-date-was-refused).

## Forms

Pass `name` and the component renders `<input type="hidden" name="…" value="YYYY-MM-DD">`
alongside the field. The visible input is deliberately left unnamed, so submitting the form
posts `dueDate=2026-06-30` rather than the localized string `6/30/2026`. The ISO value is
built from the local calendar day, not `toISOString()`, so it never slips a day for users west
or east of UTC. Clear the field and the hidden value becomes `""`.

<!-- example:InAForm -->
```tsx
<form action="/api/invoices" method="post">
  <Label htmlFor="invoice-due">Payment due</Label>
  <DatePicker id="invoice-due" name="dueDate" defaultValue={new Date(2026, 5, 30)} />
  <Button type="submit">Create invoice</Button>
</form>
```
<!-- /example -->

`required` passes through to the *visible* input, so the browser's own "please fill in this
field" check applies to the text you can see. A `form="…"` attribute reaches the hidden
input as well as the visible one, so a picker rendered outside its `<form>` still submits.

## Controlled

Give it `value` plus `onValueChange` to drive the date from state —
`const [dueDate, setDueDate] = useState<Date | null>(null)` in the example below. `value`
accepts `null` for "no date", and that is what `onValueChange` hands back when the field is
cleared.

<!-- example:Controlled -->
```tsx
<Label htmlFor="controlled-due">Payment due</Label>
<DatePicker id="controlled-due" value={dueDate} onValueChange={setDueDate} />
<p className="text-body-3 text-fg-secondary">
  {dueDate === null ? "No due date set" : `Invoice due ${dueDate.toDateString()}`}
</p>
```
<!-- /example -->

The `Date` **instance** no longer has to be stable. The field's text is *derived* from the
committed value, and the draft you are typing is a transient override on top of it that only a
commit clears — so a parent computing `value={new Date(row.dueDate)}` inline, and re-rendering
for some unrelated reason, no longer wipes what you were half-way through typing. The change
gate that decides whether to fire `onValueChange` is day-granular for the same reason: every
producer in this family is (`parseDateInput` yields midnight, the calendar yields a grid day,
`toISODate` submits a day), so two `Date`s naming the same day are the same value.

## Bounds and disabled days

`min` and `max` do two jobs: they grey out days in the calendar, and they clamp a typed date
into range on commit. `isDateDisabled` is checked *after* clamping and rejects the commit
outright rather than moving it.

<!-- example:BoundedRange -->
```tsx
<Label htmlFor="delivery-date">Delivery date</Label>
<DatePicker
  id="delivery-date"
  min={new Date(2026, 0, 1)}
  max={new Date(2026, 11, 31)}
  isDateDisabled={(date) => date.getDay() === 0 || date.getDay() === 6}
/>
```
<!-- /example -->

The two behave differently on a refusal, and the difference is worth knowing. A **clamp** is
silent by design — it is not a refusal, the date moves into range and commits. An
`isDateDisabled` **rejection** is not: it sets `aria-invalid`, keeps your entry in the field,
and shows the `"unavailable"` message. Either way the hidden input posts whatever committed, so
if a bound matters to your server, validate there too.

## Clearing

`clearable` adds an X button to the left of the calendar button, rendered only while a date is
committed and never while `disabled`. It sets the value to `null`, empties the field, and
returns focus to the input.

<!-- example:Clearable -->
```tsx
<Label htmlFor="expiry-date">Expiry date</Label>
<DatePicker id="expiry-date" clearable defaultValue={new Date(2026, 8, 14)} />
```
<!-- /example -->

## Locale and display format

`locale` is a BCP-47 tag used for three things: the calendar's month and weekday names, the
display string, and the field order the parser expects. `formatOptions` is handed straight to
`Intl.DateTimeFormat` for the display string only.

<!-- example:LocalizedFormat -->
```tsx
<Label htmlFor="uk-date">Start date</Label>
<DatePicker
  id="uk-date"
  locale="en-GB"
  formatOptions={{ dateStyle: "medium" }}
  defaultValue={new Date(2026, 5, 13)}
/>
```
<!-- /example -->

Whatever `formatOptions` renders has to survive being read back, because every commit
reformats the field and every later commit re-parses that text. `{ dateStyle: "medium" }`,
`{ year: "numeric", month: "long", day: "numeric" }` and the numeric default all round-trip.
A format that drops the day or the year does not: `{ year: "numeric", month: "long" }`
renders `June 2026`, which the parser cannot read back. Typing a **complete** date over it
still works — measured, both `June 15 2026` and `6/20/2026` commit and fire
`onValueChange` — but the field immediately redisplays `June 2026`, so the committed day is
never visible and any edit of the text that *is* on screen is discarded in silence. Choose a
format that shows every field the parser needs.

## In a Field

Inside a [Field](field.md), the error reaches the control through the [Input](input.md) it renders: red
border, `aria-invalid`, and `aria-describedby` pointing at the [FieldError](field-error.md),
with no extra props. Those two attributes are **merged** with anything you pass rather than
replaced by it: the picker's derived values win where it has them, and yours survive where it
does not — which is why the standalone example below keeps its own `aria-describedby`. The
visible [Label](label.md) is still your job — pair its `htmlFor` with the picker's `id`.

<!-- example:InField -->
```tsx
<Field error="Choose a date on or after today.">
  <Label htmlFor="renewal-date">Renewal date</Label>
  <DatePicker id="renewal-date" min={new Date(2026, 6, 25)} />
  <FieldError />
</Field>
```
<!-- /example -->

Standalone, drive the same styling from `error`:

<!-- example:ErrorState -->
```tsx
<Label htmlFor="birth-date">Date of birth</Label>
<DatePicker id="birth-date" error aria-describedby="birth-date-hint" />
<p id="birth-date-hint" className="text-body-3 text-fg-secondary">
  Enter a date in MM/DD/YYYY format.
</p>
```
<!-- /example -->

## Disabled

<!-- example:Disabled -->
```tsx
<Label htmlFor="locked-date">Contract start</Label>
<DatePicker id="locked-date" disabled defaultValue={new Date(2026, 2, 2)} />
```
<!-- /example -->

`disabled` recesses the field, blocks typing, hides the clear button, and disables the
calendar button — so the popover has no way to open. The hidden `name` input is disabled
too, so a disabled picker submits nothing, like a native disabled control.

## Theme tokens

DatePicker has no stylesheet of its own — the field, the popover shell and the icon cluster
are Tailwind utilities. Every colour, radius, shadow and type step among them resolves to a
contract variable, as does every spacing step but one. Override the variable and the field and
its popover re-tint at runtime with the rest of the app.

| Where                    | Utility                                               | Override                          |
| ------------------------ | ----------------------------------------------------- | --------------------------------- |
| Field text               | `text-body-2` `text-fg-primary`                       | `--BodyText-2` `--C-TEXT-PRIMARY` |
| Placeholder ink          | `placeholder:text-fg-muted`                           | `--C-TEXT-MUTED`                  |
| Field and popover fill   | `bg-surface-0`                                        | `--C-SURFACE-0`                   |
| Disabled fill            | `disabled:bg-surface-3`                               | `--C-SURFACE-3`                   |
| Field border             | `border-border-strong`                                | `--C-BORDER-STRONG`               |
| Focus ring and border    | `focus:ring-border-focus` `focus:border-border-focus` | `--C-BORDER-FOCUS` |
| Error border and ring    | `border-status-error` `focus:ring-status-error` | `--C-STATUS-ERROR`              |
| Popover border           | `border-border-default`                               | `--C-BORDER-DEFAULT`              |
| Popover shadow           | `shadow-md`                                           | `--SHADOW-MD`                     |
| Corners, field + popover | `rounded-md`                                          | `--RADIUS-MD`                     |
| Field padding            | `px-r4` `py-r5`                                       | `--R-SIZE-4` `--R-SIZE-5`         |
| Popover padding          | `p-r5`                                                | `--R-SIZE-5`                      |
| Icon gutter, icon gap    | `pr-r1` `gap-r6`                                      | `--R-SIZE-1` `--R-SIZE-6`         |
| Refusal message          | `mt-r6` `text-body-3` `text-status-error`             | `--R-SIZE-6` `--BodyText-3` `--C-STATUS-ERROR` |
| Transition               | `duration-fast`                                       | `--DURATION-FAST`                 |

Exactly one of those rows is DatePicker's own code: the right-hand gutter that keeps text clear
of the buttons, and the gap between them (the `right-r6` inset that pins the cluster to the
edge sits on that same `--R-SIZE-6` step). Everything else is inherited — the field chrome from
[Input](input.md), so the picker matches every other text field in the form by construction,
and the popover shell from a class string shared with [DateRangePicker](date-range-picker.md), which is why both
pickers float identically.

Four popover values are literals rather than tokens, and are not themeable: the stacking order
(`z-50`), the height cap (`85vh` with `overflow-y: auto`), the narrow-viewport width
(`100vw` minus a `1.5rem` gutter, released to `w-auto` from the `40rem` breakpoint up), and
the offset from the field, which is the floating layer's default `8px`. So is the wider gutter
the field switches to when `clearable` puts a second button in the cluster: a hard `4rem`, off
the responsive `r`-scale the rest of the padding uses.

The calendar **inside** the popover is [Calendar](calendar.md), which reads its own tokens from its own
stylesheet — the day cells, the selected fill, the today marker and the header controls are
documented there, not here. Overriding a variable in the table above will not re-tint them.

## Gotchas

- **`className` styles the wrapper, not the input.** It merges onto the outer `<div>`, which
  holds the field row and the refusal message. That is usually what you want — the input is
  `w-full`, so `className="w-64"` sizes the whole control — but a class you meant for the input
  itself (padding, border, font) will land on the wrapper and appear to do nothing. The `relative`
  positioning context is the *inner* field row, so the icon cluster stays centred on the field
  and the popover stays anchored to it when a message appears.
- **Every blur runs the commit pipeline, but a blur that changes nothing now emits nothing.**
  Focus the field and tab away without touching it and the parse/clamp still runs — it just
  resolves to the day already held, and the change gate drops it: measured **0** calls, where
  it used to fire one `onValueChange` per blur with a brand-new `Date` for the value that was
  already there. Blurring an empty, untouched picker is the same: `null` against `null` is no
  change. "Is this form dirty?" tracking no longer sees a change that never happened. What
  still emits is a blur that genuinely moves the day — including one that only clamps it into
  `[min, max]`.
- **Out-of-range dates are still silently clamped.** With `max={new Date(2026, 11, 31)}`,
  typing `01/01/2030` and pressing Enter commits `2026-12-31` — no message, no `aria-invalid`,
  because a clamp is a successful commit rather than a refusal. Only the two *refusals* speak:
  unreadable text, and a day `isDateDisabled` rejects. If a clamp needs surfacing, compare what
  you get in `onValueChange` against what the user typed.
- **A refusal now leaves your typing in the field.** It used to snap back to the last committed
  value. The committed `Date` is untouched either way, and the hidden input still posts the old
  value — so a field showing `31/31/2026` and a form posting `2026-06-10` is the expected state,
  not a bug. It is marked `aria-invalid` while it lasts.
- **The time of day is dropped.** Pass `defaultValue={new Date(2026, 5, 10, 14, 30)}` and the
  first blur re-parses the display string and commits midnight. This is a date-only control;
  keep the time component somewhere else.
- **Changing `locale` at runtime reformats the field, and does not move the date.** The text is
  derived from the committed `Date`, so switching `en-US` → `en-GB` on a 5 June value
  immediately redisplays `05/06/2026`, and a subsequent focus/blur re-parses that text back to
  5 June and emits **0**. This used to be a real corruption: the field kept the `en-US` string
  `6/5/2026`, the day-first `en-GB` parser read it back as **6 May**, and the next blur
  committed a date the user never chose. Remounting on a locale change is no longer necessary.
- **The calendar's own knobs are forwarded, not defaulted away.** `weekStartsOn`,
  `numberOfMonths`, `showToday` and `todayLabel` pass straight through to the popover
  [Calendar](calendar.md) — but `locale` still does not set the week start, so `locale="fr-FR"`
  without `weekStartsOn={1}` gives you French names in a grid that starts on `dim.`
- **The popover's control labels default to English but are overridable.** "Open calendar",
  "Clear date", "Choose date", "Previous month" and "Next month" come from `labels` and ignore
  `locale`, so a localized app has to pass them — as it does `rejectMessage`. The dates
  themselves are localized correctly.
- **Opening the calendar puts focus on a day.** The dialog's focus manager is told to stand
  down (`initialFocus={-1}`) and the calendar focuses its own roving day — the selected day
  when one is visible — so arrow keys work immediately. See [Accessibility](#accessibility).

## Accessibility

The visible control is an ordinary `textbox`, and it advertises no popup — the
`aria-haspopup="dialog"`, `aria-expanded` and `aria-controls` live on the calendar button,
the one control that actually opens the dialog. There is no `role="combobox"` and no
`aria-activedescendant`: the input is a plain text field that happens to sit beside a
button that owns a dialog.

The popover is a portalled `role="dialog"` labelled "Choose date", not modal (`aria-modal` is
absent and there is no focus trap), which is the right call for a field-attached picker —
`Tab` walks out of it and closes it rather than cycling forever.

**Keyboard.** `Enter` in the field commits the typed date. `Escape` closes the popover and
leaves the value untouched. Clicking outside closes it, and so does tabbing past the day grid —
focus moves on to whatever follows the field in the page. Picking a day closes the popover and
returns focus to the input, as does the clear button.

Opening it lands focus straight on the calendar's roving day — the selected day when it is
in view — not on the "Previous month" button, so the first `ArrowRight` moves a day. From
there the grid behaves: arrows move by day and week, `Home`/`End` jump to the ends of the
week, `PageUp`/`PageDown` change month, the whole grid is a single tab stop, each day button
is named with its full localized date, and the selected day's `role="gridcell"` wrapper
carries `aria-selected`.

**Naming.** The field has no accessible name of its own. Give it a [Label](label.md) with
`htmlFor` matching its `id`, or an `aria-label`.

**Error state.** `error` (or an enclosing [Field](field.md)) sets `aria-invalid="true"` and turns the
border and focus ring red. Colour is the only visual signal for *that* state, so always render a
[FieldError](field-error.md) or your own message next to it.

When *the picker itself* refuses input, it now says so: `aria-invalid="true"`, the entry left in
the field, and a `rejectMessage` sentence in a polite live region below it. Standalone, that
message's id is also joined into the field's `aria-describedby`. **Inside a [Field](field.md)
that renders a [FieldError](field-error.md), it is not** — the field's own error id wins there,
because the description comes from [Input](input.md)'s own wiring rather than from this
component. The message is still visible and still announced; it just is not a description of the
field. A clamp is not a refusal and says nothing.

The focus style comes from [Input](input.md): a 2px `focus:` ring, so it shows on click as
well as on keyboard focus. The two icon buttons use `focus-visible:` instead, so they ring
only for keyboard users. That difference is the library's split by element category, not an
inconsistency: form controls ring under the mouse, buttons do not.

DatePicker ships its own `"use client"`, so it can be imported directly from a Server
Component; it just renders on the client.

## Related

[Input](input.md) · [Field](field.md) · [Label](label.md) · [FieldError](field-error.md) ·
[Calendar](calendar.md) · [DateRangePicker](date-range-picker.md) · [RangeCalendar](range-calendar.md) · [IconButton](icon-button.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
