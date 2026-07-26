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
