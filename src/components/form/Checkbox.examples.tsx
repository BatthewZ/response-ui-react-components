import { useEffect, useRef, useState } from "react";

import { Checkbox } from "./Checkbox";
import { Field } from "./Field";
import { FieldError } from "./FieldError";

/** The 30-second usage: wrap the box and its text in one `<label>` so the whole row toggles. */
export function Minimal() {
  return (
    <label className="flex items-center gap-r2">
      <Checkbox defaultChecked />
      Email me about product updates
    </label>
  );
}

/** Drive the checked state yourself with `checked` + `onChange`. */
export function Controlled() {
  const [subscribed, setSubscribed] = useState(true);

  return (
    <label className="flex items-center gap-r2">
      <Checkbox
        checked={subscribed}
        onChange={(e) => setSubscribed(e.target.checked)}
      />
      Send me the weekly summary
    </label>
  );
}

/** Native `disabled` greys the control and blocks interaction — there is no custom disabled styling. */
export function Disabled() {
  return (
    <div className="flex flex-col gap-r2">
      <label className="flex items-center gap-r2">
        <Checkbox disabled />
        Currently unavailable
      </label>
      <label className="flex items-center gap-r2">
        <Checkbox disabled defaultChecked />
        Locked on by your plan
      </label>
    </div>
  );
}

/** In a `Field`, the box takes the field's `aria-invalid` and the rendered `FieldError`'s id
 *  with no props threaded through. */
export function InField() {
  return (
    <Field error="Accept the terms to continue.">
      <label className="flex items-center gap-r2">
        <Checkbox name="terms" />
        I accept the terms of service
      </label>
      <FieldError />
    </Field>
  );
}

/** `indeterminate` is a DOM property, not a prop — set it through the forwarded `ref`. */
export function Indeterminate() {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = true;
  }, []);

  return (
    <label className="flex items-center gap-r2">
      <Checkbox ref={ref} aria-label="Select all invoices" />
      Select all
    </label>
  );
}
