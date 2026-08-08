"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useId,
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
import { cn, type SlotClassNames } from "../../util/style";
import { type DateRange, RangeCalendar } from "../ui/RangeCalendar";
import { type CalendarLabels } from "../ui/CalendarBase";
import { IconButton } from "../ui/IconButton";

import {
  type DateRejection,
  datePickerPopoverClassName,
  defaultRejectMessage,
  isSameDateRange,
  rejectMessageClassName,
} from "./date-picker-internals";
import { useFieldError } from "./Field";
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
  | { kind: "invalid"; reason: DateRejection };

/** A refusal paired with the text that was refused, ready to be quoted. */
type Rejection = { reason: DateRejection; text: string };

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
  /**
   * Sentence shown, and politely announced, when a commit refuses what was
   * typed into an endpoint — unreadable text, or a day `isDateDisabled`
   * rejects. Return `""` to show nothing; `aria-invalid` still reflects the
   * refusal on the field that caused it, because `""` removes the word, not the
   * state.
   *
   * Both endpoints share one message element, so a commit that refuses both
   * writes both sentences into it, in field order. `text` is what was typed in
   * that field, which is what distinguishes them — the same shape `DatePicker`
   * takes, deliberately, so the two pickers have one convention between them.
   * @default (reason, text) => `06/11 is not a date we can read.`
   */
  rejectMessage?: (reason: DateRejection, text: string) => string;
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
   * Class overrides for the picker's own chrome. `className` is the root, so
   * there is no `root` key.
   *
   * - `control` — the field row holding both endpoints and the open button; the
   *   positioning context the popover anchors to.
   * - `panel` — the floating surface the range calendar is rendered into.
   *
   * The calendar's own internals are not addressed from here: they belong to
   * `CalendarBase`'s anatomy, which this component renders through
   * `RangeCalendar`.
   */
  classNames?: SlotClassNames<"control" | "panel">;
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
      rejectMessage = defaultRejectMessage,
      startInputId,
      endInputId,
      form,
      name,
      classNames,
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

    // Set per endpoint when a commit could not honour what was typed there, and
    // holding the text it refused so the message can quote it. Only an endpoint
    // the user actually typed into can be refused: a `formatOptions` the parser
    // cannot read back makes the *displayed* text unparseable too, and blaming
    // the user for a field they never touched would be noise.
    const [startRejection, setStartRejection] = useState<Rejection | null>(null);
    const [endRejection, setEndRejection] = useState<Rejection | null>(null);

    const [open, setOpen] = useState(false);
    const messageId = useId();

    // The sentences are derived, not stored, so a later `rejectMessage` reaches
    // a refusal already on screen. `""` is the documented way to say nothing
    // without giving up aria-invalid.
    const message =
      [
        startRejection ? rejectMessage(startRejection.reason, startRejection.text) : "",
        endRejection ? rejectMessage(endRejection.reason, endRejection.text) : "",
      ]
        .filter(Boolean)
        .join(" ") || null;

    // `field()` always emits the key `"aria-invalid": undefined`, so the fields
    // read the enclosing Field through `Input`'s own `useFieldError`; this call
    // is only here to compose the field's description id with our own.
    const { ariaProps } = useFieldError(error);
    const describedBy =
      [ariaProps["aria-describedby"], message != null ? messageId : undefined]
        .filter(Boolean)
        .join(" ") || undefined;

    const { refs, floatingStyles, context, portalRoot } = useFloating({
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
        if (!parsed) return { kind: "invalid", reason: "unparseable" };
        const clamped = clampDate(parsed, min, max);
        if (isDateDisabled?.(clamped)) return { kind: "invalid", reason: "unavailable" };
        return { kind: "date", date: clamped };
      },
      [locale, min, max, isDateDisabled],
    );

    /**
     * Commit both fields into an ordered range.
     *
     * An endpoint whose text does not resolve keeps its committed value — and,
     * when the user typed it, keeps the typing too. Clearing a refused draft
     * destroys the entry that needs correcting, and the message quotes text
     * that would no longer be on screen.
     */
    const commit = useCallback(() => {
      // Nothing typed since focus: committing anyway re-parses the *formatted*
      // text and rewrites a value the user never touched (a reversed range gets
      // silently reordered and `onValueChange` fires for a change nobody made).
      if (startDraft === null && endDraft === null) return;

      const settle = (draft: string | null, text: string, previous: Date | null) => {
        const resolution = resolve(text);
        if (resolution.kind === "date") {
          return { value: resolution.date, draft: null, rejection: null };
        }
        if (resolution.kind === "empty") {
          return { value: null, draft: null, rejection: null };
        }
        return {
          value: previous,
          draft,
          rejection:
            draft === null ? null : { reason: resolution.reason, text: draft },
        };
      };

      const startResult = settle(startDraft, startText, range.start);
      const endResult = settle(endDraft, endText, range.end);

      let start = startResult.value;
      let end = endResult.value;

      // Order endpoints so start precedes end.
      if (start && end && isBefore(end, start)) {
        [start, end] = [end, start];
      }

      setStartDraft(startResult.draft);
      setEndDraft(endResult.draft);
      setStartRejection(startResult.rejection);
      setEndRejection(endResult.rejection);
      setRange({ start, end });
    }, [startDraft, endDraft, startText, endText, resolve, range, setRange]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key !== "Enter") return;
        // Nothing pending: leave the event alone so the field still triggers
        // implicit form submission the way a native input does. A draft already
        // refused, and unedited since, counts as nothing pending — the message
        // has been said, and fields that ate the key forever could never submit
        // the form they sit in.
        const settled = (draft: string | null, rejection: Rejection | null) =>
          draft === null || rejection?.text === draft;
        if (settled(startDraft, startRejection) && settled(endDraft, endRejection)) return;
        e.preventDefault();
        commit();
      },
      [commit, endDraft, endRejection, onKeyDown, startDraft, startRejection],
    );

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
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
        {/* The field row is the floating anchor, not the wrapper: the message
            below is a sibling of it, so a refusal does not push the calendar
            away from the fields it belongs to. */}
        <div
          ref={refs.setReference}
          className={cn("flex items-center gap-r6", classNames?.control)}
        >
          <Input
            type="text"
            id={startInputId}
            error={error || startRejection != null}
            aria-describedby={describedBy}
            value={startText}
            placeholder={startPlaceholder}
            disabled={disabled}
            aria-label={label.startDate}
            // Editing clears that field's refusal: the message quotes what was
            // typed, so leaving it up beside text already being corrected would
            // name something no longer on screen.
            onChange={(e) => {
              setStartDraft(e.target.value);
              setStartRejection(null);
            }}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
          <span
            aria-hidden="true"
            // slot:(a) the separator glyph between the two fields, and its one
            // utility is the thing that makes it a separator rather than a
            // third value: `text-fg-muted` is what ranks it below the dates it
            // sits between. A route here is a route to un-rank it — a caller
            // giving it `text-fg-primary` prints what reads as a third field,
            // and one that removes the ink inherits the field colour and gets
            // the same. The glyph is already `aria-hidden`, so nothing warns
            // them. The lever they are usually after — the spacing and
            // arrangement of the pair — is `classNames.control` around it.
            className="text-fg-muted"
          >
            –
          </span>
          <Input
            type="text"
            id={endInputId}
            error={error || endRejection != null}
            aria-describedby={describedBy}
            value={endText}
            placeholder={endPlaceholder}
            disabled={disabled}
            aria-label={label.endDate}
            onChange={(e) => {
              setEndDraft(e.target.value);
              setEndRejection(null);
            }}
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

        {/* One message element for the pair, mounted whether or not it holds
            anything: a live region created in the same commit as its first text
            is not reliably announced. Same channel `TagInput` and `Repeater`
            use, and the same one `DatePicker` uses. */}
        <p
          id={messageId}
          aria-live="polite"
          // slot:(a) the live region, and `sr-only` is the mechanism rather
          // than a style: the element is mounted whether or not it holds
          // anything, and the class is what keeps an empty one out of the
          // visual flow. A route here is a route to dropping it.
          className={cn(rejectMessageClassName, message == null && "sr-only")}
        >
          {message}
        </p>

        {open && (
          <FloatingPortal root={portalRoot}>
            {/* `initialFocus={-1}`: the calendar focuses its own roving day, so
                focus lands on the grid rather than on "Previous month". */}
            <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
              <div
                ref={refs.setFloating}
                style={floatingStyles}
                aria-label={label.chooseDateRange}
                className={cn(datePickerPopoverClassName, classNames?.panel)}
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
