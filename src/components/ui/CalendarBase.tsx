"use client";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
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
  startOfDay,
  startOfMonth,
} from "../../util/date";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";
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

/**
 * Every string the calendar speaks that is not derived from `locale`. Supplied
 * as one object so a translated calendar needs a single prop, and so the
 * pickers can forward their own overrides straight through.
 */
export type CalendarLabels = {
  previousMonth?: string;
  nextMonth?: string;
  previousYear?: string;
  nextYear?: string;
  previousYears?: string;
  nextYears?: string;
  /** Appended to a day's name when it lies inside the committed range. */
  inRange?: string;
  /** Appended to a day's name when it lies inside the in-progress preview. */
  previewRange?: string;
};

export const DEFAULT_CALENDAR_LABELS: Required<CalendarLabels> = {
  previousMonth: "Previous month",
  nextMonth: "Next month",
  previousYear: "Previous year",
  nextYear: "Next year",
  previousYears: "Previous years",
  nextYears: "Next years",
  inRange: "in selected range",
  previewRange: "in previewed range",
};

/**
 * Class overrides for the internals `CalendarBase` renders. `className` is the
 * root, so there is no `root` key.
 *
 * Exported, and aliased rather than re-spelled by `Calendar` and `RangeCalendar`:
 * neither renders any of this markup, both forward `classNames` straight to
 * `CalendarBase`, so one union written at the component that owns the anatomy is
 * the single source of truth. Re-spelling it would fork it.
 *
 * `DatePicker` and `DateRangePicker` do **not** alias it. They pass an explicit
 * prop list to `Calendar`/`RangeCalendar` — no `classNames`, no `renderDay` — and
 * declare their own small unions for their own chrome, so the calendar inside
 * their popover has no slot route from the picker.
 *
 * `pickerCell` and `day` land on elements the component also finds by selector
 * to drive focus, so both merges append to the base class and never replace it.
 */
export type CalendarSlotClassNames = SlotClassNames<
  | "header"
  | "labelButton"
  | "months"
  | "footer"
  | "todayButton"
  | "pickerGrid"
  | "pickerCell"
  | "month"
  | "caption"
  | "grid"
  | "weekdays"
  | "weekday"
  | "row"
  | "cell"
  | "day"
>;

/** What `renderDay` is handed for one day cell. */
export type CalendarDayRenderArgs = {
  date: Date;
  /** Selection state from the adapter — empty for an outside day. */
  status: DayStatus;
  /** The day belongs to an adjacent month and renders as padding. */
  outside: boolean;
  today: boolean;
  disabled: boolean;
  /** `status.selected`, `rangeStart` or `rangeEnd` — what paints the solid fill. */
  selected: boolean;
};

/**
 * Content for one day, inside the day button.
 *
 * The 42 cells a month grid renders are loop-generated, so no slot key can name
 * one of them — and what a consumer wants there ("a dot on a booked day") is
 * different *content*, not a different class. This renders the button's children
 * only: the button itself, its class, its `data-*` state and its roving tab stop
 * stay the component's, because focus management finds it by selector.
 */
export type CalendarDayRenderer = (args: CalendarDayRenderArgs) => ReactNode;

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
  /** Overrides for the calendar's own strings. See {@link DEFAULT_CALENDAR_LABELS}. */
  labels?: CalendarLabels;
  /** Move DOM focus onto the roving day when the calendar mounts. */
  autoFocus?: boolean;
  /** Selection side effect when Today is pressed (after navigating + focusing today). */
  onTodayClick?: (today: Date) => void;
  /** Class overrides for the internals. See {@link CalendarSlotClassNames}. */
  classNames?: CalendarSlotClassNames;
  /** Replace a day's content. See {@link CalendarDayRenderer}. */
  renderDay?: CalendarDayRenderer;
  /**
   * Not a calendar prop — the selection channel is `onDaySelect`.
   *
   * Declared `never` rather than only `Omit`ted because a JSX spread performs no
   * excess-property check: `Omit` alone let `{...form.field("x")}` land a handler
   * on the root `<div>`, where it never fires (React dispatches `onChange` only
   * for a descendant form control, and the calendar renders none). Now that
   * spread is a compile error, and the destructure below keeps the key off the
   * element.
   */
  onChange?: never;
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

/** Used only when nothing styles `.calendar-picker-grid`. See {@link quickNavColumns}. */
const QUICK_NAV_COLUMNS_UNSTYLED = 3;

/**
 * Columns the quick-nav grid is *laid out* in, so ArrowUp/ArrowDown step one
 * visual row. The track list on `.calendar-picker-grid` is the only writer of
 * the count — including a caller's `classNames.pickerGrid` — because a laid-out
 * grid container resolves `grid-template-columns` to one entry per used track.
 * `none` means no stylesheet reached the element at all, and a value still
 * carrying `repeat()`/`minmax()` means the element has no layout box to resolve
 * against — neither is countable, so both take the default.
 */
function quickNavColumns(grid: HTMLElement | null): number {
  const tracks = grid ? getComputedStyle(grid).gridTemplateColumns.trim() : "";
  if (tracks === "" || tracks === "none") return QUICK_NAV_COLUMNS_UNSTYLED;
  // A line-name span sits between tracks and may hold several names, so drop the
  // span whole: splitting first and dropping the words that start with `[` reads
  // `[a b]` as one discard and one track.
  const sized = tracks.replace(/\[[^\]]*\]/g, " ");
  // A used track list is a plain run of lengths. A surviving `(` means this is
  // the computed value instead — `repeat(3, 1fr)`, from an element with no
  // layout box — whose spaces and commas do not count tracks.
  if (sized.includes("(")) return QUICK_NAV_COLUMNS_UNSTYLED;
  const columns = sized.split(/\s+/).filter(Boolean).length;
  return columns || QUICK_NAV_COLUMNS_UNSTYLED;
}

type QuickNavItem = {
  key: string;
  label: string;
  disabled: boolean;
  /** The month/year currently displayed by the calendar. */
  current: boolean;
  onSelect: () => void;
};

/**
 * The month and year quick-nav panels. A flat run of buttons with one tab stop
 * and 2-D arrow-key movement — deliberately *not* `role="grid"`: it holds no
 * rows and no gridcells, and its buttons carry navigation state (`aria-current`),
 * not selection (`aria-selected`, which `button` does not support).
 */
function QuickNavGrid({
  ariaLabel,
  items,
  classNames,
}: {
  ariaLabel: string;
  items: QuickNavItem[];
  classNames?: CalendarSlotClassNames;
}) {
  const initialIndex = Math.max(
    0,
    items.findIndex((i) => i.current),
  );
  const [focusIndex, setFocusIndex] = useState(initialIndex);
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;
    gridRef.current
      ?.querySelectorAll<HTMLButtonElement>(".calendar-picker-cell")
      [pending]?.focus();
  });

  function move(next: number) {
    const clamped = Math.min(Math.max(next, 0), items.length - 1);
    setFocusIndex(clamped);
    pendingRef.current = clamped;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowLeft":
        move(focusIndex - 1);
        break;
      case "ArrowRight":
        move(focusIndex + 1);
        break;
      case "ArrowUp":
        move(focusIndex - quickNavColumns(gridRef.current));
        break;
      case "ArrowDown":
        move(focusIndex + quickNavColumns(gridRef.current));
        break;
      case "Home":
        move(0);
        break;
      case "End":
        move(items.length - 1);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  return (
    <div
      ref={gridRef}
      className={cn("calendar-picker-grid", classNames?.pickerGrid)}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          // `.calendar-picker-cell` is the selector `useEffect` above lands
          // arrow-key focus through, so the base class comes first and the slot
          // is appended to it — a slot must never be able to replace it.
          className={cn("calendar-picker-cell", classNames?.pickerCell)}
          tabIndex={i === focusIndex ? 0 : -1}
          aria-disabled={item.disabled || undefined}
          aria-current={item.current ? "true" : undefined}
          onClick={() => {
            if (item.disabled) return;
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

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
    labels,
    autoFocus = false,
    onTodayClick,
    classNames,
    renderDay,
    className,
    style,
    onPointerLeave,
    onChange: _onChange,
    ...props
  },
  ref,
) {
  const label = { ...DEFAULT_CALENDAR_LABELS, ...labels };
  // Below the design system's 40rem breakpoint, collapse a multi-month calendar
  // to a single paged month. Stacked months overflow a phone-width popover and
  // force an awkward nested scrollbar; instead the ‹ › nav pages between months,
  // and the single-month layout turns the header label into a tappable month/year
  // quick-jump (it's an inert spacer in the multi-month layout).
  const isCompact = useMediaQuery("(width < 40rem)");
  const monthCount = isCompact ? 1 : Math.max(1, numberOfMonths);
  // Local midnight, not the wall clock: every day cell emits midnight, so a
  // wall-clock `today` made the Today button's payload unequal (`getTime()`) to
  // the same day picked from the grid.
  const today = startOfDay(new Date());

  function isDayDisabled(d: Date): boolean {
    if (min && isBefore(d, min)) return true;
    if (max && isAfter(d, max)) return true;
    return isDateDisabled?.(d) ?? false;
  }

  // `defaultMonth` first: it is the caller saying which month to open on, where
  // the anchor is only inferred from the selection. The opposite precedence let
  // any seeded selection silently override an explicit `defaultMonth` (#311),
  // and inverted `Calendar.tsx`'s own `defaultMonth ?? value`.
  const seedMonth = startOfMonth(defaultMonth ?? focusAnchor ?? today);
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

  // The window follows the selection — but only when the selection *changes*.
  // Edge-triggered against the previous anchor, not re-derived each render:
  // level-triggering would drag the view back every time anything re-rendered,
  // and a user who paged away from the selection could never stay there. This is
  // React's documented adjust-state-during-render pattern, the same shape
  // `AppShell` uses to close its drawer on navigation.
  //
  // `setDisplayedMonth` is a *request*, not a fact. Uncontrolled, it moves the
  // view. With a controlled `month` the prop wins and the parent is asked via
  // `onMonthChange` — identical to what the ‹ › buttons already do, so a
  // controlled caller handles both through one path.
  //
  // Without this, re-rendering `value` from June to September left the grid on
  // June with no day marked selected anywhere: the seed is read once by
  // `useState`, so nothing connected a selection change to the visible window.
  const anchorKey = focusAnchor ? dayKey(focusAnchor) : null;
  const [prevAnchorKey, setPrevAnchorKey] = useState(anchorKey);
  if (prevAnchorKey !== anchorKey) {
    setPrevAnchorKey(anchorKey);
    if (focusAnchor && !isMonthVisible(focusAnchor)) {
      setDisplayedMonth(startOfMonth(focusAnchor));
    }
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

  // Opening the calendar inside a popover must land on the grid, not on the
  // first tabbable chrome button — arrow keys are otherwise dead on open.
  //
  // `preventScroll` because this fires a commit before the popover has a
  // position: Floating UI computes asynchronously, so a portalled calendar is
  // still at the document's top-left here, and scrolling that day into view
  // means scrolling the page to the top.
  const hasAutoFocusedRef = useRef(false);
  useEffect(() => {
    if (!autoFocus || hasAutoFocusedRef.current) return;
    hasAutoFocusedRef.current = true;
    rootRef.current
      ?.querySelector<HTMLButtonElement>('.calendar-day[tabindex="0"]')
      ?.focus({ preventScroll: true });
  }, [autoFocus]);

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
    if (!isMonthVisible(day)) {
      // Paging unmounts the button that was clicked (a leading/trailing padding
      // day), so focus has to be re-landed on its in-month twin or it falls to
      // <body>. Same handoff `moveFocusTo` performs for the arrow keys.
      pendingFocusRef.current = day;
      revealMonth(day);
    }
    onDaySelect(day);
  }

  function handleToday() {
    setView("days");
    setFocusDate(today);
    pendingFocusRef.current = today;
    if (!isMonthVisible(today)) goToMonth(today);
    // Navigate always; select only if today is actually selectable, so Today
    // cannot commit a date the grid itself refuses.
    if (!isDayDisabled(today)) onTodayClick?.(today);
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
  else if (monthCount > 1)
    headerLabel = `${captionFor(displayedMonth)} – ${captionFor(addMonths(displayedMonth, monthCount - 1))}`;
  else headerLabel = captionFor(displayedMonth);

  const prevLabel =
    view === "days" ? label.previousMonth : view === "months" ? label.previousYear : label.previousYears;
  const nextLabel =
    view === "days" ? label.nextMonth : view === "months" ? label.nextYear : label.nextYears;

  function onCaptionClick() {
    if (view === "days") setView("months");
    else if (view === "months") setView("years");
  }

  // ---- Render ---------------------------------------------------------------

  function renderMonthsView() {
    const year = displayedMonth.getFullYear();
    const monthNamesShort = getMonthNames(locale, "short");
    const items: QuickNavItem[] = monthNamesLong.map((name, m) => ({
      key: name,
      label: monthNamesShort[m],
      disabled:
        (min && year * 12 + m < monthOrdinal(min)) ||
        (max && year * 12 + m > monthOrdinal(max)) ||
        false,
      current: m === displayedMonth.getMonth(),
      onSelect: () => {
        setDisplayedMonth(new Date(year, m, 1));
        setView("days");
      },
    }));
    return <QuickNavGrid ariaLabel={String(year)} items={items} classNames={classNames} />;
  }

  function renderYearsView() {
    const items: QuickNavItem[] = Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
      const year = decadeStart + i;
      return {
        key: String(year),
        label: String(year),
        disabled:
          (min && year < min.getFullYear()) || (max && year > max.getFullYear()) || false,
        current: year === displayedMonth.getFullYear(),
        onSelect: () => {
          setDisplayedMonth(new Date(year, displayedMonth.getMonth(), 1));
          setView("months");
        },
      };
    });
    return <QuickNavGrid ariaLabel={headerLabel} items={items} classNames={classNames} />;
  }

  function renderMonthGrid(monthDate: Date) {
    const weekdayNames = getWeekdayNames(locale, "short", weekStartsOn);
    const weeks = buildMonthGrid(monthDate, weekStartsOn);
    return (
      <div className={cn("calendar-month", classNames?.month)} key={monthOrdinal(monthDate)}>
        {monthCount > 1 && (
          <div className={cn("calendar-month-caption", classNames?.caption)} aria-hidden="true">
            {captionFor(monthDate)}
          </div>
        )}
        <div
          role="grid"
          aria-label={captionFor(monthDate)}
          className={cn("calendar-grid", classNames?.grid)}
          onKeyDown={handleDayKeyDown}
        >
          <div role="row" className={cn("calendar-weekdays", classNames?.weekdays)}>
            {weekdayNames.map((name, i) => (
              <div
                key={`${i}-${name}`}
                role="columnheader"
                aria-label={name}
                className={cn("calendar-weekday", classNames?.weekday)}
              >
                {name}
              </div>
            ))}
          </div>

          {weeks.map((week) => (
            <div role="row" className={cn("calendar-week", classNames?.row)} key={dayKey(week[0])}>
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

                // Range membership has no ARIA state of its own, and the tint
                // that carries it is far below the non-text contrast floor —
                // so it goes into the day's accessible name instead.
                const rangeSuffix = status.inRange
                  ? label.inRange
                  : status.preview
                    ? label.previewRange
                    : null;
                const name = rangeSuffix
                  ? `${dayLabel(day, locale)}, ${rangeSuffix}`
                  : dayLabel(day, locale);

                return (
                  // `aria-selected` belongs on the gridcell: ARIA does not
                  // support it on `button`, so on the day itself it was ignored.
                  <div
                    role="gridcell"
                    className={cn("calendar-cell", classNames?.cell)}
                    aria-selected={selected}
                    key={dayKey(day)}
                  >
                    <button
                      type="button"
                      data-day={dayKey(day)}
                      // `.calendar-day` and `[data-day]` are both selectors the
                      // roving-focus effects query, so the base class comes
                      // first and the slot is appended — never a replacement.
                      className={cn("calendar-day", classNames?.day)}
                      tabIndex={isFocusDay ? 0 : -1}
                      aria-disabled={disabled || undefined}
                      aria-label={name}
                      data-selected={selected ? "" : undefined}
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
                      {renderDay
                        ? renderDay({ date: day, status, outside, today: isToday, disabled, selected })
                        : day.getDate()}
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
      // Tells CalendarBase.css how many month grids are shown so it can size itself
      // to exactly that many on wide layouts. `max-width: 100%` then lets it
      // collapse to a single fluid column on narrow screens / mobile.
      style={{ "--calendar-months": monthCount, ...style } as CSSProperties}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        onDayHover?.(null);
      }}
      {...props}
    >
      <div className={cn("calendar-header", classNames?.header)}>
        <IconButton type="button" aria-label={prevLabel} onClick={stepBackward}>
          <ChevronLeft aria-hidden="true" size={18} />
        </IconButton>
        {/* Always interactive, including multi-month: this button is both the
            month/year quick-nav and the calendar's only live region, and the
            per-month captions it used to defer to are `aria-hidden`. */}
        <button
          type="button"
          className={cn("calendar-label calendar-label-button", classNames?.labelButton)}
          aria-live="polite"
          onClick={onCaptionClick}
        >
          {headerLabel}
        </button>
        <IconButton type="button" aria-label={nextLabel} onClick={stepForward}>
          <ChevronRight aria-hidden="true" size={18} />
        </IconButton>
      </div>

      {view === "days" && (
        <div className={cn("calendar-months", classNames?.months)}>
          {visibleMonths.map(renderMonthGrid)}
        </div>
      )}
      {view === "months" && renderMonthsView()}
      {view === "years" && renderYearsView()}

      {showToday && view === "days" && (
        <div className={cn("calendar-footer", classNames?.footer)}>
          <button
            type="button"
            className={cn("calendar-today-button", classNames?.todayButton)}
            onClick={handleToday}
          >
            {todayLabel}
          </button>
        </div>
      )}
    </div>
  );
});
