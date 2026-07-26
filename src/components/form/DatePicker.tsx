"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { CalendarDays, X } from "lucide-react";

import {
  FloatingFocusManager,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "../../hooks/use-floating";
import { useControllableState } from "../../hooks/use-controllable-state";
import { clampDate, formatDate, parseDateInput, toISODate } from "../../util/date";
import { mergeProps } from "../../util/merge-props";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import { Calendar } from "../ui/Calendar";
import { type CalendarLabels, type Weekday } from "../ui/CalendarBase";
import { IconButton } from "../ui/IconButton";

import { datePickerPopoverClassName, isSameDateValue } from "./date-picker-internals";
import { useFieldErrorProps } from "./Field";
import { Input } from "./Input";

/** Every string the picker speaks, plus the calendar's own. */
export type DatePickerLabels = CalendarLabels & {
  openCalendar?: string;
  clearDate?: string;
  /** Accessible name of the popover dialog. */
  chooseDate?: string;
};

const DEFAULT_LABELS = {
  openCalendar: "Open calendar",
  clearDate: "Clear date",
  chooseDate: "Choose date",
} satisfies DatePickerLabels;

type DatePickerProps = {
  value?: Date | null;
  defaultValue?: Date;
  onValueChange?: (d: Date | null) => void;
  /**
   * Called with the committed date — the same payload as `onValueChange`, not a
   * DOM `ChangeEvent`.
   *
   * It exists so the documented `{...form.field<Date | null>("when")}` binding
   * works: a JSX spread performs no excess-property check, so `Omit`ting
   * `onChange` never stopped `field()` delivering it — it only stopped
   * TypeScript reporting it.
   */
  onChange?: (d: Date | null) => void;
  min?: Date;
  max?: Date;
  /** Disable individual dates beyond `[min, max]` (e.g. weekends, holidays). */
  isDateDisabled?: (date: Date) => boolean;
  locale?: string;
  formatOptions?: Intl.DateTimeFormatOptions;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  /** Show a clear button that resets the value to null when a date is set. */
  clearable?: boolean;
  /** Overrides for every string the picker and its calendar speak. */
  labels?: DatePickerLabels;
  /** Forwarded to the popover calendar. */
  weekStartsOn?: Weekday;
  /** Forwarded to the popover calendar. */
  numberOfMonths?: number;
  /** Forwarded to the popover calendar. */
  showToday?: boolean;
  /** Forwarded to the popover calendar. */
  todayLabel?: string;
  // `value`/`defaultValue`/`min`/`max` are native input attrs typed string|number;
  // omit them so our Date-typed props don't intersect to `never` for consumers.
} & Omit<ComponentPropsWithRef<"input">, "value" | "defaultValue" | "onChange" | "min" | "max">;

/** Format a committed Date back to its input string, or "" when null. */
function display(
  date: Date | null,
  locale: string,
  formatOptions: Intl.DateTimeFormatOptions | undefined,
): string {
  return date ? formatDate(date, locale, formatOptions) : "";
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker(
    {
      value,
      defaultValue,
      onValueChange,
      onChange,
      min,
      max,
      isDateDisabled,
      locale = "en-US",
      formatOptions,
      placeholder,
      error,
      disabled,
      clearable,
      labels,
      weekStartsOn,
      numberOfMonths,
      showToday,
      todayLabel,
      className,
      name,
      form,
      onKeyDown,
      onBlur,
      ...props
    },
    ref,
  ) {
    const label = { ...DEFAULT_LABELS, ...labels };
    const [selected, setSelected] = useControllableState<Date | null>({
      value,
      defaultValue: defaultValue ?? null,
      onChange: (next) => {
        onValueChange?.(next);
        onChange?.(next);
      },
      isEqual: isSameDateValue,
    });

    // The field text is derived from `selected`; `draft` is a transient override
    // holding what the user has typed since focus, and `null` means "not typing".
    // Every commit path clears it, so the committed Date stays the only value.
    const [draft, setDraft] = useState<string | null>(null);
    const text = draft ?? display(selected, locale, formatOptions);

    // Set when a commit could not honour what was typed. Without it the revert
    // to the previous value is completely silent.
    const [rejected, setRejected] = useState(false);

    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // `field()` always emits the key `"aria-invalid": undefined`, so a plain
    // `{...props}` spread would erase the error state Input derives from
    // `error`/Field. Merging lets our value win when we have one and keeps the
    // caller's when we don't.
    const fieldErrorProps = useFieldErrorProps(error);

    const { refs, floatingStyles, context } = useFloating({
      placement: "bottom-start",
      open,
      onOpenChange: setOpen,
    });
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "dialog" });
    const { getReferenceProps, getFloatingProps } = useInteractions([
      dismiss,
      role,
    ]);

    /**
     * Commit what the user typed: parse, clamp, select. A commit with no draft
     * is a no-op — re-parsing the *formatted* text would round-trip the committed
     * Date through a day-granular string and silently drop its time of day.
     * Dropping the override is otherwise unconditional: invalid or disabled input
     * reverts to the committed value and raises `rejected`.
     */
    const commit = useCallback(() => {
      if (draft === null) return;
      setDraft(null);
      if (draft.trim() === "") {
        setRejected(false);
        setSelected(null);
        return;
      }
      const parsed = parseDateInput(draft, locale);
      // Reject unparseable input and dates the matcher disables (after clamping to
      // [min, max], so a typed out-of-range date snaps in rather than being rejected).
      const clamped = parsed ? clampDate(parsed, min, max) : null;
      if (clamped && !(isDateDisabled?.(clamped) ?? false)) {
        setRejected(false);
        setSelected(clamped);
      } else {
        setRejected(true);
      }
    }, [draft, locale, min, max, isDateDisabled, setSelected]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key !== "Enter") return;
        // Nothing pending: leave the event alone so the field still triggers
        // implicit form submission the way a native input does.
        if (draft === null) return;
        e.preventDefault();
        commit();
      },
      [commit, draft, onKeyDown],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        onBlur?.(e);
        commit();
      },
      [commit, onBlur],
    );

    const handleClear = useCallback(() => {
      setSelected(null);
      setDraft(null);
      setRejected(false);
      inputRef.current?.focus();
    }, [setSelected]);

    const handleCalendarSelect = useCallback(
      (date: Date) => {
        setSelected(date);
        setDraft(null);
        setRejected(false);
        setOpen(false);
        inputRef.current?.focus();
      },
      [setSelected],
    );

    return (
      <div ref={refs.setReference} className={cn("relative", className)}>
        {/* Native form submission carries a machine-readable YYYY-MM-DD, not the
            localized display string. The visible input is intentionally unnamed.
            `form`/`disabled` ride along so this field behaves like a native one
            when it sits outside its form or is switched off. */}
        {name !== undefined && (
          <input
            type="hidden"
            name={name}
            form={form}
            disabled={disabled}
            value={selected ? toISODate(selected) : ""}
          />
        )}
        <Input
          ref={mergeRefs(ref, inputRef)}
          type="text"
          // `rejected` reverted what was typed; without this the failure has no
          // observable state at all.
          error={error || rejected}
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          form={form}
          className={clearable ? "pr-[4rem]" : "pr-r1"}
          onChange={(e) => setDraft(e.target.value)}
          {...mergeProps(props, fieldErrorProps)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        <div className="absolute inset-y-0 right-r6 my-auto flex items-center gap-r6">
          {clearable && selected != null && !disabled && (
            <IconButton type="button" aria-label={label.clearDate} onClick={handleClear}>
              <X aria-hidden="true" size={16} />
            </IconButton>
          )}
          {/* The reference props belong to the control that actually opens the
              dialog. Spread on the text input they advertised `aria-haspopup`,
              `aria-expanded` and `aria-controls` for a popup it could not open. */}
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
                aria-label={label.chooseDate}
                className={datePickerPopoverClassName}
                {...getFloatingProps()}
              >
                <Calendar
                  autoFocus
                  value={selected}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
                  labels={labels}
                  weekStartsOn={weekStartsOn}
                  numberOfMonths={numberOfMonths}
                  showToday={showToday}
                  todayLabel={todayLabel}
                  onValueChange={handleCalendarSelect}
                />
              </div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </div>
    );
  },
);
