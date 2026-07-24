import { useState } from "react";

import { Button } from "../ui/Button";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { OTPInput } from "./OTPInput";

/** Six numeric boxes with paste, auto-advance and backspace already wired. `onComplete`
 *  fires once, the moment the last box fills. */
export function Minimal() {
  return (
    <OTPInput
      aria-label="Verification code"
      onComplete={(code) => {
        void fetch("/api/verify-code", { method: "POST", body: code });
      }}
    />
  );
}

/** `length` sets the box count. It also defines "complete" — `onComplete` waits for every
 *  box, so a 4-box code fires two keystrokes earlier than the 6-box default. */
export function CodeLength() {
  return <OTPInput length={4} aria-label="Verification code" />;
}

/** `mode="alphanumeric"` widens the filter from `/\d/` to `/[a-zA-Z0-9]/` and switches the
 *  boxes to `inputMode="text"`. Case is preserved — the value is not upper-cased for you. */
export function Alphanumeric() {
  return <OTPInput length={8} mode="alphanumeric" aria-label="Backup code" />;
}

/** The group is a `<div role="group">`, which `htmlFor` cannot target. Give the `Label` an
 *  `id` and point `aria-labelledby` at it — that name wins over the built-in `aria-label`. */
export function WithVisibleLabel() {
  return (
    <>
      <Label id="signin-code-label">Verification code</Label>
      <OTPInput aria-labelledby="signin-code-label" />
    </>
  );
}

/** Controlled by `value` + `onValueChange`. Empty slots before a filled one serialise as
 *  spaces, so count filled boxes with the spaces stripped rather than reading `.length`. */
export function Controlled() {
  const [code, setCode] = useState("");

  return (
    <>
      <OTPInput aria-label="Verification code" value={code} onValueChange={setCode} />
      <Button disabled={code.replace(/ /g, "").length < 6}>Verify</Button>
    </>
  );
}

/** Inside a `Field`, every box inherits `aria-invalid` and the `FieldError` id from context.
 *  The `Label` still has to be wired by `id` + `aria-labelledby`; `Field` does not do it. */
export function InField() {
  return (
    <Field error="That code has expired. Request a new one.">
      <Label id="expired-code-label">Verification code</Label>
      <OTPInput aria-labelledby="expired-code-label" />
      <FieldError />
    </Field>
  );
}

/** Standalone, `error` reddens every border and sets `aria-invalid` on each box. There is no
 *  `Field` to supply a description, so `aria-describedby` — which lands on the group, not the
 *  boxes — has to point at your own message. */
export function ErrorState() {
  return (
    <>
      <OTPInput
        aria-label="Verification code"
        error
        defaultValue="482913"
        aria-describedby="wrong-code-message"
      />
      <p id="wrong-code-message" className="text-body-3 text-status-error">
        That code is not correct. You have 2 attempts left.
      </p>
    </>
  );
}

/** `disabled` goes to every box, recessing the fill to `surface-3`. Use it while a submitted
 *  code is being checked, so the digits stay readable instead of unmounting. */
export function Disabled() {
  return <OTPInput aria-label="Verification code" disabled defaultValue="482913" />;
}
