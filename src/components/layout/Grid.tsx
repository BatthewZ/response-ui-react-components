import { type ComponentPropsWithRef, type ElementType, forwardRef } from "react";

import { cn } from "../../util/style";

import {
  type ColumnBreakpoints,
  type ColumnClassMap,
  columnClasses,
  type Gap,
  gapMap,
} from "./shared";

/**
 * The counts the grid can express. Bounded rather than `number` because every
 * count has to exist as a literal `grid-cols-*` class Tailwind can find in this
 * file; `columns={7}` used to emit a class no rule defined and fall back to one
 * column with no error.
 */
type GridColumnCount = 1 | 2 | 3 | 4 | 5 | 6;

const columnClassMap: ColumnClassMap<GridColumnCount> = {
  base: {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  },
  sm: {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
    5: "sm:grid-cols-5",
    6: "sm:grid-cols-6",
  },
  md: {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
  },
  lg: {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
  },
  xl: {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
    5: "xl:grid-cols-5",
    6: "xl:grid-cols-6",
  },
};

type GridProps<T extends ElementType = "div"> = {
  /** A single count, or per-breakpoint counts, e.g. `{ base: 1, md: 3 }`. 1–6. */
  columns?: ColumnBreakpoints<GridColumnCount> | GridColumnCount;
  gap?: Gap;
  as?: T;
} & Omit<ComponentPropsWithRef<T>, "as" | "gap" | "columns">;

/**
 * Equal-column responsive grid. Unlike `MasonryGrid` (CSS multi-column, unequal
 * heights by design), every cell in a row shares the row's height, and columns
 * are `minmax(0, 1fr)` so content shrinks and wraps instead of overflowing.
 */
export const Grid = forwardRef<HTMLElement, GridProps>(function Grid(
  { columns = 1, gap = "r4", as: Tag = "div", className, ...props },
  ref
) {
  return (
    <Tag
      ref={ref as never}
      // `rui-grid` carries no declarations any more — it is kept as a marker so
      // a consumer stylesheet, devtools and Astro/Rails consumers of
      // `response-ui-css` all still have one name for every grid.
      // `items-stretch`: every cell shares its row's height, the point of a
      // uniform grid. `grid-cols-*` is `repeat(n, minmax(0, 1fr))`, so a long
      // word wraps instead of overflowing the cell.
      className={cn(
        "rui-grid grid items-stretch",
        gapMap[gap],
        ...columnClasses(columns, columnClassMap),
        className
      )}
      {...props}
    />
  );
}) as <T extends ElementType = "div">(props: GridProps<T>) => React.JSX.Element;
