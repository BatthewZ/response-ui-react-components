# RangeSlider

The control for picking a `[low, high]` pair — a price band, a delivery window, a
temperature range. It is two overlaid native `<input type="range">` elements, so each thumb
gets real slider semantics, arrow keys, and focus handling from the platform, while the rail
and the selected segment are painted underneath from theme tokens.

<!-- example:Minimal -->
```tsx
<RangeSlider defaultValue={[20, 80]} minLabel="Minimum price" maxLabel="Maximum price" />
```
<!-- /example -->

| Prop            | Type                                                    | Default                                 |
| --------------- | ------------------------------------------------------- | --------------------------------------- |
| `value`         | `RangeSliderValue` (`[number, number]`)                 | — (uncontrolled)                        |
| `defaultValue`  | `RangeSliderValue`                                      | `[min, max]`                            |
| `onValueChange` | `(value: RangeSliderValue) => void`                     | —                                       |
| `onChange`      | `(value: RangeSliderValue) => void`                     | —                                       |
| `min`           | `number`                                                | `0`                                     |
| `max`           | `number`                                                | `100`                                   |
| `step`          | `number`                                                | `1`                                     |
| `minDistance`   | `number`                                                | `0`                                     |
| `error`         | `boolean`                                               | the [Field](field.md) state, else `false` |
| `disabled`      | `boolean`                                               | —                                       |
| `minLabel`      | `string`                                                | `"Minimum"`                             |
| `maxLabel`      | `string`                                                | `"Maximum"`                             |
| `formatValue`   | `(value: number) => string`                             | — (`aria-valuetext` on both thumbs)     |
| `className`     | `string`                                                | — (lands on the wrapper)                |
| `style`         | `CSSProperties`                                         | —                                       |
| `ref`           | `Ref<HTMLDivElement>`                                   | —                                       |
| …rest           | `<div>` props except `defaultValue`, `children`; `onChange` is re-typed above | —         |

Read that last row twice. The rest props are **`div` props, spread onto the wrapper**. Two
exceptions travel down to the thumbs, because they only mean anything on the focusable
control: `aria-invalid` and `aria-describedby`, which are merged under whatever the component
derives from `error` or a surrounding [Field](field.md). `formatValue` supplies each thumb's
`aria-valuetext`. Everything else per-thumb — `min`, `max`, `step`, `disabled`, `minLabel`,
`maxLabel` — is a named prop. See [Gotchas](#gotchas).

`onChange` is the one prop that escapes that spread: it carries the committed
`RangeSliderValue`, the same payload as `onValueChange` rather than a `ChangeEvent`, and is
destructured out before the wrapper is rendered. That is what lets
`{...form.field<RangeSliderValue>("span")}` write an ordered pair into the store instead of
one thumb's raw string.

`RangeSliderValue` is exported alongside the component, so a `useState` holding the pair can
be typed without redeclaring the tuple.

## Reading the value out

There is no number anywhere in the markup — the thumbs' positions are the only feedback.
Drive the pair with `value` + `onValueChange` and print the figures yourself. And because
the wrapper is a bare `div` with no role, give it `role="group"` before you label it:
without a role, an `aria-labelledby` on the wrapper is attached to a generic element.

<!-- example:WithReadout -->
```tsx
<Label id="budget-label">Monthly budget (USD)</Label>
<RangeSlider
  role="group"
  aria-labelledby="budget-label"
  value={budget}
  onValueChange={setBudget}
  min={0}
  max={500}
  step={10}
  minLabel="Minimum budget"
  maxLabel="Maximum budget"
/>
<output className="text-body-2 tabular-nums text-fg-secondary">
  ${budget[0]} – ${budget[1]}
</output>
```
<!-- /example -->

The state behind that example is
`const [budget, setBudget] = useState<RangeSliderValue>([120, 380])`. A
[Label](label.md) is used for the group heading rather than for one of the thumbs: `htmlFor`
addresses exactly one control, and this component has two.

`onValueChange` fires on every movement, not once on release — React's `onChange` on a range
input is the native `input` event — and it always receives a **fresh, ordered pair**, never a
single thumb. Debounce the expensive work, keep the readout synchronous.

**Controlled or uncontrolled, decided once.** Pass `value` and you own the pair: the
component never moves a thumb on its own, so a handler that ignores a change leaves the
slider where it was. Omit `value` and it keeps its own state, seeded from `defaultValue` or
from `[min, max]` when you give neither. The mode is locked on the first render, so a `value`
that starts out `undefined` leaves the slider uncontrolled for its whole life.

## Keeping the thumbs apart

Neither thumb can cross the other. Push the lower one up and it stops at
`upper − minDistance`; push the upper one down and it stops at `lower + minDistance`. The
far thumb is never dragged along, and the two never swap places.

<!-- example:MinimumGap -->
```tsx
<Label id="delivery-window-label">Delivery window (days)</Label>
<RangeSlider
  role="group"
  aria-labelledby="delivery-window-label"
  defaultValue={[2, 9]}
  min={1}
  max={30}
  minDistance={3}
  minLabel="Earliest day"
  maxLabel="Latest day"
/>
```
<!-- /example -->

With the default `minDistance` of `0` the two can land on exactly the same number. Both stay
grabbable there: the thumb the pointer is approaching from — left of the pair, or right of it —
is the one raised to the top. A non-zero gap is still worth setting whenever a zero-width range
is meaningless. A `value`/`defaultValue` that arrives reversed, out of range, or closer than
`minDistance` is brought onto the scale before it is drawn, so the picture always matches the
numbers announced.

A movement that clamps to the number already held fires nothing: `onValueChange` runs only
when the clamped pair differs from the current one, so a drag that keeps pushing at the wall
is silent. The component instead writes the pinned number straight back onto the DOM input. A
native range input keeps advancing its own value even when React's state does not change, so
without that write the thumb would slide visibly past the boundary and snap back on the next
render.

## A scale that isn't a percentage

`min`, `max`, and `step` pass through to both inputs unchanged, and `step` sets the
granularity of dragging and of the arrow keys together.

<!-- example:CustomScale -->
```tsx
<Label id="freezer-alarm-label">Freezer alarm thresholds</Label>
<RangeSlider
  role="group"
  aria-labelledby="freezer-alarm-label"
  defaultValue={[-20, -5]}
  min={-30}
  max={10}
  step={5}
  minLabel="Lower alarm, degrees Celsius"
  maxLabel="Upper alarm, degrees Celsius"
/>
```
<!-- /example -->

Note where the unit went. On a scale that is not a percentage, screen readers commonly
announce a range input as a percentage of its travel. `formatValue` corrects that: it is
applied as `aria-valuetext` on both thumbs, so `formatValue={(v) => `$${v}`}` makes each thumb
announce the money rather than the percentage. Putting the unit in `minLabel` / `maxLabel`
names the two ends as well.

## In a form

Inside a [Field](field.md), the resolved error puts `aria-invalid` and the field's error `id`
on **both thumbs**, so a focused thumb reports itself invalid and points at the message. The
wrapper carries neither — an AT never reads it while a thumb has focus — but it still re-tints
the fill and the thumbs from the same state.

<!-- example:InField -->
```tsx
<Field error="Meetings must span at least 30 minutes.">
  <Label id="meeting-length-label">Meeting length (minutes)</Label>
  <RangeSlider
    role="group"
    aria-labelledby="meeting-length-label"
    defaultValue={[30, 45]}
    min={15}
    max={120}
    step={5}
    minLabel="Shortest meeting"
    maxLabel="Longest meeting"
  />
  <FieldError />
</Field>
```
<!-- /example -->

An `aria-describedby` of your own is merged *under* the component's, so inside an errored
[Field](field.md) the thumbs point at the `id` [FieldError](field-error.md) generates for
itself rather than at yours.

Standalone, the `error` prop sets the same state directly. It takes precedence over the
surrounding field, so `error={false}` forces a valid appearance inside an invalid
[Field](field.md). With no field to derive anything from, an `aria-describedby` you pass
reaches both thumbs untouched — which is what the example below relies on.

<!-- example:ErrorState -->
```tsx
<Label id="payout-range-label">Payout range (USD)</Label>
<RangeSlider
  role="group"
  aria-labelledby="payout-range-label"
  aria-describedby="payout-range-hint"
  error
  defaultValue={[0, 900]}
  max={1000}
  step={50}
  minLabel="Minimum payout"
  maxLabel="Maximum payout"
/>
<p id="payout-range-hint" className="text-body-3 text-status-error">
  A floor of 0 turns off the automatic transfer.
</p>
```
<!-- /example -->

There is no `name`, no hidden input, and no native form participation — the prop type is
`div` props, so `name` will not even compile. A form store binds fine, since `onChange`
hands it the pair; to submit through a plain `<form>`, mirror the state into two hidden
inputs of your own.

## Disabled

<!-- example:Disabled -->
```tsx
<Label id="archived-price-label">Archived price filter</Label>
<RangeSlider
  role="group"
  aria-labelledby="archived-price-label"
  disabled
  defaultValue={[35, 65]}
  minLabel="Minimum price"
  maxLabel="Maximum price"
/>
```
<!-- /example -->

The native attribute reaches both inputs, so both drop out of the tab order and stop
responding, and `data-disabled` on the wrapper halves the whole control's opacity. There is
no read-only mode.

## Theme tokens

`RangeSlider.css` (shipped in this package's `styles` import) paints everything; the `.tsx`
carries no Tailwind utilities at all — only the `range-slider` BEM class names. Every colour
and corner reads a contract variable, so overriding one re-tints every range slider in the
app at runtime, with no rebuild.

| Where                                             | Override           |
| ------------------------------------------------- | ------------------ |
| Selected segment between the thumbs, and both thumbs | `--C-ACCENT`    |
| Unselected rail                                   | `--C-SURFACE-3`    |
| Segment and thumbs when invalid                   | `--C-STATUS-ERROR` |
| Ring around each thumb                            | `--C-SURFACE-0`    |
| Focus ring on the focused thumb                   | `--C-BORDER-FOCUS` |
| Rail, segment, and thumb corners                  | `--RADIUS-FULL`    |

The selected segment is a separate absolutely-positioned element inset from both edges by two
component-internal custom properties: `--range-lo` is its `left`, `--range-hi` its `right`,
both written inline on the wrapper on every render as `((value − min) / (max − min)) × 100`,
clamped to `0%`–`100%` and, for the upper one, subtracted from `100%`. They are not theme
tokens; overriding them in a stylesheet is pointless, because the component rewrites them
from the props on every render.

A handful of measurements are **not** on the contract and are not themeable: the control is a flat
`1.25rem` tall and `100%` wide, the rail `0.5rem` tall, each thumb a `1.25rem` square with a
`2px` ring, and the disabled state a flat `0.5` opacity. None of them sit on the responsive
`r`-scale, so a range slider is exactly the same size on mobile and desktop while the layout
around it steps up at the 40rem breakpoint. Width comes from the parent — this control always
fills it.

Each thumb's 2px ring is hard-wired to `--C-SURFACE-0`, the *raised-sheet* rung — see
[Gotchas](#gotchas) before dropping one on the page canvas. The focus ring lands flush on that ring,
with no backdrop-coloured gap of its own.

## Gotchas

- **Two thumbs on the same number: the one you reach for comes to the top.** Both inputs span
  the full track with `pointer-events: none`, and only the thumbs take pointer events — so
  where the thumbs overlap exactly, the pointer grabs whichever input is stacked higher. While
  no drag is in progress the component decides that from the pointer: left of the pair raises
  the lower thumb, right of it leaves the upper one on top, so whichever direction you approach
  from, the thumb that can move that way is the one you get. A touch that lands without any
  prior pointer movement falls back to a positional heuristic; the next press is correct. A
  `minDistance` above `0` avoids the collision entirely.
- **The rail is not clickable.** `pointer-events` are confined to the thumbs, so clicking an
  empty stretch of track does nothing — no jump-to-position, unlike a plain
  [Slider](slider.md). Every change comes from dragging a thumb or from the keyboard.
- **Your own `aria-describedby` loses inside an errored [Field](field.md).** It is merged
  under the value the component derives, which names the `id`
  [FieldError](field-error.md) generates for itself. Pass one only where there is no field
  to derive from, and leave FieldError's `id` alone inside one.
- **Most of what you pass lands on the wrapper.** The rest props are `div` props, so `id` and
  `aria-label` describe the wrapper, not a thumb. The per-thumb surface is deliberate and
  small: `minLabel` / `maxLabel` for the names, `formatValue` for `aria-valuetext`, and
  `aria-invalid` / `aria-describedby`, which the component routes down for you.
- **Your `style` wins over the geometry.** `--range-lo` and `--range-hi` are written first and
  your `style` object is spread after them, so `style={{ "--range-lo": "…" }}` overrides the
  computed segment and desynchronises it from the thumbs.
- **The thumbs match across engines because the stylesheet says so.** `::-moz-range-thumb`
  defaults to `content-box` — Tailwind Preflight reaches neither thumb pseudo-element — which
  used to render a 24px thumb in Firefox against Chromium's 20px. `RangeSlider.css` sets
  `box-sizing: border-box` on it explicitly, the same fix as [Slider](slider.md#gotchas);
  keep that declaration if you restyle the thumbs.
- **The UA focus outline is suppressed in every state.** `.range-slider__input:focus-visible`
  sets `outline: none` unconditionally — a UA outline would draw a full-track-width box,
  since the inputs are stretched across the rail — and the focused thumb paints its own
  `--C-BORDER-FOCUS` ring instead, valid or invalid alike, so the indicator is consistent
  between the two states.
- **The thumb ring assumes a rung-0 sheet.** The 2px thumb border is `--C-SURFACE-0`, so it
  vanishes into a [Card](card.md), a [Dialog](dialog.md) or the [AppShell](app-shell.md)
  chrome — all rung 0. On the page canvas, on a `--C-SURFACE-1` panel nested inside a sheet,
  or on a tinted one, it reads as a halo in the wrong colour. (The focus ring adds no
  surface-coloured gap of its own.) Restyle it through `className`, or keep range sliders on
  a rung-0 sheet.
- **Both CSS imports are required.** The `.range-slider` rules live in this package's `styles`
  entry and read `--C-*` / `--RADIUS-*` from `@batthewz/response-ui-css` — import the
  foundation first, then this package's `styles`. Without them you get two unstyled native
  range inputs sitting on top of each other.
- **Client component.** `RangeSlider` is `"use client"` — it holds controlled/uncontrolled
  state, tracks which thumb is mid-drag, and reads the [Field](field.md) context — so it needs
  a client boundary in an RSC tree.

## Accessibility

Each thumb is a real `<input type="range">`, so the platform supplies `role="slider"`,
`aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and the full arrow-key / Home / End /
Page Up / Page Down set, per thumb. They are **two separate tab stops**, in lower-then-upper
DOM order, and the same clamping that governs dragging governs the arrow keys — so a keyboard
user can move either of two collided thumbs, in either direction, where a pointer user can
only move whichever one is on top. The rail and the selected segment are `aria-hidden`
decorative spans.

Three things are still yours to supply.

- **A name for each thumb.** `minLabel` and `maxLabel` become `aria-label` on the lower and
  upper input. Unlike [Slider](slider.md), a name always exists — but the defaults,
  `"Minimum"` and `"Maximum"`, say nothing about *what*, and two range sliders on one page
  produce four identically-named sliders. Name them for the quantity: `"Minimum price"`.
- **A name for the pair.** The wrapper has no role, so the two thumbs are announced as
  unrelated sliders. Pass `role="group"` and an `aria-label` or `aria-labelledby` to bind them
  into one named group; both reach the wrapper through the rest spread.
- **The unit.** A range input is commonly announced as a bare number or as a percentage of its
  travel, which is wrong on a scale like `-30`–`10`. `formatValue` is the fix — it becomes
  `aria-valuetext` on both thumbs — and folding the unit into `minLabel` / `maxLabel` names
  the two ends as well.

The error wiring, by contrast, is not yours to supply: `aria-invalid` and the
[Field](field.md)-derived `aria-describedby` land on **both thumbs**, so the slider a screen
reader lands on reports itself invalid and points at the message. Your own
`aria-describedby` merges under the derived one — it survives standalone and loses inside an
errored [Field](field.md).

A visible readout is not a substitute for any of these: it is separate text with no
programmatic relationship to either input unless you create one.

## Related

[Slider](slider.md) · [NumberInput](number-input.md) · [Meter](meter.md) ·
[ProgressBar](progress-bar.md) · [Field](field.md) · [Label](label.md) ·
[FieldError](field-error.md) · [DateRangePicker](date-range-picker.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
