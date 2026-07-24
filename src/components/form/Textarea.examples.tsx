import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { Textarea } from "./Textarea";

/** A multi-line text field. Give it an accessible name with `aria-label` or a `Field` + `Label`. */
export function Minimal() {
  return <Textarea placeholder="Share your feedback…" aria-label="Feedback" />;
}

/** Inside a `Field`, the textarea inherits `aria-invalid` and `aria-describedby` from the
 *  field's error — but wire `Label htmlFor` to the textarea `id` yourself; `Field` does not. */
export function InField() {
  return (
    <Field error="Tell us a little about yourself.">
      <Label htmlFor="bio">Bio</Label>
      <Textarea id="bio" rows={4} placeholder="A sentence or two…" />
      <FieldError />
    </Field>
  );
}

/** Standalone, `error` reddens the border and focus ring and sets `aria-invalid`. With no
 *  `Field` there is no `aria-describedby`, so pair it with your own visible message. */
export function ErrorState() {
  return <Textarea error defaultValue="Too short." aria-label="Bio" />;
}

/** `disabled` recesses the fill to `surface-3` and blocks typing. */
export function Disabled() {
  return (
    <Textarea disabled defaultValue="Comments are closed for this thread." aria-label="Comment" />
  );
}

/** Every native `<textarea>` attribute passes through — `rows` sets the starting height and
 *  `maxLength` caps input. The box is always at least ~6.25rem tall and users can drag it
 *  taller (`resize-y`). */
export function Sizing() {
  return (
    <Textarea rows={8} maxLength={500} placeholder="Up to 500 characters…" aria-label="Description" />
  );
}
