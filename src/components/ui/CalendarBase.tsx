"use client";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  forwardRef,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { useMediaQuery } from "../../hooks/use-media-query";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  formatDate,
  getMonthNames,
  getWeekdayNames,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
} from "../../util/date";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import { IconButton } from "./IconButton";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Per-day visual state, supplied by the selection adapter (single vs range). */
export type DayStatus = {
  /** Day is the (or a) selected date — drives `aria-selected` and the solid fill. */
  selected?: boolean;
  /** Range endpoints (range mode only). */
  rangeStart?: boolean;
  rangeEnd?: boolean;
  /** Day lies within the committed range (range mode only). */
  inRange?: boolean;
  /** Day lies within the hover/keyboard preview of an in-progress range. */
  preview?: boolean;
};

export type CalendarBaseProps = {
  /** Controlled first displayed month. */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (m: Date) => void;
  /** Number of month grids to render side by side (default 1). */
  numberOfMonths?: number;
  min?: Date;
  max?: Date;
  isDateDisabled?: (date: Date) => boolean;
  locale?: string;
  weekStartsOn?: Weekday;
  /** Where roving focus lands initially when neither today nor it is overridden. */
  focusAnchor?: Date | null;
  /** Selection adapter — returns the visual state for a given day. */
  getDayStatus: (day: Date) => DayStatus;
  /** Called when an enabled day is activated (click / Enter / Space). */
  onDaySelect: (day: Date) => void;
  /** Called as the pointer/keyboard focus moves over days (for range preview). */
  onDayHover?: (day: Date | null) => void;
  /** Render a footer with a "Today" button. */
  showToday?: boolean;
  /** Label for the Today button (default "Today"). */
  todayLabel?: string;
  /** Selection side effect when Today is pressed (after navigating + focusing today). */
  onTodayClick?: (today: Date) => void;
} & Omit<ComponentPropsWithRef<"div">, "onChange">;

/** Months since year 0 — a total order over (year, month) for visibility checks. */
function monthOrdinal(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

/** A stable key for a day, used for React keys and DOM lookup. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Full localized date, e.g. "June 13, 2026" — the day button's accessible name. */
function dayLabel(d: Date, locale: string): string {
  return formatDate(d, locale, { year: "numeric", month: "long", day: "numeric" });
}

/** Status for a day that should render with no selection/range styling. */
const EMPTY_STATUS: DayStatus = {};

type PickerView = "days" | "months" | "years";

/** Number of years shown per page in the year picker. */
const YEARS_PER_PAGE = 12;

export const CalendarBase = forwardRef<HTMLDivElement, CalendarBaseProps>(function CalendarBase(
  {
    month,
    defaultMonth,
    onMonthChange,
    numberOfMonths = 1,
    min,
    max,
    isDateDisabled,
    locale = "en-US",
    weekStartsOn = 0,
    focusAnchor,
    getDayStatus,
    onDaySelect,
    onDayHover,
    showToday = false,
    todayLabel = "Today",
    onTodayClick,
    className,
    style,
    onPointerLeave,
    ...props
  },
  ref,
) {
  // Below the design system's 40rem breakpoint, collapse a multi-month calendar
  // to a single paged month. Stacked months overflow a phone-width popover and
  // force an awkward nested scrollbar; instead the ‹ › nav pages between months,
  // and the single-month layout turns the header label into a tappable month/year
  // quick-jump (it's an inert spacer in the multi-month layout).
  const isCompact = useMediaQuery("(width < 40rem)");
  const monthCount = isCompact ? 1 : Math.max(1, numberOfMonths);
  const today = new Date();

  function isDayDisabled(d: Date): boolean {
    if (min && isBefore(d, min)) return true;
    if (max && isAfter(d, max)) return true;
    return isDateDisabled?.(d) ?? false;
  }

  const seedMonth = startOfMonth(focusAnchor ?? defaultMonth ?? today);
  const [displayedMonth, setDisplayedMonth] = useControllableState<Date>({
    value: month ? startOfMonth(month) : undefined,
    defaultValue: seedMonth,
    onChange: onMonthChange,
  });

  // The window of visible months: [displayedMonth .. displayedMonth + monthCount - 1].
  const firstOrdinal = monthOrdinal(displayedMonth);
  const lastOrdinal = firstOrdinal + monthCount - 1;
  function isMonthVisible(d: Date): boolean {
    const o = monthOrdinal(d);
    return o >= firstOrdinal && o <= lastOrdinal;
  }

  const rootRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<Date | null>(null);
  const [view, setView] = useState<PickerView>("days");

  function computeInitialFocus(): Date {
    if (focusAnchor && isMonthVisible(focusAnchor)) return focusAnchor;
    if (isMonthVisible(today)) return today;
    return displayedMonth;
  }
  const [focusDate, setFocusDate] = useState<Date>(computeInitialFocus);
  // Re-anchor if focus drifted out of the visible window (controlled month/value change).
  if (!isMonthVisible(focusDate)) {
    setFocusDate(computeInitialFocus());
  }

  // After a roving move, land DOM focus on the target day's button.
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    const btn = rootRef.current?.querySelector<HTMLButtonElement>(
      `[data-day="${dayKey(pending)}"]`,
    );
    btn?.focus();
  });

  function goToMonth(target: Date) {
    setDisplayedMonth(startOfMonth(target));
  }

  /** Shift the window so `target` becomes visible, preferring the smallest move. */
  function revealMonth(target: Date) {
    const o = monthOrdinal(target);
    if (o < firstOrdinal) {
      goToMonth(target);
    } else if (o > lastOrdinal) {
      // Put target in the last visible slot.
      goToMonth(addMonths(target, -(monthCount - 1)));
    }
  }

  /** Move roving focus to `target`, paging the window if it isn't visible. */
  function moveFocusTo(target: Date) {
    setFocusDate(target);
    pendingFocusRef.current = target;
    onDayHover?.(target);
    if (!isMonthVisible(target)) revealMonth(target);
  }

  function handleDayKeyDown(e: KeyboardEvent<HTMLDivElement>) {
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
    if (isDayDisabled(day)) return;
    setFocusDate(day);
    if (!isMonthVisible(day)) revealMonth(day);
    onDaySelect(day);
  }

  function handleToday() {
    setView("days");
    setFocusDate(today);
    pendingFocusRef.current = today;
    if (!isMonthVisible(today)) goToMonth(today);
    onTodayClick?.(today);
  }

  // ---- Header label / navigation --------------------------------------------

  const monthNamesLong = getMonthNames(locale, "long");

  function captionFor(m: Date): string {
    return `${monthNamesLong[m.getMonth()]} ${m.getFullYear()}`;
  }

  /** Step the whole window by ±1 month (day view), ±1 year, or ±1 decade page. */
  function stepBackward() {
    if (view === "days") goToMonth(addMonths(displayedMonth, -1));
    else if (view === "months") goToMonth(addMonths(displayedMonth, -12));
    else goToMonth(addMonths(displayedMonth, -12 * YEARS_PER_PAGE));
  }
  function stepForward() {
    if (view === "days") goToMonth(addMonths(displayedMonth, 1));
    else if (view === "months") goToMonth(addMonths(displayedMonth, 12));
    else goToMonth(addMonths(displayedMonth, 12 * YEARS_PER_PAGE));
  }

  const decadeStart = displayedMonth.getFullYear() - (displayedMonth.getFullYear() % YEARS_PER_PAGE);

  let headerLabel: string;
  if (view === "years") headerLabel = `${decadeStart} – ${decadeStart + YEARS_PER_PAGE - 1}`;
  else if (view === "months") headerLabel = String(displayedMonth.getFullYear());
  else headerLabel = captionFor(displayedMonth);

  const prevLabel =
    view === "days" ? "Previous month" : view === "months" ? "Previous year" : "Previous years";
  const nextLabel =
    view === "days" ? "Next month" : view === "months" ? "Next year" : "Next years";

  // In the day view the caption opens the quick-nav picker — but only for a single
  // month; multi-month grids label themselves via their own per-month captions, so
  // the center header is left as an empty spacer to avoid a duplicate label.
  const captionInteractive = view !== "days" || monthCount === 1;

  function onCaptionClick() {
    if (view === "days") setView("months");
    else if (view === "months") setView("years");
  }

  // ---- Render ---------------------------------------------------------------

  function renderMonthsView() {
    const year = displayedMonth.getFullYear();
    return (
      <div className="calendar-picker-grid" role="grid" aria-label={String(year)}>
        {monthNamesLong.map((name, m) => {
          const disabled =
            (min && year * 12 + m < monthOrdinal(min)) ||
            (max && year * 12 + m > monthOrdinal(max)) ||
            false;
          const isCurrent = m === displayedMonth.getMonth();
          return (
            <button
              key={name}
              type="button"
              className="calendar-picker-cell"
              aria-disabled={disabled || undefined}
              aria-selected={isCurrent}
              onClick={() => {
                if (disabled) return;
                setDisplayedMonth(new Date(year, m, 1));
                setView("days");
              }}
            >
              {getMonthNames(locale, "short")[m]}
            </button>
          );
        })}
      </div>
    );
  }

  function renderYearsView() {
    const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => decadeStart + i);
    return (
      <div className="calendar-picker-grid" role="grid" aria-label={headerLabel}>
        {years.map((year) => {
          const disabled =
            (min && year < min.getFullYear()) || (max && year > max.getFullYear()) || false;
          const isCurrent = year === displayedMonth.getFullYear();
          return (
            <button
              key={year}
              type="button"
              className="calendar-picker-cell"
              aria-disabled={disabled || undefined}
              aria-selected={isCurrent}
              onClick={() => {
                if (disabled) return;
                setDisplayedMonth(new Date(year, displayedMonth.getMonth(), 1));
                setView("months");
              }}
            >
              {year}
            </button>
          );
        })}
      </div>
    );
  }

  function renderMonthGrid(monthDate: Date) {
    const weekdayNames = getWeekdayNames(locale, "short", weekStartsOn);
    const weeks = buildMonthGrid(monthDate, weekStartsOn);
    return (
      <div className="calendar-month" key={monthOrdinal(monthDate)}>
        {monthCount > 1 && (
          <div className="calendar-month-caption" aria-hidden="true">
            {captionFor(monthDate)}
          </div>
        )}
        <div
          role="grid"
          aria-label={captionFor(monthDate)}
          className="calendar-grid"
          onKeyDown={handleDayKeyDown}
        >
          <div role="row" className="calendar-weekdays">
            {weekdayNames.map((name, i) => (
              <div
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
                const outside = !isSameDay(startOfMonth(day), monthDate);
                const disabled = isDayDisabled(day);
                // Outside days (padding from an adjacent month) are contextual only:
                // they carry no selection/range/today state and never own the roving
                // tab stop. This prevents an endpoint or today from rendering twice when
                // the same date appears in-month in one grid and as padding in another
                // (the multi-month "three highlighted dates for a two-date range" bug).
                const isToday = !outside && isSameDay(day, today);
                const status = outside ? EMPTY_STATUS : getDayStatus(day);
                const isFocusDay = !outside && isSameDay(day, focusDate);
                const selected = status.selected || status.rangeStart || status.rangeEnd || false;

                return (
                  <div role="gridcell" className="calendar-cell" key={dayKey(day)}>
                    <button
                      type="button"
                      data-day={dayKey(day)}
                      className="calendar-day"
                      tabIndex={isFocusDay ? 0 : -1}
                      aria-disabled={disabled || undefined}
                      aria-label={dayLabel(day, locale)}
                      aria-selected={selected}
                      aria-current={isToday ? "date" : undefined}
                      data-today={isToday ? "" : undefined}
                      data-outside={outside ? "" : undefined}
                      data-range-start={status.rangeStart ? "" : undefined}
                      data-range-end={status.rangeEnd ? "" : undefined}
                      data-in-range={status.inRange ? "" : undefined}
                      data-preview={status.preview ? "" : undefined}
                      onClick={() => handleSelect(day)}
                      onPointerEnter={onDayHover ? () => onDayHover(day) : undefined}
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
  }

  const visibleMonths = Array.from({ length: monthCount }, (_, i) =>
    addMonths(displayedMonth, i),
  );

  return (
    <div
      ref={mergeRefs(ref, rootRef)}
      className={cn("calendar", className)}
      // Tells Calendar.css how many month grids are shown so it can size itself
      // to exactly that many on wide layouts. `max-width: 100%` then lets it
      // collapse to a single fluid column on narrow screens / mobile.
      style={{ "--calendar-months": monthCount, ...style } as CSSProperties}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        onDayHover?.(null);
      }}
      {...props}
    >
      <div className="calendar-header">
        <IconButton type="button" aria-label={prevLabel} onClick={stepBackward}>
          <ChevronLeft aria-hidden="true" size={18} />
        </IconButton>
        {captionInteractive ? (
          <button
            type="button"
            className="calendar-label calendar-label-button"
            aria-live="polite"
            onClick={onCaptionClick}
          >
            {headerLabel}
          </button>
        ) : (
          // Empty spacer keeps the prev/next buttons justified in multi-month day view.
          <div className="calendar-label" aria-hidden="true" />
        )}
        <IconButton type="button" aria-label={nextLabel} onClick={stepForward}>
          <ChevronRight aria-hidden="true" size={18} />
        </IconButton>
      </div>

      {view === "days" && <div className="calendar-months">{visibleMonths.map(renderMonthGrid)}</div>}
      {view === "months" && renderMonthsView()}
      {view === "years" && renderYearsView()}

      {showToday && view === "days" && (
        <div className="calendar-footer">
          <button type="button" className="calendar-today-button" onClick={handleToday}>
            {todayLabel}
          </button>
        </div>
      )}
    </div>
  );
});
