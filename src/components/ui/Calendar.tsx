import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useControllableState } from "../../hooks/use-controllable-state";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  getMonthLabel,
  getWeekdayNames,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
} from "../../util/date";
import { cn } from "../../util/style";
import { IconButton } from "./IconButton";

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type CalendarProps = {
  value?: Date | null;
  defaultValue?: Date;
  onValueChange?: (d: Date) => void;
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (m: Date) => void;
  min?: Date;
  max?: Date;
  locale?: string;
  weekStartsOn?: Weekday;
} & Omit<ComponentPropsWithRef<"div">, "onChange" | "value" | "defaultValue">;

/** True if `d` falls strictly outside the optional `[min, max]` range. */
function isOutOfRange(d: Date, min?: Date, max?: Date): boolean {
  if (min && isBefore(d, min)) return true;
  if (max && isAfter(d, max)) return true;
  return false;
}

/** A stable key for a day, used for React keys and DOM lookup. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  {
    value,
    defaultValue,
    onValueChange,
    month,
    defaultMonth,
    onMonthChange,
    min,
    max,
    locale = "en-US",
    weekStartsOn = 0,
    className,
    ...props
  },
  ref,
) {
  const [selected, setSelected] = useControllableState<Date | null>({
    value,
    defaultValue: defaultValue ?? null,
    onChange: (next) => {
      if (next) onValueChange?.(next);
    },
  });

  // Seed the displayed month from value ?? defaultMonth ?? today.
  const seedMonth = startOfMonth(value ?? defaultValue ?? defaultMonth ?? new Date());
  const [displayedMonth, setDisplayedMonth] = useControllableState<Date>({
    value: month ? startOfMonth(month) : undefined,
    defaultValue: seedMonth,
    onChange: onMonthChange,
  });

  const gridRef = useRef<HTMLDivElement>(null);
  // Set when a keyboard move should land DOM focus on a specific day's button
  // after the next render (whether that move crossed a month boundary or just
  // shifted within the grid). Consumed by the effect below.
  const pendingFocusRef = useRef<Date | null>(null);

  // The day that owns tabIndex=0: selected (if in view) else today (if in view)
  // else the first of the displayed month. Held in state so a roving move
  // re-renders and the tabIndex=0/-1 split stays in sync with DOM focus.
  const today = new Date();
  function computeInitialFocus(): Date {
    if (selected && isSameDay(startOfMonth(selected), displayedMonth)) return selected;
    if (isSameDay(startOfMonth(today), displayedMonth)) return today;
    return startOfMonth(displayedMonth);
  }
  const [focusDate, setFocusDate] = useState<Date>(computeInitialFocus);
  // Re-anchor the focus date if the selection or month changed it out from
  // under us (controlled props, programmatic month change via the nav buttons).
  if (!isSameDay(startOfMonth(focusDate), displayedMonth)) {
    setFocusDate(computeInitialFocus());
  }

  // After a roving move, land DOM focus on the target day's button.
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    const btn = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-day="${dayKey(pending)}"]`,
    );
    btn?.focus();
  });

  const weekdayNames = getWeekdayNames(locale, "short", weekStartsOn);
  const weeks = buildMonthGrid(displayedMonth, weekStartsOn);
  const monthLabel = getMonthLabel(displayedMonth, locale);

  function goToMonth(target: Date) {
    setDisplayedMonth(startOfMonth(target));
  }

  /** Move the roving focus to `target`, switching the displayed month if needed. */
  function moveFocusTo(target: Date) {
    setFocusDate(target);
    // Defer the actual DOM focus to the post-render effect: the target button
    // only gets tabIndex=0 after this state update commits, and when the move
    // crosses a month boundary the button doesn't exist until the new month
    // renders.
    pendingFocusRef.current = target;
    if (!isSameDay(startOfMonth(target), displayedMonth)) {
      goToMonth(target);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = focusDate;
    let target: Date | null = null;

    switch (e.key) {
      case "ArrowLeft":
        target = addDays(current, -1);
        break;
      case "ArrowRight":
        target = addDays(current, 1);
        break;
      case "ArrowUp":
        target = addDays(current, -7);
        break;
      case "ArrowDown":
        target = addDays(current, 7);
        break;
      case "Home": {
        const offset = (current.getDay() - weekStartsOn + 7) % 7;
        target = addDays(current, -offset);
        break;
      }
      case "End": {
        const offset = (current.getDay() - weekStartsOn + 7) % 7;
        target = addDays(current, 6 - offset);
        break;
      }
      case "PageUp":
        target = addMonths(current, -1);
        break;
      case "PageDown":
        target = addMonths(current, 1);
        break;
      default:
        return;
    }

    e.preventDefault();
    moveFocusTo(target);
  }

  function handleSelect(day: Date) {
    setSelected(day);
    setFocusDate(day);
    if (!isSameDay(startOfMonth(day), displayedMonth)) {
      goToMonth(day);
    }
  }

  return (
    <div ref={ref} className={cn("calendar", className)} {...props}>
      <div className="calendar-header">
        <IconButton
          type="button"
          aria-label="Previous month"
          onClick={() => goToMonth(addMonths(displayedMonth, -1))}
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </IconButton>
        <div className="calendar-label" aria-live="polite">
          {monthLabel}
        </div>
        <IconButton
          type="button"
          aria-label="Next month"
          onClick={() => goToMonth(addMonths(displayedMonth, 1))}
        >
          <ChevronRight aria-hidden="true" size={18} />
        </IconButton>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={monthLabel}
        className="calendar-grid"
        onKeyDown={handleKeyDown}
      >
        <div role="row" className="calendar-weekdays">
          {weekdayNames.map((name, i) => (
            <div
              // Weekday names are positional and may repeat across narrow locales.
              key={`${i}-${name}`}
              role="columnheader"
              aria-label={name}
              className="calendar-weekday"
            >
              {name}
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <div role="row" className="calendar-week" key={dayKey(week[0])}>
            {week.map((day) => {
              const outside = !isSameDay(startOfMonth(day), displayedMonth);
              const disabled = isOutOfRange(day, min, max);
              const isToday = isSameDay(day, today);
              const isSelected = selected != null && isSameDay(day, selected);
              const isFocusDay = isSameDay(day, focusDate);

              return (
                <div role="gridcell" className="calendar-cell" key={dayKey(day)}>
                  <button
                    type="button"
                    data-day={dayKey(day)}
                    className="calendar-day"
                    tabIndex={isFocusDay ? 0 : -1}
                    disabled={disabled}
                    aria-disabled={disabled || undefined}
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    data-today={isToday ? "" : undefined}
                    data-outside={outside ? "" : undefined}
                    onClick={() => handleSelect(day)}
                  >
                    {day.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});
