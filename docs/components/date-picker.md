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
committed `Date`. If the parse fails or the day is rejected, the draft is thrown away and the
field snaps back to the last committed value. An empty field commits `null`.

Parsing is deliberately forgiving. It first reads three runs of digits in the locale's own
field order (`en-US` → month/day/year, `en-GB` → day/month/year), taking a two-digit year as
`20yy`; failing that it looks for a localized month name plus a day and a year in any order,
so `Sep 4, 2026` and `13 June 2026` both parse. What it will not do is tell the user when it
gave up — see [Gotchas](#gotchas).

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
field" check applies to the text you can see. Keep the DatePicker inside the `<form>` it
belongs to: a `form="…"` attribute lands on the visible unnamed input and never reaches the
hidden one, so an out-of-form picker submits nothing.

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

Both are advisory, not enforcement: neither sets `aria-invalid`, neither shows a message, and
the hidden input happily posts a clamped value. If a bound matters to your server, validate
there too.

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
calendar button — so the popover has no way to open.

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
| Focus ring and border    | `focus-visible:ring-border-focus` `focus-visible:border-border-focus` | `--C-BORDER-FOCUS` |
| Error border and ring    | `border-status-error` `focus-visible:ring-status-error` | `--C-STATUS-ERROR`              |
| Popover border           | `border-border-default`                               | `--C-BORDER-DEFAULT`              |
| Popover shadow           | `shadow-md`                                           | `--SHADOW-MD`                     |
| Corners, field + popover | `rounded-md`                                          | `--RADIUS-MD`                     |
| Field padding            | `px-r4` `py-r5`                                       | `--R-SIZE-4` `--R-SIZE-5`         |
| Popover padding          | `p-r5`                                                | `--R-SIZE-5`                      |
| Icon gutter, icon gap    | `pr-r1` `gap-r6`                                      | `--R-SIZE-1` `--R-SIZE-6`         |
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

- **`className` styles the wrapper, not the input.** It merges onto the `relative` positioning
  `<div>`. That is usually what you want — the input is `w-full`, so `className="w-64"` sizes
  the whole control — but a class you meant for the input itself (padding, border, font) will
  land on the wrapper and appear to do nothing.
- **Every blur runs the commit pipeline, but a blur that changes nothing now emits nothing.**
  Focus the field and tab away without touching it and the parse/clamp still runs — it just
  resolves to the day already held, and the change gate drops it: measured **0** calls, where
  it used to fire one `onValueChange` per blur with a brand-new `Date` for the value that was
  already there. Blurring an empty, untouched picker is the same: `null` against `null` is no
  change. "Is this form dirty?" tracking no longer sees a change that never happened. What
  still emits is a blur that genuinely moves the day — including one that only clamps it into
  `[min, max]`.
- **Out-of-range dates are silently clamped; rejected ones silently revert.** With
  `max={new Date(2026, 11, 31)}`, typing `01/01/2030` and pressing Enter commits
  `2026-12-31` — no message, no `aria-invalid`. A date your `isDateDisabled` refuses, or text
  that does not parse at all, snaps back to the previous value just as quietly. If the
  distinction matters, render your own message from `onValueChange`.
- **The time of day is dropped.** Pass `defaultValue={new Date(2026, 5, 10, 14, 30)}` and the
  first blur re-parses the display string and commits midnight. This is a date-only control;
  keep the time component somewhere else.
- **Changing `locale` at runtime reformats the field, and does not move the date.** The text is
  derived from the committed `Date`, so switching `en-US` → `en-GB` on a 5 June value
  immediately redisplays `05/06/2026`, and a subsequent focus/blur re-parses that text back to
  5 June and emits **0**. This used to be a real corruption: the field kept the `en-US` string
  `6/5/2026`, the day-first `en-GB` parser read it back as **6 May**, and the next blur
  committed a date the user never chose. Remounting on a locale change is no longer necessary.
- **The calendar is fixed to one Sunday-first month with no Today button.** [Calendar](calendar.md)'s
  `weekStartsOn`, `numberOfMonths` and `showToday` are not part of DatePicker's props and are
  not forwarded, so `locale="fr-FR"` gives you French month and weekday names in a grid that
  still starts on `dim.`
- **The popover's control labels are hardcoded English.** "Open calendar", "Clear date",
  "Choose date", "Previous month" and "Next month" ignore `locale`, so a localized app
  announces English to screen-reader users. The dates themselves are localized correctly.
- **Opening the calendar does not put focus on a day.** Focus lands on the "Previous month"
  button, so arrow keys do nothing until you tab into the grid. See
  [Accessibility](#accessibility).

## Accessibility

The visible control is an ordinary `textbox`. It carries `aria-haspopup="dialog"`,
`aria-expanded`, and an `aria-controls` pointing at the popover; the calendar button carries
`aria-haspopup="dialog"` and `aria-expanded` too, so the popup is advertised twice — once on
the field, once on the button. There is no `role="combobox"` and no `aria-activedescendant`:
the input is a plain text field that happens to own a dialog.

The popover is a portalled `role="dialog"` labelled "Choose date", not modal (`aria-modal` is
absent and there is no focus trap), which is the right call for a field-attached picker —
`Tab` walks out of it and closes it rather than cycling forever.

**Keyboard.** `Enter` in the field commits the typed date. `Escape` closes the popover and
leaves the value untouched. Clicking outside closes it, and so does tabbing past the day grid —
focus moves on to whatever follows the field in the page. Picking a day closes the popover and
returns focus to the input, as does the clear button.

Opening it is the weak spot: focus goes to the first control in the dialog — the "Previous
month" button — not to the selected day, so a keyboard user presses `ArrowRight` and nothing
happens. Three more `Tab`s (month caption, next-month, then the grid) are needed to get there.
Once focus is on a day the grid behaves: arrows move by day and week, `Home`/`End` jump to the
ends of the week, `PageUp`/`PageDown` change month, the whole grid is a single tab stop, each
day button is named with its full localized date, and the selected day is `aria-selected`.

**Naming.** The field has no accessible name of its own. Give it a [Label](label.md) with
`htmlFor` matching its `id`, or an `aria-label`.

**Error state.** `error` (or an enclosing [Field](field.md)) sets `aria-invalid="true"` and turns the
border and focus ring red. Colour is the only visual signal, so always render a
[FieldError](field-error.md) or your own message next to it. Note that nothing marks the field
invalid when *the picker itself* rejects input — an unparseable string, a clamped date, a day
your `isDateDisabled` refuses — those revert with no announcement at all.

The focus style comes from [Input](input.md): a 2px `focus-visible:` ring. The field is a
text input, which browsers treat as always warranting a focus indicator, so it rings on
click as well as on keyboard focus. The two icon buttons draw the same recipe but are
buttons, so they ring only for keyboard users.

DatePicker ships its own `"use client"`, so it can be imported directly from a Server
Component; it just renders on the client.

## Related

[Input](input.md) · [Field](field.md) · [Label](label.md) · [FieldError](field-error.md) ·
[Calendar](calendar.md) · [DateRangePicker](date-range-picker.md) · [RangeCalendar](range-calendar.md) · [IconButton](icon-button.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
