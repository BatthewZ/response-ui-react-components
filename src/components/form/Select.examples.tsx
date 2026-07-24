import { useState } from "react";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { Select } from "./Select";

/** A native `<select>`; the choices are your own `<option>` children. Give it an accessible
 *  name with `aria-label` or a `Field` + `Label`. */
export function Minimal() {
  return (
    <Select aria-label="Billing country">
      <option value="us">United States</option>
      <option value="ca">Canada</option>
      <option value="gb">United Kingdom</option>
      <option value="au">Australia</option>
    </Select>
  );
}

/** A placeholder is an `<option value="">` as the select's first child plus `defaultValue=""`.
 *  With `required`, submitting while it is still selected fails native validation. */
export function PlaceholderOption() {
  return (
    <Select required defaultValue="" aria-label="Team role">
      <option value="" disabled>
        Select a role…
      </option>
      <option value="owner">Owner</option>
      <option value="admin">Admin</option>
      <option value="member">Member</option>
      <option value="billing">Billing contact</option>
    </Select>
  );
}

/** `<optgroup>` labels a block of choices and `disabled` greys one out — both are native
 *  `<select>` children, not props of this component. */
export function OptionGroups() {
  return (
    <Select aria-label="Deployment region" defaultValue="us-east-1">
      <optgroup label="North America">
        <option value="us-east-1">US East (N. Virginia)</option>
        <option value="us-west-2">US West (Oregon)</option>
      </optgroup>
      <optgroup label="Europe">
        <option value="eu-west-1">Europe (Ireland)</option>
        <option value="eu-west-2" disabled>
          Europe (London) — at capacity
        </option>
      </optgroup>
    </Select>
  );
}

/** Inside a `Field`, the select inherits `aria-invalid` and `aria-describedby` from the
 *  field's error — but wire `Label htmlFor` to the select `id` yourself; `Field` does not. */
export function InField() {
  return (
    <Field error="Pick the region your data will live in.">
      <Label htmlFor="region">Deployment region</Label>
      <Select id="region" defaultValue="">
        <option value="" disabled>
          Select a region…
        </option>
        <option value="us-east-1">US East (N. Virginia)</option>
        <option value="eu-west-1">Europe (Ireland)</option>
        <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
      </Select>
      <FieldError />
    </Field>
  );
}

/** Standalone, `error` reddens the border and focus ring and sets `aria-invalid`. With no
 *  `Field` there is no `aria-describedby`, so pair it with your own visible message. */
export function ErrorState() {
  return (
    <Select error defaultValue="" aria-label="Billing country">
      <option value="">Select a country…</option>
      <option value="us">United States</option>
      <option value="ca">Canada</option>
    </Select>
  );
}

/** `disabled` recesses the fill to `surface-3`, blocks the picker, and drops the value from
 *  form submission. */
export function Disabled() {
  return (
    <Select disabled defaultValue="pro" aria-label="Plan">
      <option value="free">Free</option>
      <option value="pro">Pro — $20/month</option>
      <option value="enterprise">Enterprise</option>
    </Select>
  );
}

/** `value` + `onChange` drive the selection from state; omit both and the browser keeps it. */
export function Controlled() {
  const [region, setRegion] = useState("us-east-1");

  return (
    <Select
      aria-label="Deployment region"
      value={region}
      onChange={(event) => setRegion(event.target.value)}
    >
      <option value="us-east-1">US East (N. Virginia)</option>
      <option value="eu-west-1">Europe (Ireland)</option>
      <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
    </Select>
  );
}
