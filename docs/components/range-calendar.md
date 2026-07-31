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
| `labels`         | `CalendarLabels`                                           | English strings            |
| `ref`            | `Ref<HTMLDivElement>`                                      | —                          |
| …rest            | `div` props, minus `value` / `defaultValue`; `onChange` is a compile error | —          |

`onChange` is declared `onChange?: never`: passing one is a **compile error**, not a prop
that quietly does nothing. The change channel is `onValueChange`.

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

The centre caption is always a button that opens a month picker, then a year picker. With
two or more grids it reads the whole visible span (`"June 2026 – July 2026"`) and the quick
jump moves the whole window. Below a 40rem viewport the component collapses to one paged
month regardless of what you passed.

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

The view follows a *change* of range on its own — write a span in another month from a
preset button and the grids move there, anchored on `start ?? end`, with `onMonthChange`
reporting the move. Own `month` yourself and that follow becomes a request instead: the
grids stay put and `onMonthChange` is called with the month that would show the range,
which the handler below honours by holding it in state:

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
fails it renders `aria-disabled="true"` and drops its click. While the second endpoint is
being picked, a candidate day is *also* blocked when any `isDateDisabled` day lies strictly
between it and `start` — so with weekends blocked, a Friday → Monday pick refuses the
Monday rather than committing a range that spans the Saturday. `min` and `max` need no
such scan: they are contiguous bounds, so they cannot block an interior day of a span
whose endpoints both pass. The one hole left is a `value`/`defaultValue` you write from
outside — nothing validates a range the component didn't pick, so guard preset spans
yourself.

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
<kbd>Home</kbd>/<kbd>End</kbd> treat as the ends of a week. The `labels` object overrides
the English defaults for the ‹ › button names and the in-range/preview name suffixes.

## Today shortcut

<!-- example:TodayShortcut -->
```tsx
<RangeCalendar numberOfMonths={1} defaultMonth={new Date(2026, 0, 1)} showToday todayLabel="Jump to today" />
```
<!-- /example -->

`showToday` renders a footer button that navigates to today, focuses it, and — when today
is selectable — feeds it into the same two-click protocol as clicking the cell: it starts
a new range, or completes one mid-pick. If `min`/`max`/`isDateDisabled` rule today out,
the button still navigates but selects nothing.

## Slots

`className` addresses the calendar root. `classNames` addresses the elements inside it —
class strings only, and the keys are typed, so a misspelled one is a compile error rather
than a prop that does nothing.

RangeCalendar renders none of that markup itself: the anatomy is `CalendarBase`'s, and both
`classNames` and [`renderDay`](calendar.md#renderday) are forwarded straight through. **The
slot table is [Calendar's](calendar.md#slots)** — the same fifteen keys, unchanged, because
it is the same element tree.

```tsx
<RangeCalendar
  defaultMonth={new Date(2026, 5, 1)}
  classNames={{ day: "rounded-full", month: "min-w-[18rem]" }}
/>
```

Two things worth knowing here specifically:

- **A slot on a repeated element lands on every instance**, and a range calendar shows two
  months by default — so `classNames.month` styles both grids, not the first.
- **`day` appends, it never replaces.** `.calendar-day` is the selector the roving-focus
  effects query, so the base class is written first and yours is added to it. The range
  band, the endpoints and the hover preview are all `data-*` state on that same button
  (`data-in-range`, `data-range-start`, `data-range-end`, `data-preview`), so a slot class
  sits alongside them rather than fighting them — see [Gotchas](#gotchas).

## Theme tokens

RangeCalendar declares no styling of its own: there is no `RangeCalendar.css`, and its
source contains no Tailwind utility. It renders `CalendarBase`, whose markup is painted by
`CalendarBase.css` — the same sheet behind [Calendar](calendar.md), shipped in this package's `styles.css`.
So every override below re-tints the single-date calendar at the same time, and there is no
per-component variable to reach for here.

Everything that sheet reads, grouped by what you would want to change:

- **Range band** — days strictly between the endpoints, and the live preview, both wash
  with `--C-SURFACE-3` — one surface step deeper than the hover wash — and square off
  their corners.
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
that component, not from `CalendarBase.css`.

## Gotchas

- **`onValueChange` fires with a half-finished range.** The first click emits
  `{ start, end: null }`. A handler that assumes both dates exist will read `null` on every
  other call. Guard on `end != null` before you fetch, filter, or submit.
- **Only ranges the component picks are validated.** An interactive pick can no longer
  span an `isDateDisabled` day — completing a range scans the interior and blocks the
  second endpoint — but a `value` or `defaultValue` you write from outside is rendered as
  given, blocked interior days and all.
- **The view follows a *change* of range, not the range itself.** Hand a calendar showing
  June a range of 1–7 October from a preset button and it moves to October, firing
  `onMonthChange`. The anchor is `start ?? end`. Because it is edge-triggered, paging away
  from the range stays put — an unrelated re-render will not drag you back — and a range
  change landing inside the visible window moves nothing. If you own `month`, the prop wins
  and the move arrives as an `onMonthChange` request instead.
- **`defaultMonth` beats an existing selection.** The seed is
  `defaultMonth ?? range.start ?? range.end ?? today`, in that order, so the month you name
  explicitly opens even when a range is already set: `defaultMonth={March 2026}` with a
  `defaultValue` starting 5 January opens on **March**.
- **`showToday` is a range pick, not a jump-and-select.** The footer button feeds today
  into the two-click protocol, so mid-pick it *completes* the in-progress range at today
  rather than selecting today alone — press it twice from a clean slate and you get a
  one-day range. When today is not selectable it only navigates.
- **`onPointerLeave` cannot hold the hover preview open.** A handler you pass is composed
  with the internal one — yours runs first, then the preview is cleared unconditionally, with
  no `preventDefault()` opt-out. So the previewed span always drops when the pointer leaves
  the calendar: fine for your own teardown or analytics, no use for keeping those washed
  cells lit.
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
- **Range membership is in the accessible name.** An in-range day is named
  `"June 12, 2026, in selected range"` and a previewed one `", in previewed range"`, so the
  span is not carried by the tint alone. Override the two suffixes through `labels.inRange`
  and `labels.previewRange`. The wash itself is `--C-SURFACE-3` — one step deeper than the
  hover wash so the two are no longer identical, but still well under the 3:1 non-text floor;
  if the span must be perceivable at a glance, render your own text summary next to the
  calendar, the way the first example on this page does.
- **`aria-selected` is on the `role="gridcell"` wrapper,** not on the day `<button>` — ARIA
  does not support the attribute on `button`. Style hooks off `[data-selected]` on the button.
- **Paging announces at every width.** The header caption is always a real button and always
  the calendar's `aria-live="polite"` region; in multi-month day view it reads the whole
  visible span, e.g. `"June 2026 – July 2026"`.
- **Disabled days stay reachable.** They use `aria-disabled` rather than the `disabled`
  attribute, so roving arrow-key focus still lands on them and they announce as unavailable
  instead of disappearing from the grid; the click is simply dropped.
- **The root has no role or name.** It is a plain `<div>`, so an `aria-label` on it is not
  exposed. Wrap the calendar in something that carries the purpose — a labelled `<section>`,
  or a dialog the way [DateRangePicker](date-range-picker.md) labels its popover.

## Related

[Calendar](calendar.md) · [DateRangePicker](date-range-picker.md) · [DatePicker](date-picker.md) · [IconButton](icon-button.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
