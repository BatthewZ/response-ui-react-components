import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Input } from "./Input";
import { Label } from "./Label";

/** A plain text input. Give it an accessible name with `aria-label` or a `Field` + `Label`. */
export function Minimal() {
  return <Input type="email" placeholder="you@company.com" aria-label="Work email" />;
}

/** Inside a `Field`, the input inherits `aria-invalid` and `aria-describedby` from the
 *  field's error — but wire `Label htmlFor` to the input `id` yourself; `Field` does not. */
export function InField() {
  return (
    <Field error="Enter a valid email address.">
      <Label htmlFor="work-email">Work email</Label>
      <Input id="work-email" type="email" defaultValue="ada@" />
      <FieldError />
    </Field>
  );
}

/** Standalone, `error` reddens the border and focus ring and sets `aria-invalid`. With no
 *  `Field` there is no `aria-describedby`, so pair it with your own visible message. */
export function ErrorState() {
  return <Input error defaultValue="not-an-email" aria-label="Work email" />;
}

/** `disabled` recesses the fill to `surface-3` and blocks typing. */
export function Disabled() {
  return <Input disabled defaultValue="locked@company.com" aria-label="Work email" />;
}

/** Every native `<input>` attribute — `type`, `min`, `max`, `autoComplete` — passes through. */
export function Types() {
  return (
    <>
      <Input
        type="password"
        placeholder="Password"
        aria-label="Password"
        autoComplete="current-password"
      />
      <Input type="number" min={1} max={99} placeholder="Quantity" aria-label="Quantity" />
      <Input type="search" placeholder="Search orders" aria-label="Search orders" />
    </>
  );
}
