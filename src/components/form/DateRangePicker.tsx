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
import { IconButton } from "../ui/IconButton";

import { datePickerPopoverClassName, isSameDateRange } from "./date-picker-internals";
import { Input } from "./Input";

const EMPTY_RANGE: DateRange = { start: null, end: null };

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
      name,
      className,
      color: _color,
      ...props
    },
    ref,
  ) {
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

    /** Parse + clamp a draft to an enabled Date, or null (empty / invalid / disabled). */
    const resolve = useCallback(
      (draft: string): Date | null => {
        if (draft.trim() === "") return null;
        const parsed = parseDateInput(draft, locale);
        if (!parsed) return null;
        const clamped = clampDate(parsed, min, max);
        if (isDateDisabled?.(clamped)) return null;
        return clamped;
      },
      [locale, min, max, isDateDisabled],
    );

    /** Commit both fields into an ordered range; text that doesn't resolve reverts. */
    const commit = useCallback(() => {
      const startValid = startText.trim() === "" || parseDateInput(startText, locale) !== null;
      const endValid = endText.trim() === "" || parseDateInput(endText, locale) !== null;

      let start = startValid ? resolve(startText) : range.start;
      let end = endValid ? resolve(endText) : range.end;

      // Order endpoints so start precedes end.
      if (start && end && isBefore(end, start)) {
        [start, end] = [end, start];
      }

      setStartDraft(null);
      setEndDraft(null);
      setRange({ start, end });
    }, [startText, endText, locale, resolve, range, setRange]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      },
      [commit],
    );

    const referenceProps = getReferenceProps({ onBlur: commit, onKeyDown: handleKeyDown });

    return (
      <div ref={mergeRefs(ref, refs.setReference)} className={cn("relative", className)} {...props}>
        {name !== undefined && (
          <>
            <input type="hidden" name={`${name}.start`} value={range.start ? toISODate(range.start) : ""} />
            <input type="hidden" name={`${name}.end`} value={range.end ? toISODate(range.end) : ""} />
          </>
        )}
        <div className="flex items-center gap-r6">
          <Input
            type="text"
            error={error}
            value={startText}
            placeholder={startPlaceholder}
            disabled={disabled}
            aria-label="Start date"
            onChange={(e) => setStartDraft(e.target.value)}
            {...referenceProps}
          />
          <span aria-hidden="true" className="text-fg-muted">
            –
          </span>
          <Input
            type="text"
            error={error}
            value={endText}
            placeholder={endPlaceholder}
            disabled={disabled}
            aria-label="End date"
            onChange={(e) => setEndDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
          <IconButton
            type="button"
            aria-label="Open calendar"
            aria-haspopup="dialog"
            aria-expanded={open}
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
          >
            <CalendarDays aria-hidden="true" size={18} />
          </IconButton>
        </div>

        {open && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <div
                ref={refs.setFloating}
                style={floatingStyles}
                aria-label="Choose date range"
                className={datePickerPopoverClassName}
                {...getFloatingProps()}
              >
                <RangeCalendar
                  value={range}
                  defaultMonth={defaultMonth}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
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
