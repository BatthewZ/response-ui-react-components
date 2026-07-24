import { type CSSProperties, useState } from "react";

import { Button } from "./Button";
import { Calendar } from "./Calendar";

/** The grid holds no selection you can read — keep the chosen date in state and feed it back. */
export function Minimal() {
  const [dueDate, setDueDate] = useState<Date | null>(null);

  return <Calendar value={dueDate} onValueChange={setDueDate} />;
}

/** `min` and `max` are inclusive and compared by calendar day, so the time of day on a
 *  bound is ignored — a `min` of "today at 23:59" still leaves today selectable. */
export function BookingWindow() {
  return (
    <Calendar
      defaultMonth={new Date(2026, 5, 1)}
      min={new Date(2026, 5, 8)}
      max={new Date(2026, 5, 26)}
    />
  );
}

/** `isDateDisabled` composes with `min`/`max` — a day is disabled if either says so. */
export function BlackoutDays() {
  return (
    <Calendar
      defaultMonth={new Date(2026, 5, 1)}
      min={new Date(2026, 5, 1)}
      isDateDisabled={(date) => date.getDay() === 0 || date.getDay() === 6}
    />
  );
}

/** Two grids side by side on desktop; below 40rem this collapses to one paged month. */
export function TwoMonths() {
  return <Calendar defaultMonth={new Date(2026, 5, 1)} numberOfMonths={2} />;
}

/** `locale` names the weekdays, months and day buttons; `weekStartsOn` is a separate knob. */
export function Localized() {
  return <Calendar defaultMonth={new Date(2026, 5, 1)} locale="en-GB" weekStartsOn={1} />;
}

/** `showToday` adds a footer button that navigates to today **and** selects it. */
export function TodayButton() {
  const [visitDate, setVisitDate] = useState<Date | null>(null);

  return (
    <Calendar
      value={visitDate}
      onValueChange={setVisitDate}
      showToday
      todayLabel="Jump to today"
    />
  );
}

/** Own the displayed month whenever something outside the grid has to move it. */
export function ControlledMonth() {
  const [month, setMonth] = useState(new Date(2026, 5, 1));

  return (
    <>
      <Button variant="secondary" type="button" onClick={() => setMonth(new Date(2026, 11, 1))}>
        Jump to December
      </Button>
      <Calendar month={month} onMonthChange={setMonth} />
    </>
  );
}

/** Every measurement derives from one local variable, so resizing the cells resizes the
 *  whole calendar. Set it inline and the class-level default is overridden. */
export function LargerDayCells() {
  return (
    <Calendar
      defaultMonth={new Date(2026, 5, 1)}
      style={{ "--calendar-day-size": "2.75rem" } as CSSProperties}
    />
  );
}
