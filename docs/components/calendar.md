# Calendar

A single-date month grid with full arrow-key navigation, localized weekday and month
names from `Intl`, per-day disabling, and a month/year quick-jump — the picking surface
that [DatePicker](date-picker.md) puts inside a popover, usable on its own wherever a date belongs
inline.

<!-- example:Minimal -->
```tsx
<Calendar value={dueDate} onValueChange={setDueDate} />
```
<!-- /example -->

`Calendar` renders the grid and nothing else — no input, no popover, no form value. It
holds the selection for you if you only pass `onValueChange`, but the useful shape is the
controlled one above: `const [dueDate, setDueDate] = useState<Date | null>(null)`, then
hand `dueDate` back in as `value`. Every date a **day cell** emits is local midnight on the
day you clicked, built with local-time constructors throughout, so there is no UTC
off-by-one waiting for you at a timezone boundary. (The `showToday` button is the one
exception — see [Gotchas](#gotchas).)

| Prop             | Type                             | Default   |
| ---------------- | -------------------------------- | --------- |
| `value`          | `Date \| null`                   | —         |
| `defaultValue`   | `Date`                           | —         |
| `onValueChange`  | `(d: Date) => void`              | —         |
| `month`          | `Date`                           | —         |
| `defaultMonth`   | `Date`                           | —         |
| `onMonthChange`  | `(m: Date) => void`              | —         |
| `numberOfMonths` | `number`                         | `1`       |
| `min`            | `Date`                           | —         |
| `max`            | `Date`                           | —         |
| `isDateDisabled` | `(date: Date) => boolean`        | —         |
| `locale`         | `string`                         | `"en-US"` |
| `weekStartsOn`   | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | `0` (Sun) |
| `showToday`      | `boolean`                        | `false`   |
| `todayLabel`     | `string`                         | `"Today"` |
| `labels`         | `CalendarLabels`                 | English strings |
| `ref`            | `Ref<HTMLDivElement>`            | —         |
| …rest            | `div` props, minus `value` / `defaultValue`; `onChange` is a compile error | — |

`onChange` is declared `onChange?: never`: passing one is a **compile error**, not a prop
that quietly does nothing. The change channel is `onValueChange`.

Selection and displayed month are two independent controlled/uncontrolled pairs. Pass
`value` (even `null`) and you own the selection; pass `month` and you own what is on
screen. `onValueChange` and `onMonthChange` fire in **both** modes. Rest props land on the
root `<div>` — `id`, `role`, `aria-label`, `data-*`, `style` and handlers all arrive
intact. The two pairs interact: the view **follows a change of selection** when you don't
own it, and `month` always wins when you do. See [Gotchas](#gotchas).

## Restricting what can be picked

`min` and `max` are inclusive and compared **by calendar day** — the bounds are normalised
to midnight before comparison, so a `min` carrying a time of day still leaves its own date
selectable.

<!-- example:BookingWindow -->
```tsx
<Calendar
  defaultMonth={new Date(2026, 5, 1)}
  min={new Date(2026, 5, 8)}
  max={new Date(2026, 5, 26)}
/>
```
<!-- /example -->

`isDateDisabled` is checked on top of the bounds; a day is disabled if either says so.

<!-- example:BlackoutDays -->
```tsx
<Calendar
  defaultMonth={new Date(2026, 5, 1)}
  min={new Date(2026, 5, 1)}
  isDateDisabled={(date) => date.getDay() === 0 || date.getDay() === 6}
/>
```
<!-- /example -->

Disabled days are marked with `aria-disabled`, never the native `disabled` attribute. They
stay in the roving focus order — you can arrow onto one and read it — but clicking or
pressing Enter on one fires nothing.

## Showing more than one month

<!-- example:TwoMonths -->
```tsx
<Calendar defaultMonth={new Date(2026, 5, 1)} numberOfMonths={2} />
```
<!-- /example -->

Each month is its own `role="grid"`, labelled with its own month and year, and the ‹ ›
buttons page the whole window by one month. The value is clamped with `Math.max(1, …)`, so
`numberOfMonths={0}` still renders one grid.

Below the design system's `40rem` breakpoint the component collapses to a **single paged
month** regardless of `numberOfMonths`, and the root switches from its natural
multi-month width to `width: 100%` so it fills a phone viewport or a width-capped popover
instead of growing a nested scrollbar.

## Locale and week start

<!-- example:Localized -->
```tsx
<Calendar defaultMonth={new Date(2026, 5, 1)} locale="en-GB" weekStartsOn={1} />
```
<!-- /example -->

`locale` is passed straight to `Intl.DateTimeFormat` for the weekday abbreviations, the
long month names in the header caption, the short ones in the month picker, and each day
button's accessible name. `weekStartsOn` is a separate index (`0` = Sunday) that rotates the columns and also
retargets <kbd>Home</kbd>/<kbd>End</kbd>, so a `fr-FR` calendar does not silently start on
Monday — set both. The ‹ › buttons' accessible names ("Previous month", "Next month", and
the year/decade variants the quick-nav uses) default to English; override them through the
`labels` object.

## The Today shortcut

<!-- example:TodayButton -->
```tsx
<Calendar
  value={visitDate}
  onValueChange={setVisitDate}
  showToday
  todayLabel="Jump to today"
/>
```
<!-- /example -->

`showToday` renders a footer button that navigates to today's month and selects today in
one press. It only appears in the day view — opening the month or year picker hides it.
Read the note in [Gotchas](#gotchas) about the `Date` it hands you; it is not the same
shape as a day click's.

## Controlling the displayed month

The header ‹ › buttons, <kbd>PageUp</kbd>/<kbd>PageDown</kbd>, an arrow key that crosses a
month boundary, every pick in the month/year quick-nav, and the Today button when it has
to travel all report through `onMonthChange`. Pass `month` as well and the calendar stops moving on its own — it shows
exactly what you give it, which is what you want when something outside the grid has to
drive it. Hold the month in state (`const [month, setMonth] = useState(new Date(2026, 5, 1))`)
and feed it back:

<!-- example:ControlledMonth -->
```tsx
<Button variant="secondary" type="button" onClick={() => setMonth(new Date(2026, 11, 1))}>
  Jump to December
</Button>
<Calendar month={month} onMonthChange={setMonth} />
```
<!-- /example -->

Clicking the header caption opens a 12-month picker, and clicking it again opens a
12-year page; picking a year returns to the months, picking a month returns to the grid.
While a picker is open the ‹ › buttons step by a year and by twelve years respectively.
The caption stays interactive at every `numberOfMonths`; with several grids it reads the
whole visible span and the quick-jump moves the whole window.

## Sizing

<!-- example:LargerDayCells -->
```tsx
<Calendar
  defaultMonth={new Date(2026, 5, 1)}
  style={{ "--calendar-day-size": "2.75rem" } as CSSProperties}
/>
```
<!-- /example -->

`--calendar-day-size` (default `2.25rem`) is the one measurement everything else derives
from: the column floor of the seven-column grid, and through it the month width and the
calendar's natural width. Setting it in `style` beats the stylesheet's own declaration on
the same element, so the derived `calc()`s recompute from your value. Day cells are
`aspect-ratio: 1 / 1` and stretch to `1fr`, so they only ever grow past that floor.

## Theme tokens

Calendar uses **no Tailwind utilities** — every rule lives in `Calendar.css` and reads
contract variables directly. Override any of these and the calendar re-tints with the rest
of the app at runtime, with no rebuild.

| Where                                        | Override                                                    |
| -------------------------------------------- | ----------------------------------------------------------- |
| Panel fill, border, corners                   | `--C-SURFACE-0` · `--C-BORDER-DEFAULT` · `--RADIUS-LG`      |
| Base ink (header caption, day numbers)        | `--C-TEXT-PRIMARY`                                          |
| Caption / day / picker type                   | `--BodyText-2` · `--BodyText-2-line-height`                 |
| Weekday headers, per-month captions           | `--BodyText-3` · `--C-TEXT-MUTED`                           |
| Emphasis weight (caption, today, selected)    | `--Semibold-Weight`                                         |
| Selected day fill and its hover               | `--C-ACCENT` · `--C-ACCENT-HOVER`                           |
| Selected day ink (with fallback)              | `--C-TEXT-ON-ACCENT` · `--C-TEXT-INVERSE`                   |
| Today marker ring                             | `--C-BORDER-STRONG`                                         |
| Outside-month and disabled days               | `--C-TEXT-MUTED`                                            |
| Hover wash — day, caption, picker cell, Today | `--C-SURFACE-2`                                             |
| Range band and preview (`RangeCalendar` only) | `--C-SURFACE-3`                                             |
| Today footer ink                              | `--C-ACCENT`                                                |
| Cell and control corners                      | `--RADIUS-MD`                                               |
| Focus outline                                 | `--C-BORDER-FOCUS`                                          |
| Padding, panel gap, month gap                 | `--R-SIZE-4`                                                |
| Header gap                                    | `--R-SIZE-5`                                                |
| Grid gaps, week gaps, picker gap              | `--R-SIZE-6`                                                |
| Hover and selection transitions               | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`           |

The selected-day ink is written `var(--C-TEXT-ON-ACCENT, var(--C-TEXT-INVERSE))`, so a
theme that defines only `--C-TEXT-INVERSE` still gets an ink colour rather than falling
back to the inherited one. Measured against `--C-ACCENT` in `@batthewz/response-ui-css`
**v0.10.0**, the selected day's digit clears AA for body-size text in every shipped theme:
**5.17:1** default, **5.04:1** `events`, **5.69:1** `grimdark`, **14.84:1** `tech`. The
`events` and `grimdark` values were 2.80:1 and 3.81:1 before that release and were repaired
in the palette, not here. One edge remains: the `:hover` fill swaps to `--C-ACCENT-HOVER`
while the ink does not, which lands at **4.49:1** in `grimdark` — a hair under, and a
reminder that this pair has no headroom in that theme.

All three spacing tokens sit on the responsive `r`-scale, and two of them step up at
`40rem`: the panel padding and month gap (`--R-SIZE-4`, `0.75rem` → `1.25rem`) and the
header gap (`--R-SIZE-5`, `0.5rem` → `0.75rem`). The grid gaps (`--R-SIZE-6`) hold at
`0.25rem` on both sides. `--BodyText-2` and `--BodyText-3` are responsive too. The range
band tokens are listed because the rules live in this stylesheet, but single-date
`Calendar` never sets those attributes — [RangeCalendar](range-calendar.md) does.

Five sizing knobs are **component-local**, lowercase and outside the
[theme contract](../theme-contract.md): `--calendar-day-size` (the one you would actually
set), `--calendar-col-gap` and `--calendar-month-gap` (aliases of `--R-SIZE-6` and
`--R-SIZE-4`), and the derived `--calendar-month-width` / `--calendar-ideal-width`.
`--calendar-months` is written onto the root inline by the component so the stylesheet can
size itself to the number of grids on screen; your `style` object is spread after it, so
you can override it, and you almost certainly should not.

## Gotchas

- **The view follows a *change* of selection, not the selection itself.** Re-render `value`
  from June 10 to September 3 and the grid moves to September with the 3rd marked — and
  `onMonthChange` fires so you know it moved. But it is edge-triggered on the change, so
  paging away from the selection *stays*: navigate to July with the selection still on June
  10, and no amount of unrelated re-rendering drags you back. A selection change that lands
  inside the months already on screen moves nothing.
- **A controlled `month` always wins — the follow becomes a request.** When you own `month`,
  a selection change that lands off-screen does not move the grid; it calls `onMonthChange`
  with the month that *would* show it, exactly as the ‹ › buttons do. Honour it or ignore
  it. One code path for both, so a controlled caller never needs to special-case this.
- **`defaultMonth` beats a seeded selection.** `<Calendar defaultMonth={June 2026}
  defaultValue={20 Jan 2026} />` opens on **June** — the month you named explicitly, not the
  one inferred from the selection. Pass `defaultMonth` when you want to open somewhere the
  selection isn't; omit it and the selection seeds the view.
- **`showToday` emits local midnight,** the same instant a day cell emits, so two picks of
  the same day are `getTime()`-equal. Today only *selects* when today is actually
  selectable; if `min`/`max`/`isDateDisabled` rule it out, the button still navigates.
- **A selected date outside the displayed month renders unselected.** Leading and trailing
  days from adjacent months are contextual only — they carry no selection, today or
  roving-focus state, deliberately, so a date can't highlight twice across two grids.
  Measured: with `month={June 2026}` and `value={May 31 2026}`, the May 31 cell is visible
  in the June grid with `aria-selected="false"`.
- **Clicking a padding day keeps DOM focus.** Selecting a leading/trailing day selects it
  *and* pages the calendar to its month; focus is handed to that day's in-month button, the
  same way an arrow-key move across the boundary does.
- **`onValueChange` de-duplicates by day.** Clicking the already-selected day again resolves
  to the value already held and fires nothing.
- **`numberOfMonths` is honoured on the server, then re-evaluated.** The breakpoint is read
  with a media query that returns `false` during SSR and the hydration render, so a
  `numberOfMonths={2}` calendar ships two grids in the server HTML and collapses to one
  after hydration on a narrow viewport.
- **No form value, and it is a client component.** Calendar renders no `<input>` and
  carries `"use client"`. For native submission render your own hidden input; for an RSC
  tree it needs a client boundary.

## Accessibility

Each month is a `role="grid"` named with its localized month and year, containing a
`role="row"` of seven `role="columnheader"` cells followed by six rows of
`role="gridcell"`. Day buttons show only the number but are named with the full localized
date — `"June 13, 2026"` — so a screen reader never reads a bare `"13"`.

- **Roving tab stop.** Exactly one day button is `tabIndex={0}`; the rest are `-1`, so the
  whole day grid is one Tab stop. Full tab order is ‹, the caption, ›, the focused day,
  then Today. Arrow keys move ±1 day and ±1 week,
  <kbd>Home</kbd>/<kbd>End</kbd> go to the start and end of the week (following
  `weekStartsOn`), and <kbd>PageUp</kbd>/<kbd>PageDown</kbd> move ±1 month. Every one of
  those moves DOM focus with it and pages the window when the target isn't visible; no
  other key is intercepted, so <kbd>Tab</kbd> and <kbd>Escape</kbd> reach your container.
- **`aria-selected` is on the `role="gridcell"` wrapper,** not on the day `<button>` — ARIA
  does not support the attribute on `button`. Style hooks off `[data-selected]` on the button.
- **The month and year pickers are one tab stop each.** They are a `role="group"` of buttons
  — deliberately not `role="grid"`, which would promise rows and cells they do not have. The
  displayed month/year is marked `aria-current="true"` (navigation state, not selection) and
  holds the tab stop; arrow keys move ±1 and ±3 across the three-column layout, with
  <kbd>Home</kbd>/<kbd>End</kbd> jumping to the ends.
- **Today is `aria-current="date"`,** and only ever on the in-month instance, so it is
  announced once even in a multi-month view. Its *visual* marker is a 1px
  `--C-BORDER-STRONG` inset ring, which measures **3.23–3.49:1** against `--C-SURFACE-0`
  across the four shipped themes in `@batthewz/response-ui-css` **v0.10.0** — clearing the
  3:1 floor WCAG 1.4.11 sets for a non-text indicator, where it used to sit at 1.41–1.79:1
  and be effectively invisible. It is a hairline at exactly the floor, not a bold marker, so
  if finding today quickly matters in your product, still add your own.
- **Month changes announce through `aria-live="polite"`** on the header caption, at every
  `numberOfMonths`; in a multi-month view it reads the whole visible span.
- **Disabled days remain focusable** by design: `aria-disabled` rather than `disabled`, so
  a keyboard user can discover *why* a range is closed instead of arrowing over a hole.
- **The focus indicator is a 2px `--C-BORDER-FOCUS` outline** at `2px` offset on days,
  caption, picker cells and the Today button. Measured against `@batthewz/response-ui-css`
  **v0.10.1**, that token clears the 3:1 non-text floor on every surface a calendar sits on:
  **3.68** default · **3.39** `events` · **14.84** `tech` · **3.66** `grimdark` on
  `--C-SURFACE-0`, and 3.34 / 3.15 / 13.70 / 3.15 on `--C-SURFACE-2`. It used to read 2.72
  and 2.96 in `events` and `grimdark` — those themes copied their *pre-retune* accent into
  the focus token, and v0.10.1 retuned it. **On `--C-SURFACE-3` it still falls short**
  (2.97 / 2.87 / 12.37 / 2.74), so a calendar rendered on the most elevated surface has a
  focus ring under the floor in three of the four themes.
- **The root has no role or name.** It is a bare `<div>`; if the calendar needs to be a
  labelled region, pass `role` and `aria-label` through — they reach the root untouched.
- Every transition in the stylesheet is switched off under `prefers-reduced-motion: reduce`.

## Related

[RangeCalendar](range-calendar.md) · [DatePicker](date-picker.md) · [DateRangePicker](date-range-picker.md) ·
[IconButton](icon-button.md) · [Popover](popover.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
