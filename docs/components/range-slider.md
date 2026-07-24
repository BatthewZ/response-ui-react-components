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
| `min`           | `number`                                                | `0`                                     |
| `max`           | `number`                                                | `100`                                   |
| `step`          | `number`                                                | `1`                                     |
| `minDistance`   | `number`                                                | `0`                                     |
| `error`         | `boolean`                                               | the [Field](field.md) state, else `false` |
| `disabled`      | `boolean`                                               | —                                       |
| `minLabel`      | `string`                                                | `"Minimum"`                             |
| `maxLabel`      | `string`                                                | `"Maximum"`                             |
| `className`     | `string`                                                | — (lands on the wrapper)                |
| `style`         | `CSSProperties`                                         | —                                       |
| `ref`           | `Ref<HTMLDivElement>`                                   | —                                       |
| …rest           | `<div>` props except `onChange`, `defaultValue`, `children` | —                                   |

Read that last row twice. The rest props are **`div` props, spread onto the wrapper** — the
two `<input>` elements are unreachable from outside. `id`, `aria-describedby`, `aria-label`
and `aria-valuetext` all land on the wrapper; the only per-thumb props the component
forwards are `min`, `max`, `step`, `disabled`, and the two label strings. See
[Gotchas](#gotchas).

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

With the default `minDistance` of `0` the two can land on exactly the same number — which is
where the pointer gets stuck, so a non-zero gap is worth setting whenever a zero-width range
is meaningless. See [Gotchas](#gotchas).

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
announce a range input as a percentage of its travel — and unlike
[Slider](slider.md), there is no way to correct that here, because `aria-valuetext` cannot
reach either input. Putting the unit in `minLabel` / `maxLabel` is the available workaround:
the name is spoken even when the number is wrong.

## In a form

Inside a [Field](field.md), the resolved error drives the wrapper's `aria-invalid`, which
re-tints the fill and both thumbs. The wiring stops there: the field's error `id` is computed
and then discarded, so give [FieldError](field-error.md) an explicit `id` and point the
group's `aria-describedby` at it.

<!-- example:InField -->
```tsx
<Field error="Meetings must span at least 30 minutes.">
  <Label id="meeting-length-label">Meeting length (minutes)</Label>
  <RangeSlider
    role="group"
    aria-labelledby="meeting-length-label"
    aria-describedby="meeting-length-error"
    defaultValue={[30, 45]}
    min={15}
    max={120}
    step={5}
    minLabel="Shortest meeting"
    maxLabel="Longest meeting"
  />
  <FieldError id="meeting-length-error" />
</Field>
```
<!-- /example -->

Standalone, the `error` prop sets the same state directly. It takes precedence over the
surrounding field, so `error={false}` forces a valid appearance inside an invalid
[Field](field.md).

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

There is no `name`, no hidden input, and no form participation — the prop type is `div`
props, so `name` will not even compile. To submit a range, mirror the state into two hidden
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
| Unselected rail                                   | `--C-SURFACE-2`    |
| Segment and thumbs when invalid                   | `--C-STATUS-ERROR` |
| Ring around each thumb, and the gap inside its focus ring | `--C-SURFACE-0` |
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

Both the thumb ring and the 2px gap inside the focus ring are hard-wired to `--C-SURFACE-0`,
the *base* surface — see [Gotchas](#gotchas) before dropping one on a card.

## Gotchas

- **Two thumbs on the same number: one of them is buried.** Both inputs span the full track
  with `pointer-events: none`, and only the thumbs take pointer events — so where the thumbs
  overlap exactly, the pointer always grabs whichever input is stacked higher. While no drag
  is in progress, the component raises the *lower* input to `z-index: 4` when its value is
  above the midpoint of `[min, max]`, and otherwise leaves both at `auto`, where DOM order
  puts the *upper* input on top. Both branches leave the other thumb unreachable: at
  `[30, 30]` on a `0`–`100` scale the lower thumb cannot be grabbed, and at `[70, 70]` the
  upper one cannot. Dragging the reachable thumb away frees the buried one, and both remain
  reachable by keyboard, but the control reads as stuck. A `minDistance` above `0` prevents
  the collision entirely — as long as the value you start it with respects the gap too.
- **The rail is not clickable.** `pointer-events` are confined to the thumbs, so clicking an
  empty stretch of track does nothing — no jump-to-position, unlike a plain
  [Slider](slider.md). Every change comes from dragging a thumb or from the keyboard.
- **The error state does not reach the thumbs.** `aria-invalid="true"` is written on the
  wrapper `div`, not on either input, so the control you actually focus does not report
  itself invalid; and the `aria-describedby` the component derives from a
  [Field](field.md) is computed and then dropped on the floor, so nothing points at the
  [FieldError](field-error.md) text. What is left is a colour change on the fill and the
  thumbs — status by colour alone. Add `role="group"` plus your own `aria-describedby`, as
  the examples above do.
- **Nothing you pass can reach the thumbs.** The rest props are `div` props. `aria-valuetext`
  (the one attribute that fixes a non-percentage announcement), `aria-describedby`, and `id`
  all land on the wrapper. `minLabel` / `maxLabel` are the only per-thumb ARIA the component
  exposes.
- **`minDistance` is not applied to the value you pass in.** It is enforced only on changes
  the component itself makes. `defaultValue={[50, 50]}` with `minDistance={10}` renders both
  thumbs on `50` and stays there until the first drag.
- **An out-of-order pair is rendered as given.** Despite what `RangeSliderValue`'s own
  docblock says, ordering is imposed only on values the component produces. `value={[80, 20]}`
  renders the lower thumb at `80` and the upper at `20`, and the selected segment — inset
  `80%` from both sides — disappears entirely. The first drag snaps the pair back into order,
  which looks like a jump.
- **Your `style` wins over the geometry.** `--range-lo` and `--range-hi` are written first and
  your `style` object is spread after them, so `style={{ "--range-lo": "…" }}` overrides the
  computed segment and desynchronises it from the thumbs.
- **The thumb is a fifth larger in Firefox.** `::-webkit-slider-thumb` and `::-moz-range-thumb`
  get identical declarations here — a `1.25rem` box with a `2px` ring — and the two
  pseudo-elements default to different `box-sizing`, so they do not render at the same size.
  [Slider](slider.md#gotchas) has the identical rule shape and documents the mechanism and the
  measured sizes in full; Tailwind Preflight reaches neither pseudo-element. Add your own
  `::-moz-range-thumb { box-sizing: border-box }` if it matters.
- **The invalid state has the weaker focus indicator.** The only `outline` declaration in the
  stylesheet removes the browser's default focus outline, and it is scoped to
  `[aria-invalid="true"]` — so a *valid* slider keeps whatever outline the browser draws
  around the focused input (a full-track-width box, since the inputs are stretched across the
  rail) and an *invalid* one does not. The thumb's own `--C-BORDER-FOCUS` ring is drawn in
  both states, so focus is never invisible; it is just inconsistent between the two.
- **The thumb ring assumes the base surface.** The 2px thumb border and the 2px gap inside the
  focus ring are both `--C-SURFACE-0`. On any other layer — a `--C-SURFACE-1` card, a tinted
  panel — that ring reads as a halo in the wrong colour. Restyle it through `className`, or
  keep range sliders on the base surface.
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

Four things are still yours to supply.

- **A name for each thumb.** `minLabel` and `maxLabel` become `aria-label` on the lower and
  upper input. Unlike [Slider](slider.md), a name always exists — but the defaults,
  `"Minimum"` and `"Maximum"`, say nothing about *what*, and two range sliders on one page
  produce four identically-named sliders. Name them for the quantity: `"Minimum price"`.
- **A name for the pair.** The wrapper has no role, so the two thumbs are announced as
  unrelated sliders. Pass `role="group"` and an `aria-label` or `aria-labelledby` to bind them
  into one named group; both reach the wrapper through the rest spread.
- **The unit.** A range input is commonly announced as a bare number or as a percentage of its
  travel, which is wrong on a scale like `-30`–`10`. `aria-valuetext` is the fix and it cannot
  be delivered here, so fold the unit into `minLabel` / `maxLabel` instead.
- **The error description.** `aria-invalid` sits on the wrapper rather than on the inputs, and
  the [Field](field.md)-derived `aria-describedby` is discarded — so an invalid range slider
  is, to a screen reader, an ordinary one. With `role="group"` on the wrapper you can attach
  your own `aria-describedby` to the group; give [FieldError](field-error.md) an explicit `id`
  to point at.

A visible readout is not a substitute for any of these: it is separate text with no
programmatic relationship to either input unless you create one.

## Related

[Slider](slider.md) · [NumberInput](number-input.md) · [Meter](meter.md) ·
[ProgressBar](progress-bar.md) · [Field](field.md) · [Label](label.md) ·
[FieldError](field-error.md) · `DateRangePicker` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
