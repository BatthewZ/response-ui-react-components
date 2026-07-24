import { useState } from "react";

import { Button } from "../ui/Button";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { Switch } from "./Switch";

/** The 30-second usage: a settings row whose `Label` names the switch via `htmlFor`/`id`. */
export function Minimal() {
  return (
    <div className="flex items-center justify-between gap-r5">
      <Label htmlFor="email-notifications">Email notifications</Label>
      <Switch id="email-notifications" defaultChecked />
    </div>
  );
}

/** Own the state with `checked` + `onCheckedChange` — the handler gets the next boolean, not an event. */
export function Controlled() {
  const [twoFactor, setTwoFactor] = useState(true);

  return (
    <div className="flex items-center justify-between gap-r5">
      <Label htmlFor="two-factor">Require two-factor authentication</Label>
      <Switch id="two-factor" checked={twoFactor} onCheckedChange={setTwoFactor} />
    </div>
  );
}

/** Two track sizes: `md` (2.75×1.5rem, the default) and `sm` (2.25×1.25rem). */
export function Sizes() {
  return (
    <div className="flex items-center gap-r4">
      <Switch aria-label="Autoplay previews" size="sm" defaultChecked />
      <Switch aria-label="Autoplay previews" size="md" defaultChecked />
    </div>
  );
}

/** `disabled` blocks the toggle and fades the whole control to 50% opacity. */
export function Disabled() {
  return (
    <div className="flex flex-col gap-r4">
      <div className="flex items-center justify-between gap-r5">
        <Label htmlFor="enforce-sso">Enforce SSO for all members</Label>
        <Switch id="enforce-sso" defaultChecked disabled />
      </div>
      <div className="flex items-center justify-between gap-r5">
        <Label htmlFor="audit-log-export">Audit log export</Label>
        <Switch id="audit-log-export" disabled />
      </div>
    </div>
  );
}

/** Inside a `Field`, the switch inherits `aria-invalid` and an `aria-describedby` pointing at the `FieldError`. */
export function InvalidInAField() {
  return (
    <Field error="Accept the data processing terms to continue.">
      <div className="flex items-center justify-between gap-r5">
        <Label htmlFor="accept-dpa">I accept the data processing terms</Label>
        <Switch id="accept-dpa" />
      </div>
      <FieldError />
    </Field>
  );
}

/** Give it a `name` and it renders a hidden input beside the button so the value reaches `FormData`. */
export function SubmittedWithAForm() {
  return (
    <form action="/api/preferences" method="post" className="flex flex-col gap-r4">
      <div className="flex items-center justify-between gap-r5">
        <Label htmlFor="weekly-digest">Weekly digest</Label>
        <Switch id="weekly-digest" name="weeklyDigest" value="yes" defaultChecked />
      </div>
      <Button type="submit">Save changes</Button>
    </form>
  );
}

/** `onClick` runs before the toggle — call `preventDefault()` there to veto the change. */
export function VetoingAToggle() {
  const [plan] = useState<"free" | "pro">("free");

  return (
    <div className="flex items-center justify-between gap-r5">
      <Label htmlFor="custom-domain">Serve on a custom domain</Label>
      <Switch
        id="custom-domain"
        onClick={(event) => {
          if (plan === "free") event.preventDefault();
        }}
      />
    </div>
  );
}
