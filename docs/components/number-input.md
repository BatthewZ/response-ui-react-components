# NumberInput

A numeric field with its own stepper buttons that hands your callback a `number | null`
instead of a string. Half-typed text like `-` or `1.` stays in an internal draft and is only
parsed, clamped against `min`/`max`, and rounded when you commit it, so a partial entry
never reaches your state as `NaN`.

<!-- example:Minimal -->
```tsx
<Label htmlFor="quantity">Quantity</Label>
<NumberInput id="quantity" defaultValue={1} min={1} max={99} />
```
<!-- /example -->

| Prop            | Type                                                                | Default                     |
| --------------- | ------------------------------------------------------------------- | --------------------------- |
| `value`         | `number \| null`                                                    | — (uncontrolled)            |
| `defaultValue`  | `number`                                                            | — (starts empty)            |
| `onValueChange` | `(v: number \| null) => void`                                       | —                           |
| `min`           | `number`                                                            | —                           |
| `max`           | `number`                                                            | —                           |
| `step`          | `number`                                                            | `1`                         |
| `precision`     | `number`                                                            | — (no rounding)             |
| `error`         | `boolean`                                                           | [Field](field.md) state, else `false` |
| `className`     | `string`                                                            | — (lands on the input)      |
| `ref`           | `Ref<HTMLInputElement>`                                             | —                           |
| …rest           | `<input>` props except `type`, `value`, `defaultValue`, `onChange`  | —                           |

Passing `value` (including `value={null}`) makes it controlled. `min`, `max`, `step` and
`precision` are consumed by the component and are **not** forwarded as HTML attributes; only
`min` and `max` surface at all, as `aria-valuemin` / `aria-valuemax`. See
[Gotchas](#gotchas).

## The draft, and when it commits

Typing only updates the draft string. Two things commit it — **blur** and **Enter** — and a
commit runs `parse → clamp → round`, writes the canonical text back into the box, and calls
`onValueChange`. That is why typing `1.` emits nothing at all, and why a value you typed can
be rewritten under you the moment you tab away: `99` in a field with `max={10}` becomes `10`.

The steppers also emit, but they do **not** commit the draft — they step from the last
committed value and overwrite whatever you had typed. See [Gotchas](#gotchas).

Clearing the field commits `null`, and so does any text `Number()` cannot read — `12abc`
blurs to an empty box and `onValueChange(null)`.

<!-- example:Controlled -->
```tsx
<Label htmlFor="controlled-quantity">Quantity</Label>
<NumberInput
  id="controlled-quantity"
  value={quantity}
  onValueChange={setQuantity}
  min={1}
  max={99}
/>
<p className="text-body-3 text-fg-secondary">
  {quantity === null ? "No quantity set" : `Ordering ${quantity} units`}
</p>
```
<!-- /example -->

The state behind that example is `const [quantity, setQuantity] = useState<number | null>(1)`.
Note the type: **`null` is a real value here**, not an absence, and a controlled field must
be able to hold it or the user cannot empty the box.

## Range and step

<!-- example:RangeAndStep -->
```tsx
<Label htmlFor="temperature">Target temperature (°C)</Label>
<NumberInput id="temperature" defaultValue={20} min={16} max={30} step={0.5} />
```
<!-- /example -->

`step` moves the value by a fixed amount from whatever is currently committed, then clamps.
From an *empty* field the base is `min ?? 0`, so with `min={16}` the first press of ▲ lands
on `16.5`, not `16` — while ▼ lands on `16`, because the decrement is clamped back up to the
floor.

## Decimals

<!-- example:Decimals -->
```tsx
<Label htmlFor="unit-price">Unit price (USD)</Label>
<NumberInput id="unit-price" defaultValue={19.99} min={0} step={0.01} precision={2} />
```
<!-- /example -->

`precision` is a **rounding quantum, not a display format.** It rounds through
`Number(n.toFixed(precision))`, so the result is a plain JavaScript number with trailing
zeros dropped: with `precision={2}`, `1.5` commits and displays as `1.5`, never `1.50`. If
you need a fixed-decimal display, format it yourself outside the field. `toFixed` also
rounds the binary double rather than the decimal you typed, so `1.005` at `precision={2}`
commits `1`.

Without `precision`, nothing quantises the arithmetic: stepping `0.1` by `0.2` commits and
displays `0.30000000000000004`.

## Width

The wrapper is a plain `div` and `className` lands on the *input*, so a width utility shrinks
the input while the stepper column stays pinned to the wrapper's right edge — the chevrons
detach from the box. Size the wrapper instead:

<!-- example:FixedWidth -->
```tsx
<div className="w-32">
  <Label htmlFor="seats">Seats</Label>
  <NumberInput id="seats" defaultValue={4} min={1} max={12} />
</div>
```
<!-- /example -->

## Error state

NumberInput renders an [Input](input.md), so everything that page says about error styling
and `aria-invalid` applies here unchanged — including inheritance from a surrounding
[Field](field.md).

<!-- example:InField -->
```tsx
<Field error="Orders above 500 units need a sales rep.">
  <Label htmlFor="bulk-quantity">Quantity</Label>
  <NumberInput id="bulk-quantity" defaultValue={750} min={1} />
  <FieldError />
</Field>
```
<!-- /example -->

<!-- example:ErrorState -->
```tsx
<Label htmlFor="discount">Discount %</Label>
<NumberInput
  id="discount"
  error
  defaultValue={150}
  min={0}
  aria-describedby="discount-hint"
/>
<p id="discount-hint" className="text-body-3 text-fg-secondary">
  Enter a value between 0 and 100.
</p>
```
<!-- /example -->

## Disabled

`disabled` reaches the input and both stepper buttons.

<!-- example:Disabled -->
```tsx
<Label htmlFor="locked-quantity">Quantity</Label>
<NumberInput id="locked-quantity" disabled defaultValue={3} />
```
<!-- /example -->

## Theme tokens

NumberInput has no `.css` file — every colour, radius and duration below comes from a
Tailwind utility that resolves to a contract variable, so overriding the variable re-tints
the field at runtime with the rest of the app.

**The stepper column, owned by this component:**

| Where                     | Utility                                  | Override                        |
| ------------------------- | ---------------------------------------- | ------------------------------- |
| Chevron ink               | `text-fg-secondary`                      | `--C-TEXT-SECONDARY`            |
| Hover / pressed wash      | `hover:bg-surface-2` `active:bg-surface-3` | `--C-SURFACE-2` `--C-SURFACE-3` |
| Button padding            | `px-r5`                                  | `--R-SIZE-5`                    |
| Room reserved on the input | `pr-r2`                                 | `--R-SIZE-2`                    |
| Wash transition           | `duration-fast`                          | `--DURATION-FAST`               |

**The field itself, inherited from the [Input](input.md) it renders:**

| Where               | Utility                                               | Override                          |
| ------------------- | ----------------------------------------------------- | --------------------------------- |
| Text                | `text-body-2` `text-fg-primary`                       | `--BodyText-2` `--C-TEXT-PRIMARY` |
| Placeholder         | `placeholder:text-fg-muted`                           | `--C-TEXT-MUTED`                  |
| Fill, border, corners | `bg-surface-0` `border-border-strong` `rounded-md`  | `--C-SURFACE-0` `--C-BORDER-STRONG` `--RADIUS-MD` |
| Disabled fill       | `disabled:bg-surface-3`                               | `--C-SURFACE-3`                   |
| Focus ring & border | `focus:ring-border-focus` `focus:border-border-focus` | `--C-BORDER-FOCUS`                |
| Error border & ring | `border-status-error` `focus:ring-status-error`       | `--C-STATUS-ERROR`                |
| Field padding       | `px-r4` `py-r5`                                       | `--R-SIZE-4` `--R-SIZE-5`         |

The two buttons round their outer corners with `rounded-tr-md` / `rounded-br-md`, which read
`--RADIUS-MD` like the box they sit in.

The reserved right padding is `--R-SIZE-2` (`1.25rem`, `2rem` at ≥40rem), while the stepper
column measures its 14px chevron plus `--R-SIZE-5` of padding on each side — 30px, and 38px
at the breakpoint. **The column is wider than the gap reserved for it at both sizes**, so the
tail of a long number renders under the chevrons. Keep the field wider than the digits you
expect, or pass a bigger right padding — `className="pr-10"` (2.5rem) clears the column at
both breakpoints.

## Gotchas

- **A stepper press throws away text you have typed.** Pressing ▲/▼ (or clicking a button)
  steps from the last *committed* value, and the buttons `preventDefault` on pointer-down so
  the input never blurs and never commits first. Type `99` in a field committed at `1`, click
  ▲, and you get `2` — the `99` is gone.
- **Controlled, but not enforced.** The visible text is internal state. If your handler
  rejects or transforms what it is given — `onValueChange={(v) => setValue(Math.min(v ?? 0, 5))}`
  with no `max` on the field — the box keeps showing the value you refused, and the
  reconciliation only re-syncs when the `value` prop *changes*. Measured: `value={5}` with a
  no-op handler, one press of ▲, and the field reads `6` while `aria-valuenow` stays `5`,
  permanently. Mirror your clamping into `min`/`max` so the component reaches the same answer.
- **`readOnly` does not stop the steppers.** It reaches the input and blocks typing, but the
  buttons and the arrow keys still commit new values. Use `disabled` if the value must not move.
- **`Number()` accepts more than decimals.** `0x1f` commits as `31` and `Infinity` commits as
  `Infinity` (and lands in `aria-valuenow`); surrounding whitespace is trimmed. `inputMode`
  only hints the mobile keyboard — set `min`/`max` if you need a bounded result.
- **The submitted value is the raw text.** With a `name`, this is a `type="text"` input, so a
  form posts whatever is in the box. Focus normally moves before submit and commits it, but a
  programmatic `form.submit()` — or reading `new FormData(form)` while the field is still
  focused — sends `99` from a field with `max={10}`, unclamped and unrounded.
- **`min` / `max` / `step` never reach the DOM.** They are destructured away, so there is no
  native constraint validation, no `:invalid`, and no browser stepping — only
  `aria-valuemin` / `aria-valuemax` and the component's own clamp.
- **`onValueChange` fires even when nothing changes.** At `max`, every further ▲ re-emits the
  same number. Compare before you mark a form dirty.
- **`className` styles the input, not the wrapper.** Width utilities in particular misplace the
  stepper column — see [Width](#width).
- **Client component.** It ships `"use client"` and holds state, so unlike a bare
  [Input](input.md) it can be imported directly into an RSC tree.

## Accessibility

The control is an `<input type="text" inputMode="decimal">` carrying `role="spinbutton"`. It
has **no name of its own** — give it an `aria-label`, or a [Label](label.md) whose `htmlFor`
matches the `id` you pass; neither [Field](field.md) nor the component wires that for you.

- **The stepper buttons are hidden from assistive tech.** Both are `tabIndex={-1}` and
  `aria-hidden="true"`, so the accessibility tree contains zero buttons and Tab never stops on
  them. The keyboard equivalent is ArrowUp / ArrowDown on the input itself, which the component
  handles and `preventDefault`s. Both buttons are `type="button"`, so neither submits a form.
- **Only three keys are handled.** Enter commits, ArrowUp and ArrowDown step. The rest of the
  WAI-ARIA spinbutton keyboard — PageUp, PageDown, Home, End — is not implemented, and the
  Enter key event is not prevented, so an enclosing form still submits implicitly on it.
- **`aria-valuenow` follows the committed value, not the text.** It is omitted entirely while
  the field is empty, and while you are typing it still reports the previous number (measured:
  the box reads `42`, `aria-valuenow` reads `5`) until blur or Enter commits.
- **`aria-valuemin` / `aria-valuemax` appear only if you pass `min` / `max`.** Without them a
  screen reader announces a spinbutton with no range.
- **The error state is colour-only** where it is visible: it sets `aria-invalid` and, inside a
  [Field](field.md), `aria-describedby` — but the visual cue is just the red border and ring.
  Render a [FieldError](field-error.md) so the reason is readable.

## Related

[Input](input.md) · [Slider](slider.md) · [Field](field.md) · [Label](label.md) ·
[FieldError](field-error.md) · `RangeSlider` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
