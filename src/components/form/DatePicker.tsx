"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useRef,
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
import { clampDate, formatDate, parseDateInput } from "../../util/date";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import { Calendar } from "../ui/Calendar";
import { IconButton } from "../ui/IconButton";

import { Input } from "./Input";

type DatePickerProps = {
  value?: Date | null;
  defaultValue?: Date;
  onValueChange?: (d: Date | null) => void;
  min?: Date;
  max?: Date;
  locale?: string;
  formatOptions?: Intl.DateTimeFormatOptions;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
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
      min,
      max,
      locale = "en-US",
      formatOptions,
      placeholder,
      error,
      disabled,
      className,
      onKeyDown,
      onBlur,
      ...props
    },
    ref,
  ) {
    // Source of truth #1: the committed Date.
    const [selected, setSelected] = useControllableState<Date | null>({
      value,
      defaultValue: defaultValue ?? null,
      onChange: (next) => onValueChange?.(next),
    });

    // Source of truth #2: the draft string the user is typing. It is reseeded
    // from `selected` whenever the committed value changes out from under us
    // (controlled prop change, calendar pick, or a successful commit) — tracked
    // by comparing the last value we formatted from.
    const [draft, setDraft] = useState(() => display(selected, locale, formatOptions));
    const lastFormattedRef = useRef<Date | null>(selected);
    if (selected !== lastFormattedRef.current) {
      lastFormattedRef.current = selected;
      setDraft(display(selected, locale, formatOptions));
    }

    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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

    /** Commit the current draft string: parse, clamp, fire onValueChange, reformat. */
    const commit = useCallback(() => {
      if (draft.trim() === "") {
        setSelected(null);
        setDraft("");
        lastFormattedRef.current = null;
        return;
      }
      const parsed = parseDateInput(draft, locale);
      if (parsed) {
        const clamped = clampDate(parsed, min, max);
        setSelected(clamped);
        setDraft(display(clamped, locale, formatOptions));
        lastFormattedRef.current = clamped;
      } else {
        // Invalid non-empty input: revert to the last valid formatted value.
        setDraft(display(selected, locale, formatOptions));
      }
    }, [draft, locale, formatOptions, min, max, selected, setSelected]);

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

    const handleCalendarSelect = useCallback(
      (date: Date) => {
        setSelected(date);
        setDraft(display(date, locale, formatOptions));
        lastFormattedRef.current = date;
        setOpen(false);
        inputRef.current?.focus();
      },
      [locale, formatOptions, setSelected],
    );

    const referenceProps = getReferenceProps({
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
    });

    return (
      <div ref={refs.setReference} className={cn("relative", className)}>
        <Input
          ref={mergeRefs(ref, inputRef)}
          type="text"
          error={error}
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="pr-r1"
          onChange={(e) => setDraft(e.target.value)}
          {...props}
          {...referenceProps}
        />
        <IconButton
          type="button"
          aria-label="Open calendar"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          className="absolute inset-y-0 right-r6 my-auto"
          onClick={() => setOpen((v) => !v)}
        >
          <CalendarDays aria-hidden="true" size={18} />
        </IconButton>

        {open && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <div
                ref={refs.setFloating}
                style={floatingStyles}
                aria-label="Choose date"
                className="z-50 rounded-md border border-border-default bg-surface-0 p-r5 shadow-md"
                {...getFloatingProps()}
              >
                <Calendar
                  value={selected}
                  min={min}
                  max={max}
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
