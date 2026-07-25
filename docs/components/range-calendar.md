# RangeCalendar

A two-click date-range picker: month grids side by side, a live preview of the span while
you choose the second endpoint, and a `{ start, end }` value you own. Reach for it when a
booking, a report window, or a filter needs two dates rather than one.

<!-- example:Minimal -->
```tsx
<Stack gap="r5">
  <RangeCalendar onValueChange={setStay} />
  <Text variant="body-2" color="secondary">
    {stay.start && stay.end
      ? `${stay.start.toLocaleDateString()} – ${stay.end.toLocaleDateString()}`
      : "Pick a check-in date, then a check-out date."}
  </Text>
</Stack>
```
<!-- /example -->

`stay` and `setStay` above are your own `useState<DateRange>({ start: null, end: null })` —
the component keeps no value you can read back out of it. `DateRange` is exported
alongside the component:

```ts
type DateRange = { start: Date | null; end: Date | null };
```

| Prop             | Type                                                       | Default                    |
| ---------------- | ---------------------------------------------------------- | -------------------------- |
| `value`          | `DateRange`                                                | —                          |
| `defaultValue`   | `DateRange`                                                | `{ start: null, end: null }` |
| `onValueChange`  | `(range: DateRange) => void`                               | —                          |
| `month`          | `Date`                                                     | —                          |
| `defaultMonth`   | `Date`                                                     | —                          |
| `onMonthChange`  | `(m: Date) => void`                                        | —                          |
| `numberOfMonths` | `number`                                                   | `2`                        |
| `min`            | `Date`                                                     | —                          |
| `max`            | `Date`                                                     | —                          |
| `isDateDisabled` | `(date: Date) => boolean`                                  | —                          |
| `locale`         | `string`                                                   | `"en-US"`                  |
| `weekStartsOn`   | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6`                          | `0` (Sunday)               |
| `showToday`      | `boolean`                                                  | `false`                    |
| `todayLabel`     | `string`                                                   | `"Today"`                  |
| `ref`            | `Ref<HTMLDivElement>`                                      | —                          |
| …rest            | `div` props, minus `onChange` / `value` / `defaultValue`   | —                          |

Two selection props and two month props, and they are independent: `value`/`defaultValue`
is *what is picked*, `month`/`defaultMonth` is *what is on screen*. Controlling one does
not control the other, and that split is the source of most of the surprises in
[Gotchas](#gotchas).

## Picking a range

There is no mode prop and no "select start / select end" flag to manage. The component
derives whether it is mid-pick from the range itself — `start != null && end == null` — so
the protocol is entirely determined by the value you hold.

1. **First click** sets `start` and clears `end`. `onValueChange` fires immediately with
   `{ start, end: null }`, so every handler must tolerate a half-finished range.
2. **While picking,** hovering or arrowing over a day previews the span. Preview days get a
   `data-preview` attribute and the same wash as a committed range.
3. **Second click** commits, ordering the endpoints for you: click the 20th then the 12th
   and you get `{ start: 12th, end: 20th }`. Clicking the same day twice gives a one-day
   range whose `start` and `end` are the same date, and that cell stays fully rounded
   instead of squaring off.
4. **A third click starts over** — a completed range is replaced, not extended.

Endpoints render with the solid accent fill; days strictly between them get the flat
in-range wash. In a multi-month view the leading/trailing padding days of each grid are
deliberately inert — they carry no range state — so an endpoint that appears in two grids
is highlighted exactly once, in its own month.

## One month or several

`numberOfMonths` defaults to **2**. The header's ‹ › buttons step the whole window by a
single month, so at the default the view moves June–July → July–August, not June–July →
August–September.

<!-- example:SingleMonth -->
```tsx
<RangeCalendar numberOfMonths={1} defaultMonth={new Date(2026, 6, 1)} />
```
<!-- /example -->

The single-month layout is not just narrower — it turns the centre caption into a button
that opens a month picker, then a year picker. With two or more grids that caption is an
empty `aria-hidden` spacer instead (each grid already labels itself), so **the quick-jump
does not exist at the default `numberOfMonths`**. Below a 40rem viewport the component
collapses to one paged month regardless of what you passed, which is also where the
quick-jump reappears.

## Controlled selection

<!-- example:Controlled -->
```tsx
<Stack gap="r5">
  <RangeCalendar numberOfMonths={1} value={stay} onValueChange={setStay} />
  <Button variant="secondary" onClick={() => setStay({ start: null, end: null })}>
    Clear dates
  </Button>
</Stack>
```
<!-- /example -->

Pass `value` and the component is controlled for its whole life — the mode is locked on the
first render, so it cannot flip later. In that mode a click never updates the range
internally; it only calls `onValueChange`, so omitting that handler freezes the calendar
entirely — the range never advances, so it never even enters the preview state. Clearing
works the same way: there is no clear button
and no "click the endpoint again to remove it", so write `{ start: null, end: null }`
yourself.

## Driving the visible month

The displayed month is seeded once, at mount. Changing `value` afterwards moves nothing:
set a controlled range to a span in another month and the grids stay where they were, with
no endpoint visible anywhere. Preset buttons, "apply last quarter" links, and anything else
that writes a range from outside must move the view too:

<!-- example:WithPresets -->
```tsx
<Stack gap="r5">
  <Button
    variant="secondary"
    onClick={() => {
      const start = new Date(2026, 11, 21);
      const end = new Date(2026, 11, 28);
      setStay({ start, end });
      setMonth(start);
    }}
  >
    Christmas week
  </Button>
  <RangeCalendar
    value={stay}
    onValueChange={setStay}
    month={month}
    onMonthChange={setMonth}
  />
</Stack>
```
<!-- /example -->

`stay` and `month` there are two separate `useState` values. `month` is the controlled
displayed month, and `onMonthChange` fires for every navigation — ‹ › steps, the month/year
quick-jump where it is shown, and the automatic paging that happens when arrow-key focus
leaves the visible window. If you pass `month`, pass `onMonthChange` too: `month` alone
pins the calendar to that month and the nav buttons stop doing anything. `onMonthChange`
on its own is fine — the calendar stays uncontrolled and just reports where it moved.

## Limiting what can be picked

<!-- example:BoundedWindow -->
```tsx
<RangeCalendar
  defaultMonth={new Date(2026, 6, 1)}
  min={new Date(2026, 6, 1)}
  max={new Date(2026, 8, 30)}
/>
```
<!-- /example -->

<!-- example:WeekdaysOnly -->
```tsx
<RangeCalendar
  defaultMonth={new Date(2026, 6, 1)}
  isDateDisabled={(date) => date.getDay() === 0 || date.getDay() === 6}
/>
```
<!-- /example -->

`min`, `max`, and `isDateDisabled` are combined into a single per-day test, and a day that
fails it renders `aria-disabled="true"` and drops its click. They gate **endpoints only**.
Nothing checks the span between two endpoints, so with weekends blocked, a Friday →
Monday pick commits and the Saturday between them renders both `aria-disabled="true"` and
`data-in-range`. If a contiguous run of available days is a real requirement — a hotel
booking, a rental — validate the committed range yourself in `onValueChange`.

## Locale and week start

<!-- example:Localized -->
```tsx
<RangeCalendar locale="en-GB" weekStartsOn={1} defaultMonth={new Date(2026, 6, 1)} />
```
<!-- /example -->

`locale` is passed to `Intl.DateTimeFormat` for the month names, the weekday column
headers, and each day button's accessible name ("13 June 2026"). `weekStartsOn` is a
separate `0`–`6` knob and defaults to Sunday — the locale does not set it, so `en-GB`
without `weekStartsOn={1}` still starts its weeks on Sunday. It also shifts what
<kbd>Home</kbd>/<kbd>End</kbd> treat as the ends of a week.

## Today shortcut

<!-- example:TodayShortcut -->
```tsx
<RangeCalendar numberOfMonths={1} defaultMonth={new Date(2026, 0, 1)} showToday todayLabel="Jump to today" />
```
<!-- /example -->

`showToday` renders a footer button that navigates to today, focuses it, and leaves the
picker in the day view. In this component it selects nothing — see [Gotchas](#gotchas).

## Theme tokens

RangeCalendar declares no styling of its own: there is no `RangeCalendar.css`, and its
source contains no Tailwind utility. It renders `CalendarBase`, whose markup is painted by
`Calendar.css` — the same sheet behind [Calendar](calendar.md), shipped in this package's `styles.css`.
So every override below re-tints the single-date calendar at the same time, and there is no
per-component variable to reach for here.

Everything that sheet reads, grouped by what you would want to change:

- **Range band** — days strictly between the endpoints, and the live preview, both wash
  with `--C-SURFACE-2` and square off their corners.
- **Endpoints** — `--C-ACCENT` fill, inked with `--C-TEXT-ON-ACCENT` falling back to
  `--C-TEXT-INVERSE`; hover is `--C-ACCENT-HOVER` falling back to `--C-ACCENT`.
- **Shell** — `--C-SURFACE-0` fill, a 1px `--C-BORDER-DEFAULT` border, `--RADIUS-LG`
  corners, `--R-SIZE-4` padding.
- **Day cells** — `--RADIUS-MD` corners, `--BodyText-2` type, `--C-TEXT-PRIMARY` ink, and a
  `--C-SURFACE-2` hover wash.
- **Today marker** — a 1px inset `--C-BORDER-STRONG` ring plus `--Semibold-Weight`.
- **Muted text** — outside days, disabled days, the weekday column headers, and the
  per-month captions all ink `--C-TEXT-MUTED`; captions and headers use `--BodyText-3`.
- **Header caption** — `--BodyText-2` / `--BodyText-2-line-height` at `--Semibold-Weight` in
  `--C-TEXT-PRIMARY`, with a `--C-SURFACE-2` hover and `--RADIUS-MD` corners when it is the
  interactive quick-jump.
- **Today footer** — a `--C-BORDER-DEFAULT` top rule; the button inks `--C-ACCENT` and
  washes `--C-SURFACE-2` on hover.
- **Focus ring** — 2px `--C-BORDER-FOCUS` at 2px offset, on day buttons, month/year picker
  cells, the caption button, and the Today button. A day button already reserves a
  transparent 2px outline at rest, so focusing one never shifts the grid.
- **Motion** — `--MOTION-DURATION-SHIFT` and `--MOTION-EASE-SHIFT` on the background/colour
  transitions, dropped entirely under `prefers-reduced-motion: reduce`.
- **Gaps** — `--R-SIZE-4` between the shell's rows and between month columns, `--R-SIZE-5`
  in the header, `--R-SIZE-6` between weeks and day cells.

Sizing is deliberately *not* on the contract. `--calendar-day-size` (`2.25rem`) and the
derived `--calendar-month-width` / `--calendar-ideal-width` are component-local custom
properties, and `--calendar-months` is written inline on the root by `CalendarBase` so the
sheet can size itself to exactly the number of grids on screen. `--calendar-day-size` is
the one that changes cell size — set it in your own rule for `.calendar`, and the month
and shell widths recompute from it. The day button itself is `width: 100%` with
`aspect-ratio: 1 / 1`, so cells also grow with the column on a full-width mobile month.

The ‹ › navigation buttons are [IconButton](icon-button.md)s and take their colours from
that component, not from `Calendar.css`.

## Gotchas

- **`onValueChange` fires with a half-finished range.** The first click emits
  `{ start, end: null }`. A handler that assumes both dates exist will read `null` on every
  other call. Guard on `end != null` before you fetch, filter, or submit.
- **Blocked days can sit inside a committed range.** `min`, `max`, and `isDateDisabled`
  reject *endpoints* only. Measured: with weekends disabled, Friday → Monday commits and
  the Saturday between them carries both `aria-disabled="true"` and `data-in-range`.
- **The view does not follow `value`.** The displayed month is seeded on the first render
  and never re-derived. Measured: a controlled calendar showing June, handed a range of
  1–7 October by a preset button, stays on June and renders **no endpoint at all** — the
  selection is silently off-screen. Drive `month` + `onMonthChange` as well, or remount the
  calendar (which is what [DateRangePicker](date-range-picker.md) does by mounting it inside its popover).
- **`defaultMonth` loses to an existing selection.** The seed is
  `range.start ?? range.end ?? defaultMonth ?? today`, in that order. Measured:
  `defaultMonth={new Date(2026, 2, 1)}` with a `defaultValue` starting 5 January opens on
  **January 2026**, not March.
- **`showToday` never selects in a range calendar.** The footer button navigates to today
  and focuses it; measured, no endpoint is set. [Calendar](calendar.md) wires the same button to select,
  and the underlying `onTodayClick` callback is not part of this component's prop type, so
  you cannot restore that behaviour from the outside.
- **Your `onPointerLeave` replaces the preview reset.** `CalendarBase` spreads rest props
  *after* its own `onPointerLeave`, which is what clears the hover preview when the pointer
  leaves the calendar. Measured: `<RangeCalendar onPointerLeave={…} />` typechecks (it is a
  `div` prop) and then leaves the preview lit — four washed cells that never clear, versus
  zero without the prop.
- **`numberOfMonths` is a maximum, not a promise.** Under a 40rem viewport the component
  renders exactly one month whatever you passed. Because the media query resolves to `false`
  on the server, an SSR'd page ships the full multi-month markup and collapses to one grid
  immediately after hydration.
- **Client-only.** `RangeCalendar` and `CalendarBase` both carry `"use client"`, so this
  cannot render directly in an RSC tree.

## Accessibility

Each visible month is its own `role="grid"` labelled with that month and year; weekday
headers are `role="columnheader"`; every day is a real `<button>` inside a
`role="gridcell"`, named with the full localized date ("June 12, 2026") so the number alone
is never the only announcement.

- **Keyboard.** Arrow keys move a day at a time (up/down by a week),
  <kbd>Home</kbd>/<kbd>End</kbd> jump to the ends of the focused week,
  <kbd>PageUp</kbd>/<kbd>PageDown</kbd> move a month, and <kbd>Enter</kbd>/<kbd>Space</kbd>
  activate. Moving focus off the visible window pages the calendar to follow. Arrowing also
  updates the range preview, so the whole two-click flow is keyboard-complete.
- **One tab stop for the whole calendar.** A roving `tabIndex` puts exactly one day button
  in the tab order — the range start if it is inside the visible window, else today if it
  is, else the 1st of the first displayed month. Measured at the default two grids, one
  grid holds that tab stop and the other holds none, so reaching a day in the second month
  means arrowing across the boundary rather than tabbing into it.
- **The extent of the range is conveyed by colour alone.** Measured: with 10–14 June
  committed, the 12th renders `aria-selected="false"` and only a `data-in-range` attribute.
  Nothing in the accessibility tree distinguishes an in-range day from an unselected one,
  and the wash that does distinguish them visually is `--C-SURFACE-2` on `--C-SURFACE-0`,
  measured elsewhere in this repo at 1.08–1.16:1 across the four shipped themes — below the
  3:1 floor for non-text contrast. The hover preview has no ARIA at all. Fails WCAG 1.4.1;
  if the range's span must be perceivable, render your own text summary next to the
  calendar, the way the first example on this page does.
- **`aria-selected` is on the button, not the cell.** ARIA does not support `aria-selected`
  on `role="button"`, and the `role="gridcell"` wrapper carries no selection state, so even
  the two endpoints are not reliably announced as selected.
- **Paging is silent at the default width.** In multi-month day view the header caption is
  an empty `aria-hidden` spacer, so pressing ‹ or › changes both grids with no live region
  to announce it and no change to the button's own label. Measured: zero `aria-live` nodes
  at `numberOfMonths={2}`, one at `numberOfMonths={1}` (the caption button).
- **Disabled days stay reachable.** They use `aria-disabled` rather than the `disabled`
  attribute, so roving arrow-key focus still lands on them and they announce as unavailable
  instead of disappearing from the grid; the click is simply dropped.
- **The root has no role or name.** It is a plain `<div>`, so an `aria-label` on it is not
  exposed. Wrap the calendar in something that carries the purpose — a labelled `<section>`,
  or a dialog the way [DateRangePicker](date-range-picker.md) labels its popover.

## Related

[Calendar](calendar.md) · [DateRangePicker](date-range-picker.md) · [DatePicker](date-picker.md) · [IconButton](icon-button.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
