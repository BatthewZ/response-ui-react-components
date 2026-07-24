import { type ComponentPropsWithRef, type ElementType, forwardRef } from "react";

import { cn } from "../../util/style";

import "./Grid.css";
import { type Gap, gapMap } from "./shared";

type ColumnBreakpoints = {
  base?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
};

/**
 * Equal-column responsive grid. Unlike `MasonryGrid` (CSS multi-column, unequal
 * heights by design), every cell in a row shares the row's height, and columns
 * are `minmax(0, 1fr)` so content shrinks and wraps instead of overflowing.
 */
function columnClasses(columns: ColumnBreakpoints | number): string {
  const map = typeof columns === "number" ? { base: columns } : columns;
  const classes: string[] = [];
  for (const [bp, count] of Object.entries(map)) {
    if (count == null) continue;
    classes.push(`rui-grid--${bp}-${count}`);
  }
  return classes.join(" ");
}

type GridProps<T extends ElementType = "div"> = {
  /** A single count, or per-breakpoint counts, e.g. `{ base: 1, md: 3 }`. */
  columns?: ColumnBreakpoints | number;
  gap?: Gap;
  as?: T;
} & Omit<ComponentPropsWithRef<T>, "as" | "gap" | "columns">;

export const Grid = forwardRef<HTMLElement, GridProps>(function Grid(
  { columns = 1, gap = "r4", as: Tag = "div", className, ...props },
  ref
) {
  return (
    <Tag
      ref={ref as never}
      className={cn("rui-grid", gapMap[gap], columnClasses(columns), className)}
      {...props}
    />
  );
}) as <T extends ElementType = "div">(props: GridProps<T>) => React.JSX.Element;
