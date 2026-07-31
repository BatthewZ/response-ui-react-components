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
| `onChange`      | `(v: number \| null) => void`                                       | —                           |
| `min`           | `number`                                                            | —                           |
| `max`           | `number`                                                            | —                           |
| `step`          | `number`                                                            | `1`                         |
| `precision`     | `number`                                                            | — (no rounding)             |
| `error`         | `boolean`                                                           | [Field](field.md) state, else `false` |
| `className`     | `string`                                                            | — (lands on the input)      |
| `classNames`    | `{ chevron?: string }` — see [Slots](#slots)                        | —                           |
| `ref`           | `Ref<HTMLInputElement>`                                             | —                           |
| …rest           | `<input>` props except `type`, `value`, `defaultValue`; `onChange` is re-typed above | —           |

Passing `value` (including `value={null}`) makes it controlled. `min`, `max`, `step` and
`precision` are consumed by the component and are **not** forwarded as HTML attributes; only
`min` and `max` surface at all, as `aria-valuemin` / `aria-valuemax`. See
[Gotchas](#gotchas).

`onChange` is re-typed as `(v: number | null) => void` — the committed number, the same
payload as `onValueChange`, not a `ChangeEvent` — and is destructured out before the spread,
so `{...form.field<number | null>("qty")}` writes a number into the store rather than
concatenating the input's raw text onto it. Note the type argument: this control emits `null`
when the field is cleared, so `field<number>()` is the wrong declaration.

## The draft, and when it commits

Typing only updates the draft string. **Blur** and **Enter** commit it, and a
commit runs `parse → clamp → round`, writes the canonical text back into the box, and calls
`onValueChange`. That is why typing `1.` emits nothing at all, and why a value you typed can
be rewritten under you the moment you tab away: `99` in a field with `max={10}` becomes `10`.

The steppers commit too: a press (or ArrowUp/ArrowDown) parses the text in the box —
committed or not — steps it, clamps, and writes the canonical result back. A commit that
changes nothing is silent: at `max`, further presses of ▲ emit no `onValueChange` at all.

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

`step` moves the value by a fixed amount from the text currently in the box — committed or
not — then clamps. From an *empty* field the base is `0` and the clamp carries the result to
the bound, so with `min={16}` the first press of either ▲ or ▼ lands on `16` itself, as a
native spinner does.

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

## Slots

`className` addresses the `<input>` — the element the ref and every rest prop also address.
`classNames` addresses the stepper buttons, which nothing else reaches. Class strings only,
and the keys are typed, so a misspelled one is a compile error rather than a prop that does
nothing.

| Slot      | Element                | What it addresses                                     |
| --------- | ---------------------- | ----------------------------------------------------- |
| `chevron` | both stepper `button`s | the increment **and** decrement buttons — one control in two directions, so the key names the pair |

```tsx
<NumberInput aria-label="Quantity" classNames={{ chevron: "text-fg-primary" }} />
```

**Neither wrapper takes a class from the call site, deliberately.** The outer box carries only
`relative` plus the reserved stepper width the input's right padding is measured from, and the
stepper column carries only the geometry that pins the pair to the field's right edge; change
either and the chevrons detach or a long value runs under them. Width belongs on the wrapper
you supply — see [Width](#width).

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
| Room reserved on the input | `px-r5` twice, plus the 14px chevron    | `--R-SIZE-5`                    |
| Wash transition           | `duration-fast`                          | `--DURATION-FAST`               |

The room reserved on the input is not an eyeballed spacing step: the component publishes
`--numberinput-stepper` on its wrapper as `calc(14px + 2 * var(--R-SIZE-5))` — the chevron plus
the button's own padding — and the field's `padding-right` reads it, so a long value can never
render underneath the chevrons.

**The field itself, inherited from the [Input](input.md) it renders:**

| Where               | Utility                                               | Override                          |
| ------------------- | ----------------------------------------------------- | --------------------------------- |
| Text                | `text-body-2` `text-fg-primary`                       | `--BodyText-2` `--C-TEXT-PRIMARY` |
| Placeholder         | `placeholder:text-fg-muted`                           | `--C-TEXT-MUTED`                  |
| Fill, border, corners | `bg-surface-0` `border-border-strong` `rounded-md`  | `--C-SURFACE-0` `--C-BORDER-STRONG` `--RADIUS-MD` |
| Disabled fill       | `disabled:bg-surface-3`                               | `--C-SURFACE-3`                   |
| Focus ring & border | `focus:ring-border-focus` `focus:border-border-focus` | `--C-BORDER-FOCUS` |
| Error border & ring | `border-status-error` `focus:ring-status-error` | `--C-STATUS-ERROR`              |
| Field padding       | `px-r4` `py-r5`                                       | `--R-SIZE-4` `--R-SIZE-5`         |

The two buttons round their outer corners with `rounded-tr-md` / `rounded-br-md`, which read
`--RADIUS-MD` like the box they sit in.

## Gotchas

- **A stepper press commits.** Pressing ▲/▼ (or clicking a button) parses the text in the
  box — even text you have not committed — steps it, clamps, and writes the result back.
  Unreadable text seeds the step at `0` and the clamp takes it from there. The buttons
  `preventDefault` on pointer-down, so the input never blurs first; the step itself is the
  commit.
- **A rejected value snaps back on commit.** The visible text is internal state, but every
  commit re-derives it from whichever value is then effective — even when the `value` prop
  itself never changed. So a controlled handler that refuses a commit sees the box snap
  back to the value it kept, with `aria-valuenow` in agreement. Still, mirror your clamping
  into `min`/`max` so the component reaches the same answer in the first place.
- **`readOnly` stops every route in.** Typing, the steppers, the arrow keys and the
  commit-on-blur are all inert, and the field reports `aria-readonly="true"`. Use `disabled`
  instead when the control should also leave the tab order.
- **Parsing is strict decimal.** Only an optionally signed decimal — optional fraction,
  optional exponent (`1e3` works) — is read; `0x1f`, `Infinity` and `12abc` all commit as
  `null` and blur to an empty box. Surrounding whitespace is trimmed. `inputMode` only hints
  the mobile keyboard — set `min`/`max` if you need a bounded result.
- **The submitted value is the raw text.** With a `name`, this is a `type="text"` input, so a
  form posts whatever is in the box. Focus normally moves before submit and commits it, but a
  programmatic `form.submit()` — or reading `new FormData(form)` while the field is still
  focused — sends `99` from a field with `max={10}`, unclamped and unrounded.
- **`min` / `max` / `step` never reach the DOM.** They are destructured away, so there is no
  native constraint validation, no `:invalid`, and no browser stepping — only
  `aria-valuemin` / `aria-valuemax` and the component's own clamp.
- **`className` styles the input, not the wrapper.** Width utilities in particular misplace the
  stepper column — see [Width](#width).
- **Client Component, self-declared.** It ships `"use client"` and holds state; importing
  it straight from a Server Component works — the same is true of the [Input](input.md) it
  renders.

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
[FieldError](field-error.md) · [RangeSlider](range-slider.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
