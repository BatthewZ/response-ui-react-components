"use client";
import { type ComponentPropsWithRef, forwardRef, useState } from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { addDays, isAfter, isBefore, isSameDay } from "../../util/date";
import { CalendarBase, type CalendarLabels, type Weekday } from "./CalendarBase";

/** A (possibly incomplete) selected date range. `end` is null while picking the second endpoint. */
export type DateRange = {
  start: Date | null;
  end: Date | null;
};

const EMPTY_RANGE: DateRange = { start: null, end: null };

type RangeCalendarProps = {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange) => void;
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (m: Date) => void;
  /** Number of month grids to render side by side (default 2). */
  numberOfMonths?: number;
  min?: Date;
  max?: Date;
  isDateDisabled?: (date: Date) => boolean;
  locale?: string;
  weekStartsOn?: Weekday;
  showToday?: boolean;
  todayLabel?: string;
  labels?: CalendarLabels;
  /**
   * Not a RangeCalendar prop — the change channel is `onValueChange`. Declared
   * `never` rather than only `Omit`ted because a JSX spread performs no
   * excess-property check, so `Omit` alone let `{...form.field("x")}` through to
   * `CalendarBase`.
   */
  onChange?: never;
} & Omit<ComponentPropsWithRef<"div">, "onChange" | "value" | "defaultValue">;

/** True if `day` lies within the inclusive `[a, b]` span (a/b unordered). */
function within(day: Date, a: Date, b: Date): boolean {
  const lo = isBefore(a, b) ? a : b;
  const hi = isBefore(a, b) ? b : a;
  return !isBefore(day, lo) && !isAfter(day, hi);
}

export const RangeCalendar = forwardRef<HTMLDivElement, RangeCalendarProps>(function RangeCalendar(
  {
    value,
    defaultValue,
    onValueChange,
    defaultMonth,
    numberOfMonths = 2,
    isDateDisabled,
    onChange: _onChange,
    ...rest
  },
  ref,
) {
  const [range, setRange] = useControllableState<DateRange>({
    value,
    defaultValue: defaultValue ?? EMPTY_RANGE,
    onChange: (next) => onValueChange?.(next),
    // No `isEqual`: measured, no reachable `setRange` call resolves to the range
    // already held. Picking always flips `end` between a Date and null, so every
    // commit is a real change — a comparator here would be inert, which the
    // hook's own contract warns against.
  });

  // The day the pointer/keyboard is hovering while the second endpoint is unset,
  // used to preview the in-progress range.
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const { start, end } = range;
  const picking = start != null && end == null;

  function getDayStatus(day: Date) {
    const isStart = start != null && isSameDay(day, start);
    const isEnd = end != null && isSameDay(day, end);

    let inRange = false;
    if (start != null && end != null) {
      inRange = isAfter(day, start) && isBefore(day, end);
    }

    let preview = false;
    if (picking && hoverDate != null && start != null) {
      preview = within(day, start, hoverDate) && !isStart;
    }

    return { rangeStart: isStart, rangeEnd: isEnd, inRange, preview };
  }

  function handleDaySelect(day: Date) {
    if (!picking) {
      // Begin a new range (no start yet, or a completed range to replace).
      setRange({ start: day, end: null });
      setHoverDate(day);
      return;
    }
    // Complete the range, ordering the endpoints.
    if (start != null && isBefore(day, start)) {
      setRange({ start: day, end: start });
    } else {
      setRange({ start, end: day });
    }
    setHoverDate(null);
  }

  /**
   * While the second endpoint is being picked, a candidate day is *also*
   * blocked when anything between it and `start` is blocked — otherwise a
   * committed range spans days the matcher refuses. `min`/`max` need no scan:
   * they are contiguous bounds, so they cannot block an interior day of a span
   * whose endpoints both pass.
   */
  function isDayBlocked(day: Date): boolean {
    if (isDateDisabled?.(day)) return true;
    if (!picking || start == null || isDateDisabled == null) return false;
    const lo = isBefore(day, start) ? day : start;
    const hi = isBefore(day, start) ? start : day;
    for (let d = addDays(lo, 1); isBefore(d, hi); d = addDays(d, 1)) {
      if (isDateDisabled(d)) return true;
    }
    return false;
  }

  return (
    // `rest` is spread *first*: a JSX spread performs no excess-property check,
    // so a spread object carrying `onDaySelect`/`onDayHover`/`onTodayClick`
    // would otherwise replace the range wiring this component exists to provide.
    <CalendarBase
      {...rest}
      ref={ref}
      numberOfMonths={numberOfMonths}
      isDateDisabled={isDayBlocked}
      defaultMonth={defaultMonth ?? start ?? end ?? undefined}
      focusAnchor={start ?? end ?? null}
      getDayStatus={getDayStatus}
      onDaySelect={handleDaySelect}
      onDayHover={picking ? setHoverDate : undefined}
      onTodayClick={handleDaySelect}
    />
  );
});
