import { useState } from "react";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { Slider } from "./Slider";

/** A native range input, pre-styled. It has no name of its own, so pair it with a `Label`. */
export function Minimal() {
  return (
    <>
      <Label htmlFor="volume">Volume</Label>
      <Slider id="volume" defaultValue={60} />
    </>
  );
}

/** Nothing renders the number for you. Drive the slider with `value` + `onValueChange`,
 *  show the readout yourself, and give the announced value a unit with `aria-valuetext`. */
export function WithValueReadout() {
  const [volume, setVolume] = useState(60);

  return (
    <>
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
    </>
  );
}

/** `min`, `max`, and `step` go straight to the native input — the scale need not be a
 *  percentage, and `step` sets both the drag granularity and the arrow-key increment. */
export function CustomRange() {
  return (
    <>
      <Label htmlFor="thermostat">Thermostat</Label>
      <Slider id="thermostat" min={-10} max={40} step={5} defaultValue={20} />
    </>
  );
}

/** A fractional `step` can hand your callback `0.30000000000000004`; the component does no
 *  rounding of its own, so quantise the value where you store it. */
export function FractionalStep() {
  const [rate, setRate] = useState(1);

  return (
    <>
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
    </>
  );
}

/** Inside a `Field` the slider inherits `aria-invalid` and `aria-describedby` from the
 *  field's error — the `Label`-to-control wiring is still yours. */
export function InField() {
  return (
    <Field error="Budgets over 5,000 need finance approval.">
      <Label htmlFor="monthly-budget">Monthly budget</Label>
      <Slider id="monthly-budget" min={0} max={10000} step={500} defaultValue={7500} />
      <FieldError />
    </Field>
  );
}

/** Standalone, `error` sets `aria-invalid` and rings the track in the error colour. Outside
 *  a `Field` there is no `aria-describedby`, so pair it with your own visible message. */
export function ErrorState() {
  return (
    <>
      <Label htmlFor="jpeg-quality">Export quality</Label>
      <Slider id="jpeg-quality" error defaultValue={12} aria-describedby="jpeg-quality-hint" />
      <p id="jpeg-quality-hint" className="text-body-3 text-fg-secondary">
        Below 20 the export will visibly band.
      </p>
    </>
  );
}

/** Native `disabled` blocks interaction, halves the opacity, and shows a not-allowed cursor. */
export function Disabled() {
  return (
    <>
      <Label htmlFor="bitrate">Bitrate</Label>
      <Slider id="bitrate" disabled defaultValue={45} />
    </>
  );
}
