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

export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl";

const BREAKPOINTS: readonly Breakpoint[] = ["base", "sm", "md", "lg", "xl"];

/** A single count, or per-breakpoint counts, e.g. `{ base: 1, md: 3 }`. */
export type ColumnBreakpoints<C extends number> = Partial<Record<Breakpoint, C>>;

/**
 * One literal class per breakpoint per count. Written out by each component
 * rather than built from a template literal: Tailwind finds candidates by
 * scanning source text, so `` `${bp}:columns-${n}` `` generates nothing at all.
 * This table is the whole reason a `columns` prop is a bounded union — a count
 * with no cell here is a count with no class. `C | 1` because the `base` step
 * falls back to one column, so a `1` cell is required even of a scale without it.
 */
export type ColumnClassMap<C extends number> = Record<Breakpoint, Record<C | 1, string>>;

/**
 * Mobile-first column classes for a count or per-breakpoint counts.
 *
 * `base` is never absent. The deleted per-component stylesheets read their count
 * through a `var(--…, 1)` default on every root, so `{ md: 3 }` still got one
 * column below `48rem`; emitting nothing at `base` leaves no track definition
 * and no multi-column context at all, and the layout stops wrapping.
 */
export function columnClasses<C extends number>(
  columns: ColumnBreakpoints<C> | C,
  classMap: ColumnClassMap<C>
): string[] {
  const map: ColumnBreakpoints<C> = typeof columns === "number" ? { base: columns } : columns;
  const classes: string[] = [];
  for (const bp of BREAKPOINTS) {
    const count = bp === "base" ? (map.base ?? 1) : map[bp];
    // `1` is a real answer at a breakpoint — it narrows the grid back to a
    // single column, so it must not be skipped as falsy.
    if (count == null) continue;
    // A count outside the union reaches here only from untyped JS, where no
    // compile error is available to catch it. The deleted stylesheets answered
    // it with the same `var(--…, 1)` default; without this the row emits no
    // class, leaving no track definition and no multi-column context, which
    // overflows — strictly worse than what Phase 2 replaced. TypeScript callers
    // still get the error, which is what the phase set out to add.
    const row: Partial<Record<number, string>> = classMap[bp];
    const cls = row[count] ?? row[1];
    if (cls != null) classes.push(cls);
  }
  return classes;
}
