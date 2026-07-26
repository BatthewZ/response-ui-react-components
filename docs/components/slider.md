# Slider

The control for choosing a number from a continuous range — a styled native
`<input type="range">`, so dragging, arrow keys, and the `slider` role come from the
platform rather than from JavaScript. It is an **input**: unlike [Meter](meter.md) or
[ProgressRing](progress-ring.md), which only report a number, this one lets someone change it.

<!-- example:Minimal -->
```tsx
<Label htmlFor="volume">Volume</Label>
<Slider id="volume" defaultValue={60} />
```
<!-- /example -->

| Prop            | Type                       | Default |
| --------------- | -------------------------- | ------- |
| `value`         | `number`                   | —       |
| `defaultValue`  | `number`                   | `min`   |
| `onValueChange` | `(value: number) => void`  | —       |
| `onChange`      | `(value: number) => void`  | —       |
| `min`           | `number`                   | `0`     |
| `max`           | `number`                   | `100`   |
| `step`          | `number`                   | `1`     |
| `error`         | `boolean`                  | —       |
| `className`     | `string`                   | —       |
| `style`         | `CSSProperties`            | —       |
| `ref`           | `Ref<HTMLInputElement>`    | —       |
| …rest           | props of `<input>` minus `type`; `value` / `defaultValue` / `onChange` are re-typed above | — |

`onChange` is re-typed rather than removed: like `onValueChange` it hands you a `number`
instead of an event, both fire on every commit, and neither is passed to the input — which
is what lets `{...form.field<number>("volume")}` bind the slider. Everything else native
still works: `id`, `name`, `disabled`, `aria-*` and friends all reach the input, though not
`min`, `max`, `step` or `value`, which are pulled out of the rest and always come from the
props above. `aria-invalid` and `aria-describedby` are **merged** rather than overwritten:
the values the component derives win where it has them, and yours survive where it does not.
It renders no number, no label, and no ticks. See [Gotchas](#gotchas).

## Show the value

A bare range input is a silent control: the thumb's position is the only feedback, and it
is unreadable to anyone who needs the actual figure. `Slider` renders no number, so drive
it with `value` + `onValueChange` and print one yourself.

<!-- example:WithValueReadout -->
```tsx
<Label htmlFor="volume-readout">Volume</Label>
<Slider
  id="volume-readout"
  value={volume}
  onValueChange={setVolume}
  aria-valuetext={`${volume} percent`}
/>
<output htmlFor="volume-readout" className="text-body-2 tabular-nums text-fg-secondary">
  {volume}%
</output>
```
<!-- /example -->

`onValueChange` fires on every movement of the thumb, not once on release — React's
`onChange` on a range input is the native `input` event. If the handler does real work
(a network call, an expensive re-layout), debounce it; keep the readout itself
synchronous so the number never lags the thumb.

**Controlled or uncontrolled, decided once.** Pass `value` and you own the number — the
component never moves the thumb by itself, so if your handler ignores a change the
slider stays put. Omit `value` and it keeps its own state, seeded from `defaultValue`
(or `min` when you give neither), and `onValueChange` becomes a notification. The mode is
locked on the first render, so a `value` that starts out `undefined` leaves the slider
uncontrolled for its whole life.

## A scale that isn't a percentage

`min`, `max`, and `step` pass straight to the native input. `step` is the granularity of
both dragging and the arrow keys, so it doubles as the coarseness control.

<!-- example:CustomRange -->
```tsx
<Label htmlFor="thermostat">Thermostat</Label>
<Slider id="thermostat" min={-10} max={40} step={5} defaultValue={20} />
```
<!-- /example -->

Note what this costs you in the announcement: screen readers commonly read a range input
as a percentage of its travel, so a `-10`–`40` thermostat sitting at `20` can be spoken
as "60 percent". Supply `aria-valuetext` on any scale that isn't a plain percentage —
see [Accessibility](#accessibility).

## Fractional steps

<!-- example:FractionalStep -->
```tsx
<Label htmlFor="playback-rate">Playback speed</Label>
<Slider
  id="playback-rate"
  min={0.5}
  max={2}
  step={0.1}
  value={rate}
  onValueChange={(next) => setRate(Math.round(next * 10) / 10)}
  aria-valuetext={`${rate} times speed`}
/>
<output htmlFor="playback-rate" className="text-body-2 tabular-nums text-fg-secondary">
  {rate}×
</output>
```
<!-- /example -->

The component reads the input with `Number(event.target.value)` and passes the result
through untouched — no rounding, no snapping to `step`. Browsers compute stepped values
in binary floating point, so `step={0.1}` can hand your callback `0.30000000000000004`.
Quantise where you store it, as above, or format at the point of display; the component
will not do it for you.

## In a form

Inside a [Field](field.md), the slider picks up `aria-invalid` and `aria-describedby`
from the field's resolved error, the same as [Input](input.md) and
[Textarea](textarea.md). The label wiring is not automatic — set `htmlFor` on the
[Label](label.md) and a matching `id` on the slider yourself.

<!-- example:InField -->
```tsx
<Field error="Budgets over 5,000 need finance approval.">
  <Label htmlFor="monthly-budget">Monthly budget</Label>
  <Slider id="monthly-budget" min={0} max={10000} step={500} defaultValue={7500} />
  <FieldError />
</Field>
```
<!-- /example -->

Standalone, the `error` prop marks the control invalid on its own. There is no
[Field](field.md) to describe it, so point `aria-describedby` at your own message:

<!-- example:ErrorState -->
```tsx
<Label htmlFor="jpeg-quality">Export quality</Label>
<Slider id="jpeg-quality" error defaultValue={12} aria-describedby="jpeg-quality-hint" />
<p id="jpeg-quality-hint" className="text-body-3 text-fg-secondary">
  Below 20 the export will visibly band.
</p>
```
<!-- /example -->

`name` reaches the input through the rest spread, so a `Slider` inside a plain `<form>`
submits its value like any other field.

## Disabled

The native attribute does the work: it blocks pointer and keyboard interaction, and the
CSS halves the whole control's opacity and swaps the cursor. There is no separate
read-only mode — a disabled slider is also skipped by form submission.

<!-- example:Disabled -->
```tsx
<Label htmlFor="bitrate">Bitrate</Label>
<Slider id="bitrate" disabled defaultValue={45} />
```
<!-- /example -->

## Theme tokens

`Slider.css` (shipped in this package's `styles` import) paints everything; the `.tsx`
carries no Tailwind utilities at all. Every colour and corner reads a contract variable,
so overriding one re-tints every slider in the app at runtime, with no rebuild.

| Where                                  | Override             |
| -------------------------------------- | -------------------- |
| Filled part of the track, and the thumb | `--C-ACCENT`         |
| Unfilled part of the track              | `--C-SURFACE-2`      |
| Thumb ring                              | `--C-SURFACE-0`      |
| Focus ring                              | `--C-BORDER-FOCUS`   |
| Outline when invalid                    | `--C-STATUS-ERROR`   |
| Track and thumb corners                 | `--RADIUS-FULL`      |

The track is a single hard-stop `linear-gradient` on the input itself, cut at
`--slider-fill` — a component-internal custom property written inline on every render from
the current value, as `((value − min) / (max − min)) × 100` clamped to `0%`–`100%`. It is
not a theme token, and there is no point overriding it in a stylesheet; the component
rewrites it from the props on every render.

That one gradient is the whole track, in Firefox as much as in Chromium. Once
`appearance: none` is set — which `.slider` does, with the `-webkit-` prefix alongside it —
the engine's own track pseudo-element defaults to transparent and the input's `background`
shows through as the track; Firefox paints its native track only when `appearance: none` is
*absent*. So `Slider.css` needs no `::-webkit-slider-runnable-track` or `::-moz-range-track`
rule and ships neither, and you should not add one: an opaque `::-moz-range-track`
background paints a full-width bar *over* the accent fill.

Three measurements are **not** on the contract and are not themeable: the track is a flat
`0.5rem` tall, the thumb a flat `1.25rem` square with a `2px` ring, and the disabled state
a flat `0.5` opacity. None of them sit on the responsive `r`-scale, so a slider is exactly
the same size on mobile and desktop while the layout around it steps up at the 40rem
breakpoint.

The thumb's 2px ring is hard-wired to `--C-SURFACE-0`, the *base* surface — see
[Gotchas](#gotchas) before dropping a slider on a card. The focus ring needs no
backdrop-coloured gap: it lands flush on that ring, so it carries no surface guess of its
own.

## Gotchas

- **The thumb is the same 20 × 20px in both engines — because the stylesheet says so, not
  because defaults agree.** `::-moz-range-thumb` defaults to `content-box` (Tailwind
  Preflight's `*, ::before, ::after` reset does not reach UA pseudo-elements), which used
  to add the `2px` ring outside the `1.25rem` box and render a 24px thumb in Firefox
  against Chromium's 20px. `Slider.css` now sets `box-sizing: border-box` on the `-moz-`
  pseudo-element explicitly — measured at 20.00px in both engines — so if you restyle the
  thumb, keep that declaration.
- **The invalid outline survives focus.** `.slider:focus-visible` sets `outline: none` to
  suppress the browser default, and at identical specificity it used to delete the
  `[aria-invalid="true"]` outline along with it. A dedicated
  `.slider[aria-invalid="true"]:focus-visible` rule now restores the error outline at higher
  specificity, so tabbing onto an invalid slider keeps both the focus ring on the thumb and
  the error outline on the track.
- **The invalid state is an outline only.** The fill and thumb stay `--C-ACCENT` when
  `error` is set — unlike [RangeSlider](range-slider.md), which re-tints both to the error colour.
- **Your `value` and the value in your state can diverge silently.** The component hands
  `value` to the input as-is; the browser then applies HTML's sanitisation — clamping to
  `[min, max]` and rounding anything off the `step` grid to the nearest step. `value={37}`
  with `step={10}` renders the thumb at `40`. The fill follows the thumb, because
  `--slider-fill` is computed from the same sanitised number, but `onValueChange` is never
  fired to tell you the input moved, so *your* state stays at `37` until the user drags. Pass
  values that are in range and on the step grid.
- **`max <= min` empties the fill.** The percentage is guarded to `0` for a zero or
  negative range rather than dividing by zero, so the track reads as empty no matter what
  `value` is. The browser separately treats a `max` below `min` as `min`, pinning the
  thumb.
- **The thumb ring assumes the base surface.** The 2px thumb border is `--C-SURFACE-0`. On
  any other layer — a `--C-SURFACE-1` card, a tinted panel — that ring is a visible halo in
  the wrong colour. (The focus ring no longer adds a surface-coloured gap of its own; the
  border is the only place the guess lives.) Restyle it through `className`, or keep
  sliders on the base surface.
- **Your `style` wins over the fill.** The component writes `--slider-fill` first and
  spreads your `style` after it, so `style={{ "--slider-fill": "…" }}` overrides the
  computed fill and desynchronises it from the thumb.
- **Both CSS imports are required.** The `.slider` rules live in this package's `styles`
  entry and read `--C-*`/`--RADIUS-*` from `@batthewz/response-ui-css` — import the
  foundation first, then this package's `styles`. Without them you get an unstyled native
  range input.
- **Client component.** `Slider` is `"use client"` (it holds controlled/uncontrolled state
  and reads the [Field](field.md) context), so it needs a client boundary in an RSC tree —
  unlike [Button](button.md), it cannot render on the server.

## Accessibility

Because it is a real `<input type="range">`, the platform supplies `role="slider"`,
`aria-valuenow`, `aria-valuemin`, and `aria-valuemax`, plus arrow-key, Home/End, and
Page Up/Down handling — none of it reimplemented here, and none of it possible to break by
*forgetting* a prop. You can still break it deliberately: an `aria-valuenow` or
`aria-valuemin` of your own reaches the input through the rest spread and overrides the
platform's. The announced number is otherwise always in range: the browser clamps and
step-rounds the DOM value before assistive tech reads it, so there is no unclamped
`aria-valuenow` here of the kind [Meter](meter.md) exposes.

Two things you still have to supply.

- **The accessible name.** `Slider` generates none, and does not require one — a slider
  with no `aria-label`, no `aria-labelledby`, and no associated `<label>` compiles, renders,
  and announces as an unnamed slider. [Field](field.md) does not fix this; it wires the
  *error*, never the label. Give the slider an `id` and the [Label](label.md) a matching
  `htmlFor`, as every example above does, or pass `aria-label` directly.
- **The unit.** A raw slider is announced as a bare number or, commonly, as a percentage of
  its travel — which is simply wrong on a scale like `0.5`–`2` or `-10`–`40`. Pass
  `aria-valuetext` (it reaches the input through the rest spread) with the value *and* its
  unit: `"1.5 times speed"`, `"20 degrees Celsius"`. Keep it derived from the same number
  you render, so the spoken and visible values can't drift apart.

A visible readout is not a substitute for either: it is separate text with no programmatic
relationship to the control unless you create one.

## Related

[Meter](meter.md) · [ProgressRing](progress-ring.md) · [RangeSlider](range-slider.md) · [NumberInput](number-input.md) ·
[Switch](switch.md) · [Field](field.md) · [Label](label.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
