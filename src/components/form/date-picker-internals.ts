/**
 * Shared building blocks for the date-picker family (`DatePicker`,
 * `DateRangePicker`). Internal — not part of the public package exports.
 */

import { isSameDay } from "../../util/date";
import type { DateRange } from "../ui/RangeCalendar";

/**
 * Equality for a committed picker value, for `useControllableState`'s change
 * gate. Day-granular because every producer in the family is: `parseDateInput`
 * yields midnight, the calendar yields a grid day, and `toISODate` submits a
 * day. Reference equality would let a re-parse of an unedited draft — a fresh
 * `Date` every time — read as an edit.
 */
export function isSameDateValue(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return isSameDay(a, b);
}

/** `isSameDateValue` on both endpoints. */
export function isSameDateRange(a: DateRange, b: DateRange): boolean {
  return isSameDateValue(a.start, b.start) && isSameDateValue(a.end, b.end);
}

/**
 * Class names for the floating calendar popover shared by `DatePicker` and
 * `DateRangePicker`. Single source of truth so the responsive sizing stays in
 * sync across both pickers.
 *
 * On narrow viewports it caps to the viewport (minus a 1.5rem gutter) and scrolls
 * if needed; from the 40rem breakpoint up it shrinks to fit the calendar.
 */
export const datePickerPopoverClassName =
  "z-50 max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-md border border-border-default bg-surface-0 p-r5 shadow-md min-[40rem]:w-auto";

/**
 * Why a typed date was refused. Both pickers reject on exactly these two
 * grounds, so both speak the same word for them.
 *
 * - `unparseable` — `parseDateInput` could not read the text at all.
 * - `unavailable` — it parsed, and `isDateDisabled` refused the day it named
 *   (after clamping into `[min, max]`, so an out-of-range date snaps in rather
 *   than being refused).
 */
export type DateRejection = "unparseable" | "unavailable";

/**
 * The one message channel shared by `DatePicker` and `DateRangePicker`: the
 * sentence shown, and announced, when a commit refuses what was typed.
 *
 * `text` is quoted back because the field keeps it — a refused draft is *not*
 * cleared, so the user can correct the entry rather than retype it, and a
 * message naming text that had already vanished would be incoherent.
 */
export function defaultRejectMessage(reason: DateRejection, text: string): string {
  return reason === "unavailable"
    ? `${text} is not available.`
    : `${text} is not a date we can read.`;
}

/**
 * Classes for the pickers' message element. Visible and error-coloured, laid
 * out below the field(s); the caller-facing contract is that it is one element
 * whether or not it holds anything, because a live region created in the same
 * commit as its first text is not reliably announced (same reason `TagInput`
 * and `Repeater` mount theirs unconditionally).
 */
export const rejectMessageClassName = "mt-r6 text-body-3 text-status-error";
