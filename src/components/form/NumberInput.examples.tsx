import { useState } from "react";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { NumberInput } from "./NumberInput";

/** Uncontrolled. It has no accessible name of its own, so pair it with a `Label`. */
export function Minimal() {
  return (
    <>
      <Label htmlFor="quantity">Quantity</Label>
      <NumberInput id="quantity" defaultValue={1} min={1} max={99} />
    </>
  );
}

/** Controlled: `value` accepts `null` for "empty", and that is what `onValueChange`
 *  hands back when the field is cleared. */
export function Controlled() {
  const [quantity, setQuantity] = useState<number | null>(1);

  return (
    <>
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
    </>
  );
}

/** `min` and `max` clamp on every commit; `step` sets the arrow-key and button increment. */
export function RangeAndStep() {
  return (
    <>
      <Label htmlFor="temperature">Target temperature (°C)</Label>
      <NumberInput id="temperature" defaultValue={20} min={16} max={30} step={0.5} />
    </>
  );
}

/** `precision` rounds on commit — set it whenever `step` is fractional, or repeated
 *  steps accumulate binary-float noise. */
export function Decimals() {
  return (
    <>
      <Label htmlFor="unit-price">Unit price (USD)</Label>
      <NumberInput id="unit-price" defaultValue={19.99} min={0} step={0.01} precision={2} />
    </>
  );
}

/** Size the field from a wrapper, not from `className` — `className` lands on the input
 *  while the stepper column is positioned against the wrapper. */
export function FixedWidth() {
  return (
    <div className="w-32">
      <Label htmlFor="seats">Seats</Label>
      <NumberInput id="seats" defaultValue={4} min={1} max={12} />
    </div>
  );
}

/** Inside a `Field` the error reaches the control through the `Input` it renders:
 *  `aria-invalid`, `aria-describedby`, and the red border, with no extra props. */
export function InField() {
  return (
    <Field error="Orders above 500 units need a sales rep.">
      <Label htmlFor="bulk-quantity">Quantity</Label>
      <NumberInput id="bulk-quantity" defaultValue={750} min={1} />
      <FieldError />
    </Field>
  );
}

/** Standalone, `error` reddens the border and focus ring and sets `aria-invalid`. There is
 *  no `Field` to describe it, so point `aria-describedby` at your own message. */
export function ErrorState() {
  return (
    <>
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
    </>
  );
}

/** `disabled` recesses the fill, blocks typing, and disables both stepper buttons. */
export function Disabled() {
  return (
    <>
      <Label htmlFor="locked-quantity">Quantity</Label>
      <NumberInput id="locked-quantity" disabled defaultValue={3} />
    </>
  );
}
