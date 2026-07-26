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
import { IconButton } from "../ui/IconButton";

import { datePickerPopoverClassName, isSameDateValue } from "./date-picker-internals";
import { useFieldErrorProps } from "./Field";
import { Input } from "./Input";

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
      className,
      name,
      onKeyDown,
      onBlur,
      ...props
    },
    ref,
  ) {
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
     * Commit the current text: parse, clamp, select. Dropping the override is
     * unconditional — invalid or disabled input reverts by falling back to the
     * committed value, and a valid one reformats from it.
     */
    const commit = useCallback(() => {
      setDraft(null);
      if (text.trim() === "") {
        setSelected(null);
        return;
      }
      const parsed = parseDateInput(text, locale);
      // Reject unparseable input and dates the matcher disables (after clamping to
      // [min, max], so a typed out-of-range date snaps in rather than being rejected).
      const clamped = parsed ? clampDate(parsed, min, max) : null;
      if (clamped && !(isDateDisabled?.(clamped) ?? false)) setSelected(clamped);
    }, [text, locale, min, max, isDateDisabled, setSelected]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      },
      [commit, onKeyDown],
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
      inputRef.current?.focus();
    }, [setSelected]);

    const handleCalendarSelect = useCallback(
      (date: Date) => {
        setSelected(date);
        setDraft(null);
        setOpen(false);
        inputRef.current?.focus();
      },
      [setSelected],
    );

    const referenceProps = getReferenceProps({
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
    });

    return (
      <div ref={refs.setReference} className={cn("relative", className)}>
        {/* Native form submission carries a machine-readable YYYY-MM-DD, not the
            localized display string. The visible input is intentionally unnamed. */}
        {name !== undefined && (
          <input type="hidden" name={name} value={selected ? toISODate(selected) : ""} />
        )}
        <Input
          ref={mergeRefs(ref, inputRef)}
          type="text"
          error={error}
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={clearable ? "pr-[4rem]" : "pr-r1"}
          onChange={(e) => setDraft(e.target.value)}
          {...mergeProps(props, fieldErrorProps)}
          {...referenceProps}
        />
        <div className="absolute inset-y-0 right-r6 my-auto flex items-center gap-r6">
          {clearable && selected != null && !disabled && (
            <IconButton type="button" aria-label="Clear date" onClick={handleClear}>
              <X aria-hidden="true" size={16} />
            </IconButton>
          )}
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
                aria-label="Choose date"
                className={datePickerPopoverClassName}
                {...getFloatingProps()}
              >
                <Calendar
                  value={selected}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
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
