import { useState } from "react";

import { Button } from "../ui/Button";

import { DatePicker } from "./DatePicker";
import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";

/** A text field you can type into plus a calendar popover. It has no accessible name of
 *  its own, so pair it with a `Label`. */
export function Minimal() {
  return (
    <>
      <Label htmlFor="due-date">Due date</Label>
      <DatePicker id="due-date" placeholder="MM/DD/YYYY" />
    </>
  );
}

/** `name` renders a hidden `input` carrying `YYYY-MM-DD`, so a plain form posts a
 *  machine-readable date rather than the localized string on screen. */
export function InAForm() {
  return (
    <form action="/api/invoices" method="post">
      <Label htmlFor="invoice-due">Payment due</Label>
      <DatePicker id="invoice-due" name="dueDate" defaultValue={new Date(2026, 5, 30)} />
      <Button type="submit">Create invoice</Button>
    </form>
  );
}

/** Controlled: hold the committed date in state with
 *  `const [dueDate, setDueDate] = useState<Date | null>(null)`. Keep that instance stable —
 *  a fresh `new Date(...)` on every parent render resets whatever the user is mid-way
 *  through typing. */
export function Controlled() {
  const [dueDate, setDueDate] = useState<Date | null>(null);

  return (
    <>
      <Label htmlFor="controlled-due">Payment due</Label>
      <DatePicker id="controlled-due" value={dueDate} onValueChange={setDueDate} />
      <p className="text-body-3 text-fg-secondary">
        {dueDate === null ? "No due date set" : `Invoice due ${dueDate.toDateString()}`}
      </p>
    </>
  );
}

/** `min`/`max` grey out days in the calendar and clamp a typed date into range;
 *  `isDateDisabled` rejects individual days — here, weekends. */
export function BoundedRange() {
  return (
    <>
      <Label htmlFor="delivery-date">Delivery date</Label>
      <DatePicker
        id="delivery-date"
        min={new Date(2026, 0, 1)}
        max={new Date(2026, 11, 31)}
        isDateDisabled={(date) => date.getDay() === 0 || date.getDay() === 6}
      />
    </>
  );
}

/** `clearable` adds an X button — visible only while a date is committed — that resets the
 *  value to `null` and returns focus to the field. */
export function Clearable() {
  return (
    <>
      <Label htmlFor="expiry-date">Expiry date</Label>
      <DatePicker id="expiry-date" clearable defaultValue={new Date(2026, 8, 14)} />
    </>
  );
}

/** `locale` drives both the calendar and how typed input is read (here day-first);
 *  `formatOptions` is passed to `Intl.DateTimeFormat` for the display string. */
export function LocalizedFormat() {
  return (
    <>
      <Label htmlFor="uk-date">Start date</Label>
      <DatePicker
        id="uk-date"
        locale="en-GB"
        formatOptions={{ dateStyle: "medium" }}
        defaultValue={new Date(2026, 5, 13)}
      />
    </>
  );
}

/** Inside a `Field` the error reaches the control through the `Input` it renders:
 *  red border, `aria-invalid`, and `aria-describedby`, with no extra props. */
export function InField() {
  return (
    <Field error="Choose a date on or after today.">
      <Label htmlFor="renewal-date">Renewal date</Label>
      <DatePicker id="renewal-date" min={new Date(2026, 6, 25)} />
      <FieldError />
    </Field>
  );
}

/** Standalone, `error` reddens the border and focus ring and sets `aria-invalid`. Nothing
 *  describes the failure, so point `aria-describedby` at your own message. */
export function ErrorState() {
  return (
    <>
      <Label htmlFor="birth-date">Date of birth</Label>
      <DatePicker id="birth-date" error aria-describedby="birth-date-hint" />
      <p id="birth-date-hint" className="text-body-3 text-fg-secondary">
        Enter a date in MM/DD/YYYY format.
      </p>
    </>
  );
}

/** `disabled` recesses the field, blocks typing, and disables the calendar button — so the
 *  popover cannot be opened at all. */
export function Disabled() {
  return (
    <>
      <Label htmlFor="locked-date">Contract start</Label>
      <DatePicker id="locked-date" disabled defaultValue={new Date(2026, 2, 2)} />
    </>
  );
}
