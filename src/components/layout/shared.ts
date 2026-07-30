export type Gap = "r1" | "r2" | "r3" | "r4" | "r5" | "r6";

export const gapMap: Record<Gap, string> = {
  r1: "gap-r1",
  r2: "gap-r2",
  r3: "gap-r3",
  r4: "gap-r4",
  r5: "gap-r5",
  r6: "gap-r6",
};

/**
 * Block-direction spacing for layouts where `gap` cannot supply it. CSS
 * multi-column has no row-gap between items in a column, so `MasonryGrid`
 * spaces its items with a margin instead — the same token, a different
 * property. Kept beside `gapMap` so one scale is defined once.
 */
export const blockGapMap: Record<Gap, string> = {
  r1: "mb-r1",
  r2: "mb-r2",
  r3: "mb-r3",
  r4: "mb-r4",
  r5: "mb-r5",
  r6: "mb-r6",
};
