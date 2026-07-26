"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useState,
} from "react";
import { CalendarDays } from "lucide-react";

import {
  FloatingFocusManager,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "../../hooks/use-floating";
import { useControllableState } from "../../hooks/use-controllable-state";
import { clampDate, formatDate, isBefore, parseDateInput, toISODate } from "../../util/date";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import { type DateRange, RangeCalendar } from "../ui/RangeCalendar";
import { type CalendarLabels } from "../ui/CalendarBase";
import { IconButton } from "../ui/IconButton";

import { datePickerPopoverClassName, isSameDateRange } from "./date-picker-internals";
import { Input } from "./Input";

const EMPTY_RANGE: DateRange = { start: null, end: null };

/** Every string the picker speaks, plus the calendar's own. */
export type DateRangePickerLabels = CalendarLabels & {
  startDate?: string;
  endDate?: string;
  openCalendar?: string;
  /** Accessible name of the popover dialog. */
  chooseDateRange?: string;
};

const DEFAULT_LABELS = {
  startDate: "Start date",
  endDate: "End date",
  openCalendar: "Open calendar",
  chooseDateRange: "Choose date range",
} satisfies DateRangePickerLabels;

/** What a typed endpoint resolved to. `invalid` must keep the previous value. */
type Resolution =
  | { kind: "empty" }
  | { kind: "date"; date: Date }
  | { kind: "invalid" };

type DateRangePickerProps = {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange) => void;
  /**
   * Called with the committed range — the same payload as `onValueChange`, not a
   * DOM `ChangeEvent`.
   *
   * It exists so the documented `{...form.field<DateRange>("stay")}` binding
   * works: a JSX spread performs no excess-property check, so `Omit`ting
   * `onChange` never stopped `field()` delivering it — it only stopped
   * TypeScript reporting it. Left on the wrapper `div`, that handler received
   * the endpoint inputs' bubbling `ChangeEvent` and wrote a raw string where a
   * `{ start, end }` object was declared.
   */
  onChange?: (range: DateRange) => void;
  /** Initial month shown in the popover calendar. */
  defaultMonth?: Date;
  min?: Date;
  max?: Date;
  isDateDisabled?: (date: Date) => boolean;
  locale?: string;
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Number of month grids in the popover calendar (default 2). */
  numberOfMonths?: number;
  startPlaceholder?: string;
  endPlaceholder?: string;
  error?: boolean;
  disabled?: boolean;
  /** Overrides for every string the picker and its calendar speak. */
  labels?: DateRangePickerLabels;
  /** `id` of the start input, so a `<Label htmlFor>` can name it. */
  startInputId?: string;
  /** `id` of the end input, so a `<Label htmlFor>` can name it. */
  endInputId?: string;
  /** Owning form for the hidden `name` inputs when the picker sits outside it. */
  form?: string;
  /**
   * Base name for native form submission. Emits two hidden inputs carrying
   * machine-readable YYYY-MM-DD values: `${name}.start` and `${name}.end`.
   */
  name?: string;
  className?: string;
  /**
   * Not a DateRangePicker prop. Declared `never` rather than only `Omit`ted
   * because a JSX spread performs no excess-property check, so `Omit` alone let a
   * caller's `color` reach the wrapper `<div>` and render as an attribute.
   */
  color?: never;
} & Omit<
  ComponentPropsWithRef<"div">,
  "onChange" | "value" | "defaultValue" | "color"
>;

/** Format one endpoint to its input string, or "" when null. */
function display(
  date: Date | null,
  locale: string,
  formatOptions: Intl.DateTimeFormatOptions | undefined,
): string {
  return date ? formatDate(date, locale, formatOptions) : "";
}

export const DateRangePicker = forwardRef<HTMLDivElement, DateRangePickerProps>(
  function DateRangePicker(
    {
      value,
      defaultValue,
      onValueChange,
      onChange,
      defaultMonth,
      min,
      max,
      isDateDisabled,
      locale = "en-US",
      formatOptions,
      numberOfMonths = 2,
      startPlaceholder,
      endPlaceholder,
      error,
      disabled,
      labels,
      startInputId,
      endInputId,
      form,
      name,
      className,
      color: _color,
      onKeyDown,
      ...props
    },
    ref,
  ) {
    const label = { ...DEFAULT_LABELS, ...labels };
    const [range, setRange] = useControllableState<DateRange>({
      value,
      defaultValue: defaultValue ?? EMPTY_RANGE,
      onChange: (next) => {
        onValueChange?.(next);
        onChange?.(next);
      },
      isEqual: isSameDateRange,
    });

    // Each field's text is derived from `range`; a draft is a transient override
    // holding what the user has typed since focus, and `null` means "not typing".
    // `commit` clears both, so the committed range stays the only value.
    const [startDraft, setStartDraft] = useState<string | null>(null);
    const [endDraft, setEndDraft] = useState<string | null>(null);
    const startText = startDraft ?? display(range.start, locale, formatOptions);
    const endText = endDraft ?? display(range.end, locale, formatOptions);

    const [open, setOpen] = useState(false);

    const { refs, floatingStyles, context } = useFloating({
      placement: "bottom-start",
      open,
      onOpenChange: setOpen,
    });
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "dialog" });
    const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

    /**
     * Classify a draft. `invalid` (unparseable *or* disabled) is distinct from
     * `empty`: collapsing the two let a rejected date clear the endpoint the user
     * had already committed.
     */
    const resolve = useCallback(
      (draft: string): Resolution => {
        if (draft.trim() === "") return { kind: "empty" };
        const parsed = parseDateInput(draft, locale);
        if (!parsed) return { kind: "invalid" };
        const clamped = clampDate(parsed, min, max);
        if (isDateDisabled?.(clamped)) return { kind: "invalid" };
        return { kind: "date", date: clamped };
      },
      [locale, min, max, isDateDisabled],
    );

    /** Commit both fields into an ordered range; text that doesn't resolve reverts. */
    const commit = useCallback(() => {
      // Nothing typed since focus: committing anyway re-parses the *formatted*
      // text and rewrites a value the user never touched (a reversed range gets
      // silently reordered and `onValueChange` fires for a change nobody made).
      if (startDraft === null && endDraft === null) return;

      const keep = (r: Resolution, previous: Date | null): Date | null =>
        r.kind === "date" ? r.date : r.kind === "empty" ? null : previous;

      let start = keep(resolve(startText), range.start);
      let end = keep(resolve(endText), range.end);

      // Order endpoints so start precedes end.
      if (start && end && isBefore(end, start)) {
        [start, end] = [end, start];
      }

      setStartDraft(null);
      setEndDraft(null);
      setRange({ start, end });
    }, [startDraft, endDraft, startText, endText, resolve, range, setRange]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key !== "Enter") return;
        // Nothing pending: leave the event alone so the field still triggers
        // implicit form submission the way a native input does.
        if (startDraft === null && endDraft === null) return;
        e.preventDefault();
        commit();
      },
      [commit, endDraft, onKeyDown, startDraft],
    );

    return (
      <div ref={mergeRefs(ref, refs.setReference)} className={cn("relative", className)} {...props}>
        {/* `form`/`disabled` ride along so these behave like native fields when
            the picker sits outside its form or is switched off. */}
        {name !== undefined && (
          <>
            <input
              type="hidden"
              name={`${name}.start`}
              form={form}
              disabled={disabled}
              value={range.start ? toISODate(range.start) : ""}
            />
            <input
              type="hidden"
              name={`${name}.end`}
              form={form}
              disabled={disabled}
              value={range.end ? toISODate(range.end) : ""}
            />
          </>
        )}
        <div className="flex items-center gap-r6">
          <Input
            type="text"
            id={startInputId}
            error={error}
            value={startText}
            placeholder={startPlaceholder}
            disabled={disabled}
            aria-label={label.startDate}
            onChange={(e) => setStartDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
          <span aria-hidden="true" className="text-fg-muted">
            –
          </span>
          <Input
            type="text"
            id={endInputId}
            error={error}
            value={endText}
            placeholder={endPlaceholder}
            disabled={disabled}
            aria-label={label.endDate}
            onChange={(e) => setEndDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
          {/* The reference props belong to the control that actually opens the
              dialog. Spread on the start input they advertised `aria-haspopup`,
              `aria-expanded` and `aria-controls` for a popup it could not open,
              while this button — the one that does open it — advertised none. */}
          <IconButton
            type="button"
            aria-label={label.openCalendar}
            disabled={disabled}
            {...getReferenceProps({ onClick: () => setOpen((v) => !v) })}
          >
            <CalendarDays aria-hidden="true" size={18} />
          </IconButton>
        </div>

        {open && (
          <FloatingPortal>
            {/* `initialFocus={-1}`: the calendar focuses its own roving day, so
                focus lands on the grid rather than on "Previous month". */}
            <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
              <div
                ref={refs.setFloating}
                style={floatingStyles}
                aria-label={label.chooseDateRange}
                className={datePickerPopoverClassName}
                {...getFloatingProps()}
              >
                <RangeCalendar
                  autoFocus
                  value={range}
                  defaultMonth={defaultMonth}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
                  labels={labels}
                  numberOfMonths={numberOfMonths}
                  onValueChange={setRange}
                />
              </div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </div>
    );
  },
);
