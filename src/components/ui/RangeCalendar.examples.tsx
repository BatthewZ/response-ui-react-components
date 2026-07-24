import { useState } from "react";

import { Stack } from "../layout/Stack";
import { Button } from "./Button";
import { type DateRange, RangeCalendar } from "./RangeCalendar";
import { Text } from "./Text";

/** The default: two months side by side, uncontrolled. The first click sets `start`, the
 *  second sets `end` — so `onValueChange` fires twice, and the first call has `end: null`. */
export function Minimal() {
  const [stay, setStay] = useState<DateRange>({ start: null, end: null });

  return (
    <Stack gap="r5">
      <RangeCalendar onValueChange={setStay} />
      <Text variant="body-2" color="secondary">
        {stay.start && stay.end
          ? `${stay.start.toLocaleDateString()} – ${stay.end.toLocaleDateString()}`
          : "Pick a check-in date, then a check-out date."}
      </Text>
    </Stack>
  );
}

/** One grid instead of two. Only in single-month mode does the header caption become a
 *  button that opens the month → year quick-jump. */
export function SingleMonth() {
  return <RangeCalendar numberOfMonths={1} defaultMonth={new Date(2026, 6, 1)} />;
}

/** `value` + `onValueChange` make it controlled. There is no built-in clear affordance —
 *  reset by writing `{ start: null, end: null }` yourself. */
export function Controlled() {
  const [stay, setStay] = useState<DateRange>({
    start: new Date(2026, 6, 6),
    end: new Date(2026, 6, 13),
  });

  return (
    <Stack gap="r5">
      <RangeCalendar numberOfMonths={1} value={stay} onValueChange={setStay} />
      <Button variant="secondary" onClick={() => setStay({ start: null, end: null })}>
        Clear dates
      </Button>
    </Stack>
  );
}

/** A preset button must move the *view* as well as the value: drive `month` +
 *  `onMonthChange` alongside `value`, or the new range lands off-screen. */
export function WithPresets() {
  const [stay, setStay] = useState<DateRange>({ start: null, end: null });
  const [month, setMonth] = useState(new Date(2026, 6, 1));

  return (
    <Stack gap="r5">
      <Button
        variant="secondary"
        onClick={() => {
          const start = new Date(2026, 11, 21);
          const end = new Date(2026, 11, 28);
          setStay({ start, end });
          setMonth(start);
        }}
      >
        Christmas week
      </Button>
      <RangeCalendar
        value={stay}
        onValueChange={setStay}
        month={month}
        onMonthChange={setMonth}
      />
    </Stack>
  );
}

/** `min` and `max` bound both endpoints. Days outside the window render `aria-disabled`
 *  and ignore clicks — a booking window opened for one quarter. */
export function BoundedWindow() {
  return (
    <RangeCalendar
      defaultMonth={new Date(2026, 6, 1)}
      min={new Date(2026, 6, 1)}
      max={new Date(2026, 8, 30)}
    />
  );
}

/** `isDateDisabled` blocks individual days from *being* an endpoint. It does not stop a
 *  committed range from spanning them — Fri → Mon still swallows the weekend. */
export function WeekdaysOnly() {
  return (
    <RangeCalendar
      defaultMonth={new Date(2026, 6, 1)}
      isDateDisabled={(date) => date.getDay() === 0 || date.getDay() === 6}
    />
  );
}

/** `locale` drives the month, weekday and per-day accessible names via `Intl`;
 *  `weekStartsOn` is a separate knob, because the locale does not imply it. */
export function Localized() {
  return <RangeCalendar locale="en-GB" weekStartsOn={1} defaultMonth={new Date(2026, 6, 1)} />;
}

/** `showToday` adds a footer button. In a range calendar it only *navigates* to today and
 *  focuses it — unlike `Calendar`, it never sets an endpoint. */
export function TodayShortcut() {
  return (
    <RangeCalendar numberOfMonths={1} defaultMonth={new Date(2026, 0, 1)} showToday todayLabel="Jump to today" />
  );
}
