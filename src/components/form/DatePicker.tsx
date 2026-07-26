"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useId,
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

import {
  type DateRejection,
  datePickerPopoverClassName,
  defaultRejectMessage,
  isSameDateValue,
  rejectMessageClassName,
} from "./date-picker-internals";
import { useFieldError } from "./Field";
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
  /**
   * Sentence shown, and politely announced, when a commit refuses what was
   * typed — unreadable text, or a day `isDateDisabled` rejects. Return `""` to
   * show nothing; `aria-invalid` still reflects the refusal, because `""`
   * removes the word, not the state.
   * @default (reason, text) => `31/31/2026 is not a date we can read.`
   */
  rejectMessage?: (reason: DateRejection, text: string) => string;
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
      rejectMessage = defaultRejectMessage,
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
    // Every commit path but a refusal clears it, so the committed Date stays the
    // only value.
    const [draft, setDraft] = useState<string | null>(null);
    const text = draft ?? display(selected, locale, formatOptions);

    // Set when a commit could not honour what was typed, and holding the text
    // it refused so the message can quote it. Without it the failure has no
    // observable state at all.
    const [rejection, setRejection] = useState<{
      reason: DateRejection;
      text: string;
    } | null>(null);

    // The sentence is derived, not stored, so a later `rejectMessage` (or a
    // locale switch that changes it) reaches a refusal already on screen.
    // `""` is the documented way to say nothing without giving up aria-invalid.
    const message = rejection
      ? rejectMessage(rejection.reason, rejection.text) || null
      : null;

    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messageId = useId();

    // `field()` always emits the key `"aria-invalid": undefined`, so a plain
    // `{...props}` spread would erase the error state Input derives from
    // `error`/Field. Merging lets our value win when we have one and keeps the
    // caller's when we don't.
    const { ariaProps } = useFieldError(error);
    const describedBy =
      [ariaProps["aria-describedby"], message != null ? messageId : undefined]
        .filter(Boolean)
        .join(" ") || undefined;
    const fieldErrorProps = { ...ariaProps, "aria-describedby": describedBy };

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
     *
     * The draft is dropped on success, and when what is left is blank. A
     * refusal **keeps** it: clearing a rejected entry destroys the typing the
     * user has to correct, and the message quotes text that would no longer be
     * on screen. The committed `Date` is untouched either way.
     */
    const commit = useCallback(() => {
      if (draft === null) return;
      if (draft.trim() === "") {
        setDraft(null);
        setRejection(null);
        setSelected(null);
        return;
      }
      const parsed = parseDateInput(draft, locale);
      if (!parsed) {
        setRejection({ reason: "unparseable", text: draft });
        return;
      }
      // Clamped before the matcher runs, so a typed out-of-range date snaps in
      // rather than being refused.
      const clamped = clampDate(parsed, min, max);
      if (isDateDisabled?.(clamped) ?? false) {
        setRejection({ reason: "unavailable", text: draft });
        return;
      }
      setDraft(null);
      setRejection(null);
      setSelected(clamped);
    }, [draft, locale, min, max, isDateDisabled, setSelected]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key !== "Enter") return;
        // Nothing pending: leave the event alone so the field still triggers
        // implicit form submission the way a native input does. Text already
        // refused, and unedited since, counts as nothing pending — the message
        // has been said, and a field that ate the key forever could never
        // submit the form it sits in.
        if (draft === null || rejection?.text === draft) return;
        e.preventDefault();
        commit();
      },
      [commit, draft, onKeyDown, rejection],
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
      setRejection(null);
      inputRef.current?.focus();
    }, [setSelected]);

    const handleCalendarSelect = useCallback(
      (date: Date) => {
        setSelected(date);
        setDraft(null);
        setRejection(null);
        setOpen(false);
        inputRef.current?.focus();
      },
      [setSelected],
    );

    return (
      <div className={className}>
        {/* The field row is its own positioning context, and the floating
            anchor: the message below is a sibling of it, so a refusal neither
            re-centres the icon cluster (`inset-y-0` spans whatever box it is
            in) nor pushes the calendar away from the field. */}
        <div ref={refs.setReference} className="relative">
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
            // A refusal keeps what was typed on screen; without this it would
            // have no observable state at all.
            error={error || rejection != null}
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            form={form}
            className={clearable ? "pr-[4rem]" : "pr-r1"}
            // Editing clears the refusal: the message quotes what was typed,
            // so leaving it up beside text the user has already started
            // correcting would name something no longer on screen.
            onChange={(e) => {
              setDraft(e.target.value);
              setRejection(null);
            }}
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
        </div>

        {/* One message element for the control, mounted whether or not it holds
            anything: a live region created in the same commit as its first text
            is not reliably announced. Same channel `TagInput` and `Repeater`
            use, and the same one `DateRangePicker` uses. */}
        <p
          id={messageId}
          aria-live="polite"
          className={cn(rejectMessageClassName, message == null && "sr-only")}
        >
          {message}
        </p>

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
