import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Input } from "./Input";
import { Label } from "./Label";

/** Pass the message as children — it renders red, as a `role="alert"` paragraph. */
export function Minimal() {
  return <FieldError>Enter a valid email address.</FieldError>;
}

/** With no children inside a `Field`, it renders the field's error and takes the
 *  field's `errorId`, matching the input's `aria-describedby`. */
export function InsideField() {
  return (
    <Field error="Enter a valid email address.">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" defaultValue="ada@" />
      <FieldError />
    </Field>
  );
}

/** `children` is any `ReactNode`, so a message can carry a recovery link. */
export function RichContent() {
  return (
    <FieldError>
      That username is taken. <a href="/signin">Sign in instead?</a>
    </FieldError>
  );
}

/** Props spread after the defaults, so `role="status"` (polite) replaces the
 *  assertive `alert` — softer for validation that fires on every keystroke. */
export function Polite() {
  return <FieldError role="status">Checking availability…</FieldError>;
}
