# calendar-base — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 310 · CalendarBase — a controlled `value` never moves the calendar (med)

The only re-anchor is `if (!isMonthVisible(focusDate)) setFocusDate(computeInitialFocus())`. It
watches the *roving focus day*, not the selection, so when a controlled `value` (or range) moves to
another month the old focus day is still visible, the guard never fires, and `displayedMonth` stays
put. Measured on `Calendar`: rerender `value={Jun 10 2026}` → `value={Sep 3 2026}` and the grid is
still labelled "June 2026", **zero** buttons carry `aria-selected="true"`, and the tab stop is still
on June 10. Measured on `RangeCalendar`: a preset button setting 1–7 Oct 2026 leaves both grids on
June/July with `[data-range-start]` count **0**. Every preset button, "next available slot" link and
URL-param sync therefore writes a selection the user cannot see, with nothing reporting it.
**Fix:** re-anchor `displayedMonth`/`focusDate` when `focusAnchor` changes to a month outside the
visible window — `revealMonth` already does exactly this for keyboard focus.

**Assessed alongside #324/#325/#335/#289 and deliberately declined. Re-verified true at
`CalendarBase.tsx:174`; recorded here so the next agent does not re-litigate it.** Two reasons:

1. **It is not the duplicate-representation class those four belonged to.** `displayedMonth` is
   *independently public* — `month`, `defaultMonth` and `onMonthChange` are real props
   (`CalendarBase.tsx:150-153`) — and a user may page away from the selection on purpose. "The view
   follows the selection" is therefore a product decision about precedence between two legitimate
   public inputs, not a bug where one value is stored twice. Judged RC-4 (visual state), not RC-3.
2. **Every available fix reintroduces exactly what `5295190` deleted** — a hand-rolled reconciliation
   between a prop and a piece of derived state, watched by a ref or an effect. Doing that here while
   removing it four files over would leave the codebase arguing with itself.

Reopen with an owner decision on `month`-vs-`value` precedence, which also settles #311.

### 311 · CalendarBase — the two layers encode opposite `defaultMonth` precedence (med)

`Calendar.tsx:47` computes `defaultMonth ?? value ?? defaultValue` (prefer `defaultMonth`) and hands
the result down, but `CalendarBase.tsx:136` then seeds `startOfMonth(focusAnchor ?? defaultMonth ??
today)` — and `focusAnchor` *is* the selection. The selection therefore wins, inverting the layer
above it. Measured: `<Calendar defaultMonth={new Date(2026,5,1)} defaultValue={new Date(2026,0,20)}/>`
opens on **January 2026**, not June; `<RangeCalendar defaultMonth={March 2026}/>` with a
`defaultValue` starting 5 Jan opens on January. `defaultMonth` silently does nothing in the one case
callers reach for it — seeding a booking window that is not where the current value is.
**Fix:** seed `defaultMonth ?? focusAnchor ?? today`, matching the caller-facing precedence.

### 312 · CalendarBase — `showToday` emits a wall-clock `Date`, day cells emit midnight (med)

`today` is `new Date()` captured at the top of the render, and `handleToday` passes it straight to
`onTodayClick`. Every day cell instead emits a value built by `buildMonthGrid`, which is local
midnight. Measured on one render: a day click gave `00:00:00.000`, the Today button gave
`02:18:01.670`. Two selections of the same calendar day are therefore not `getTime()`-equal, so
de-duplication, `Set`/`Map` keys, cache invalidation and "did this change?" comparisons all break for
exactly one input path — and the value round-trips through `toISODate` identically, so the bug is
invisible until something compares timestamps.
**Fix:** `onTodayClick?.(startOfDay(today))` — `startOfDay` is already imported in `util/date`.

### 313 · CalendarBase — the month/year quick-nav is a malformed grid with no keyboard model (med)

`renderMonthsView`/`renderYearsView` emit `<div role="grid">` containing twelve `<button>`s and
nothing else. Measured after opening the month picker: **0** descendants with `role="row"`, **0** with
`role="gridcell"`, all twelve buttons tab-focusable (no `tabIndex`, so the default `0`), and
`ArrowRight`/`ArrowDown` move nothing — `handleDayKeyDown` is bound to the *day* grid only. A
`role="grid"` whose children are not rows is invalid ARIA, so a screen-reader user gets a broken
structure; a keyboard user gets twelve extra tab stops where the pattern promises one.
**Fix:** wrap the cells in `role="row"`/`role="gridcell"` and reuse the day grid's roving-tabindex
keydown handler — or drop the grid role entirely and expose it as `role="group"`.

### 314 · CalendarBase — `aria-selected` is on a role that does not support it (med)

The day button renders `<div role="gridcell"><button aria-selected={selected}>`. ARIA supports
`aria-selected` on `gridcell`, `option`, `row`, `tab`, `columnheader`, `rowheader` and `treeitem` —
not on `button`. Measured with a date selected: the button has `aria-selected="true"` and its
gridcell parent's `aria-selected` is **`null`**. A conforming AT may drop the attribute entirely, in
which case nothing anywhere in the calendar reports which day is chosen and the accent fill is the
only cue left — and that fill is itself #319. This is the APG datepicker pattern's one hard
requirement and it is inverted here.
**Fix:** move `aria-selected` onto the `role="gridcell"` wrapper (or switch the button to
`aria-pressed`).

### 315 · CalendarBase — a range's extent is conveyed by colour alone (med)

`selected` is computed as `status.selected || status.rangeStart || status.rangeEnd` — `inRange` and
`preview` are deliberately excluded, and neither gets any other ARIA. Measured with 10–14 June
committed: the 12th renders `aria-selected="false"` plus a bare `data-in-range` attribute, which is
indistinguishable in the accessibility tree from an unpicked day. The only differentiator is a
`--C-SURFACE-2` wash on `--C-SURFACE-0`, measured in this repo at **1.10 / 1.08 / 1.08 / 1.16:1**
across the four shipped themes (#210) — an order of magnitude under the 3:1 non-text floor. So the
span of a range is perceivable neither to AT nor, reliably, to a sighted user with reduced contrast
sensitivity. WCAG 1.4.1 and 1.4.11. The hover preview has no ARIA at all.
**Fix:** set `aria-selected` (or a documented `aria-description`) on in-range gridcells, and give the
band a token that clears 3:1 against `--C-SURFACE-0`.

### 316 · CalendarBase — a caller's `onPointerLeave` silently replaces the preview reset (med)

The root renders `onPointerLeave={onDayHover ? () => onDayHover(null) : undefined}` and *then*
`{...props}`, so any `onPointerLeave` a caller passes overwrites the internal one rather than
composing with it — and it typechecks, because `onPointerLeave` is an un-`Omit`ted `div` prop.
Measured on `<RangeCalendar onPointerLeave={() => {}}/>`: pick a start, hover the 14th, then move the
pointer off the calendar — **4** cells keep `data-preview` and stay lit indefinitely; the identical
control without the prop clears to **0**. The stale band then reads as a committed range that does
not exist. Instance of the "rest-spread after a component's own handler" pattern at the top of this
file.
**Fix:** destructure `onPointerLeave` out and call both handlers.

### 317 · CalendarBase — multi-month view has no live region and no quick-nav (med)

`captionInteractive` is `view !== "days" || monthCount === 1`, so at two or more grids the centre
caption renders as `<div className="calendar-label" aria-hidden="true"/>` — an empty spacer. That
node is also the *only* place `aria-live="polite"` appears in the component, and the only route into
the month/year pickers. Measured: `<RangeCalendar/>` (the default `numberOfMonths={2}`) has **0**
elements with `aria-live` and **0** `.calendar-label-button`; at `numberOfMonths={1}` both are **1**.
Pressing ‹ or › then changes both grid labels while focus stays on a button whose own label never
changes, so a screen-reader user gets no feedback that the view moved, and has no way to jump a year
without pressing › twelve times.
**Fix:** keep an `aria-live` status node (e.g. the visible window "June – July 2026") in the
multi-month header instead of an inert spacer, and expose the quick-nav from it.
