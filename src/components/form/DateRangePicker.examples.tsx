import { useState } from "react";

import { Button } from "../ui/Button";
import { type DateRange } from "../ui/RangeCalendar";
import { Text } from "../ui/Text";

import { DateRangePicker } from "./DateRangePicker";
import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { FormActions } from "./FormActions";
import { Label } from "./Label";

/** Two typeable fields plus a calendar trigger. `name` is all a plain `<form>` post needs. */
export function Minimal() {
  return <DateRangePicker name="stay" startPlaceholder="Check in" endPlaceholder="Check out" />;
}

/** A refusal is not silent: the entry stays in the field that caused it, that field goes
 *  `aria-invalid`, and `rejectMessage` says why. Both endpoints share one message element, so
 *  a commit that refuses both writes both sentences into it. */
export function RejectMessage() {
  return (
    <DateRangePicker
      startPlaceholder="Check in"
      endPlaceholder="Check out"
      isDateDisabled={(day) => day.getDay() === 0}
      rejectMessage={(reason, text) =>
        reason === "unavailable"
          ? `No check-ins on ${text}.`
          : `${text} is not a date. Try MM/DD/YYYY.`
      }
    />
  );
}

/** Controlled: hold the range in `useState<DateRange>({ start: null, end: null })` and pass
 *  it back as `value`. `onValueChange` also fires mid-pick with `end` still `null`. */
export function Controlled() {
  const [stay, setStay] = useState<DateRange>({ start: null, end: null });

  return (
    <>
      <DateRangePicker
        value={stay}
        onValueChange={setStay}
        startPlaceholder="Check in"
        endPlaceholder="Check out"
      />
      <Text variant="body-3" color="secondary">
        {stay.start && stay.end
          ? `${stay.start.toLocaleDateString()} – ${stay.end.toLocaleDateString()}`
          : "Pick a check-in and a check-out date"}
      </Text>
    </>
  );
}

/** `min`/`max` bound the calendar and clamp typed dates; `isDateDisabled` blacks out days
 *  inside those bounds — here, weekends. */
export function Bounds() {
  return (
    <DateRangePicker
      name="workshop"
      min={new Date(2026, 5, 1)}
      max={new Date(2026, 7, 31)}
      isDateDisabled={(day) => day.getDay() === 0 || day.getDay() === 6}
      defaultMonth={new Date(2026, 5, 1)}
      startPlaceholder="First day"
      endPlaceholder="Last day"
    />
  );
}

/** `numberOfMonths` sets how many grids the popover shows; the default is 2. */
export function SingleMonth() {
  return <DateRangePicker numberOfMonths={1} startPlaceholder="From" endPlaceholder="To" />;
}

/** `locale` drives the calendar's names *and* how a typed date is read; `formatOptions` is
 *  the `Intl.DateTimeFormat` config the two text fields render with. */
export function LocalizedFormat() {
  return (
    <DateRangePicker
      locale="en-GB"
      formatOptions={{ dateStyle: "medium" }}
      defaultValue={{ start: new Date(2026, 5, 14), end: new Date(2026, 5, 21) }}
    />
  );
}

/** Inside a `Field`, both inputs inherit `aria-invalid` and the `FieldError` id from context
 *  with no `error` prop. `role="group"` + `aria-labelledby` gives the pair one name. */
export function InField() {
  return (
    <Field error="Choose a check-in and a check-out date">
      <Label id="stay-label">Travel dates</Label>
      <DateRangePicker
        role="group"
        aria-labelledby="stay-label"
        name="stay"
        startPlaceholder="Check in"
        endPlaceholder="Check out"
      />
      <FieldError />
    </Field>
  );
}

/** `name="stay"` emits two hidden inputs — `stay.start` and `stay.end` — carrying local
 *  `YYYY-MM-DD` strings, so the range posts with no client state involved. */
export function NativeForm() {
  return (
    <form action="/api/bookings" method="post">
      <DateRangePicker name="stay" startPlaceholder="Check in" endPlaceholder="Check out" />
      <FormActions>
        <Button type="submit">Request booking</Button>
      </FormActions>
    </form>
  );
}

/** `disabled` blocks both inputs and the calendar trigger — but the hidden `name` inputs
 *  are never disabled, so the range still posts. */
export function Disabled() {
  return (
    <DateRangePicker
      disabled
      name="stay"
      defaultValue={{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 18) }}
    />
  );
}
