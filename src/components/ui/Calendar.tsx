"use client";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { isSameDay } from "../../util/date";
import { isSameDateValue } from "../form/date-picker-internals";
import {
  CalendarBase,
  type CalendarDayRenderer,
  type CalendarLabels,
  type CalendarSlotClassNames,
  type Weekday,
} from "./CalendarBase";

type CalendarProps = {
  value?: Date | null;
  defaultValue?: Date;
  onValueChange?: (d: Date) => void;
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (m: Date) => void;
  numberOfMonths?: number;
  min?: Date;
  max?: Date;
  isDateDisabled?: (date: Date) => boolean;
  locale?: string;
  weekStartsOn?: Weekday;
  /** Render a footer with a "Today" button that selects today. */
  showToday?: boolean;
  todayLabel?: string;
  labels?: CalendarLabels;
  /**
   * Class overrides for the calendar internals. Calendar renders none of them
   * itself — the anatomy and the union are `CalendarBase`'s, and both are
   * forwarded rather than re-declared.
   */
  classNames?: CalendarSlotClassNames;
  /** Replace a day's content. See {@link CalendarDayRenderer}. */
  renderDay?: CalendarDayRenderer;
  /**
   * Not a Calendar prop — the change channel is `onValueChange`. Declared `never`
   * rather than only `Omit`ted because a JSX spread performs no excess-property
   * check, so `Omit` alone let `{...form.field("x")}` through to `CalendarBase`.
   */
  onChange?: never;
} & Omit<ComponentPropsWithRef<"div">, "onChange" | "value" | "defaultValue">;

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  {
    value,
    defaultValue,
    onValueChange,
    defaultMonth,
    onChange: _onChange,
    ...rest
  },
  ref,
) {
  const [selected, setSelected] = useControllableState<Date | null>({
    value,
    defaultValue: defaultValue ?? null,
    onChange: (next) => {
      if (next) onValueChange?.(next);
    },
    // The grid hands back a fresh `Date` for every pick, so `Object.is` reads a
    // re-selection of the already-selected day as a change and re-emits it.
    isEqual: isSameDateValue,
  });

  return (
    // `rest` is spread *first*: a JSX spread performs no excess-property check,
    // so a spread object carrying `onDaySelect`/`onTodayClick` would otherwise
    // replace the selection wiring this component exists to provide.
    <CalendarBase
      {...rest}
      ref={ref}
      defaultMonth={defaultMonth ?? value ?? defaultValue ?? undefined}
      focusAnchor={selected}
      getDayStatus={(day) => ({ selected: selected != null && isSameDay(day, selected) })}
      onDaySelect={(day) => setSelected(day)}
      onTodayClick={(today) => setSelected(today)}
    />
  );
});
