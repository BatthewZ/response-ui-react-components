import { useState } from "react";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { RangeSlider, type RangeSliderValue } from "./RangeSlider";

/** Two thumbs on one track. Name each one — the component renders no visible label. */
export function Minimal() {
  return (
    <RangeSlider defaultValue={[20, 80]} minLabel="Minimum price" maxLabel="Maximum price" />
  );
}

/** Nothing prints the numbers for you: drive the pair with `value` + `onValueChange`, and
 *  name the group with `role="group"` — the root is otherwise a plain `div`. */
export function WithReadout() {
  const [budget, setBudget] = useState<RangeSliderValue>([120, 380]);

  return (
    <>
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
    </>
  );
}

/** `minDistance` is the smallest gap the thumbs may hold. A drag that would close it stops
 *  at the wall — the other thumb is never pushed along. */
export function MinimumGap() {
  return (
    <>
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
    </>
  );
}

/** `min`, `max`, and `step` go straight to both inputs. Carry the unit in the thumb names —
 *  nothing you pass can reach the inputs' own `aria-valuetext`. */
export function CustomScale() {
  return (
    <>
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
    </>
  );
}

/** Inside a `Field` the fill and both thumbs take the error tint from the field's resolved
 *  error — nothing links the thumbs to the message, so point at it yourself. */
export function InField() {
  return (
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
  );
}

/** Standalone, `error` sets `aria-invalid` on the wrapper and repaints the rail fill and both
 *  thumbs in the error colour. */
export function ErrorState() {
  return (
    <>
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
    </>
  );
}

/** `disabled` reaches both inputs and halves the whole control's opacity. */
export function Disabled() {
  return (
    <>
      <Label id="archived-price-label">Archived price filter</Label>
      <RangeSlider
        role="group"
        aria-labelledby="archived-price-label"
        disabled
        defaultValue={[35, 65]}
        minLabel="Minimum price"
        maxLabel="Maximum price"
      />
    </>
  );
}
