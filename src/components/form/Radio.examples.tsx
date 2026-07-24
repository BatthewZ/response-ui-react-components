import { useState } from "react";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Radio } from "./Radio";

/** The 30-second usage: a shared `name` is what makes two radios one mutually-exclusive group. */
export function Minimal() {
  return (
    <div className="flex flex-col gap-r5">
      <label className="flex items-center gap-r5">
        <Radio name="billing-period" value="monthly" defaultChecked />
        Billed monthly
      </label>
      <label className="flex items-center gap-r5">
        <Radio name="billing-period" value="yearly" />
        Billed yearly — save 20%
      </label>
    </div>
  );
}

/** A `<fieldset>` + `<legend>` gives the whole set one accessible name — `Label` renders a
 *  `<label>`, which names a single control, so it cannot be the legend. */
export function Grouped() {
  return (
    <fieldset>
      <legend className="text-body-2 font-semibold text-fg-primary">Email digest</legend>
      <div className="mt-r5 flex flex-col gap-r5">
        <label className="flex items-center gap-r5">
          <Radio name="email-digest" value="realtime" defaultChecked />
          Real time
        </label>
        <label className="flex items-center gap-r5">
          <Radio name="email-digest" value="daily" />
          Daily summary
        </label>
        <label className="flex items-center gap-r5">
          <Radio name="email-digest" value="weekly" />
          Weekly summary
        </label>
      </div>
    </fieldset>
  );
}

/** Own the selection with one `checked` per group plus `onChange`; `role="radiogroup"` and
 *  `aria-label` name the set when there is no `<fieldset>` to hang a `<legend>` on. */
export function Controlled() {
  const [frequency, setFrequency] = useState("hourly");

  return (
    <div role="radiogroup" aria-label="Sync frequency" className="flex flex-col gap-r5">
      <label className="flex items-center gap-r5">
        <Radio
          name="sync-frequency"
          value="15m"
          checked={frequency === "15m"}
          onChange={(e) => setFrequency(e.target.value)}
        />
        Every 15 minutes
      </label>
      <label className="flex items-center gap-r5">
        <Radio
          name="sync-frequency"
          value="hourly"
          checked={frequency === "hourly"}
          onChange={(e) => setFrequency(e.target.value)}
        />
        Hourly
      </label>
      <label className="flex items-center gap-r5">
        <Radio
          name="sync-frequency"
          value="daily"
          checked={frequency === "daily"}
          onChange={(e) => setFrequency(e.target.value)}
        />
        Daily
      </label>
    </div>
  );
}

/** `disabled` is a native passthrough — it drops that one option out of the arrow-key cycle
 *  and the tab order, and Radio adds no `disabled:` styling of its own. */
export function Disabled() {
  return (
    <div className="flex flex-col gap-r5">
      <label className="flex items-center gap-r5">
        <Radio name="support-plan" value="standard" defaultChecked />
        Standard support
      </label>
      <label className="flex items-center gap-r5">
        <Radio name="support-plan" value="priority" disabled />
        Priority support — not on your plan
      </label>
    </div>
  );
}

/** To disable a whole group, put `disabled` on the `<fieldset>` — it cascades to every radio
 *  inside without touching each one. */
export function DisabledGroup() {
  return (
    <fieldset disabled>
      <legend className="text-body-2 font-semibold text-fg-primary">
        Visibility — locked by your workspace admin
      </legend>
      <div className="mt-r5 flex flex-col gap-r5">
        <label className="flex items-center gap-r5">
          <Radio name="visibility" value="private" defaultChecked />
          Private to your team
        </label>
        <label className="flex items-center gap-r5">
          <Radio name="visibility" value="public" />
          Anyone with the link
        </label>
      </div>
    </fieldset>
  );
}

/** Radio reads no `Field` context, so point the group at the message yourself: give
 *  `FieldError` an explicit `id` and describe the `<fieldset>` with it. */
export function InField() {
  return (
    <Field error="Choose a delivery speed.">
      <fieldset aria-describedby="delivery-speed-error">
        <legend className="text-body-2 font-semibold text-fg-primary">Delivery speed</legend>
        <div className="mt-r5 flex flex-col gap-r5">
          <label className="flex items-center gap-r5">
            <Radio name="delivery-speed" value="standard" required />
            Standard — 3–5 working days
          </label>
          <label className="flex items-center gap-r5">
            <Radio name="delivery-speed" value="express" required />
            Express — next working day
          </label>
        </div>
      </fieldset>
      <FieldError id="delivery-speed-error" />
    </Field>
  );
}
