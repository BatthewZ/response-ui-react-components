/**
 * Shared building blocks for the date-picker family (`DatePicker`,
 * `DateRangePicker`). Internal — not part of the public package exports.
 */

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
