"use client";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
} from "react";

import { ScrollReveal } from "../animation/ScrollReveal";
import {
  blockGapMap,
  type ColumnBreakpoints,
  type ColumnClassMap,
  columnClasses,
  type Gap,
  gapMap,
} from "../layout/shared";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * The counts the grid can express. Bounded rather than `number` because every
 * count has to exist as a literal `columns-*` class Tailwind can find in this
 * file; an unbounded count silently fell back to a single column.
 */
type ColumnCount = 1 | 2 | 3 | 4;

const columnClassMap: ColumnClassMap<ColumnCount> = {
  base: { 1: "columns-1", 2: "columns-2", 3: "columns-3", 4: "columns-4" },
  sm: { 1: "sm:columns-1", 2: "sm:columns-2", 3: "sm:columns-3", 4: "sm:columns-4" },
  md: { 1: "md:columns-1", 2: "md:columns-2", 3: "md:columns-3", 4: "md:columns-4" },
  lg: { 1: "lg:columns-1", 2: "lg:columns-2", 3: "lg:columns-3", 4: "lg:columns-4" },
  xl: { 1: "xl:columns-1", 2: "xl:columns-2", 3: "xl:columns-3", 4: "xl:columns-4" },
};

type Animation = "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale";

/* ------------------------------------------------------------------ */
/*  Context (passes animate + animation to items)                      */
/* ------------------------------------------------------------------ */

type MasonryContextValue = {
  animate: boolean;
  animation: Animation;
  index: number;
  // The root owns the gap and the item spaces itself with it: multi-column has
  // no row-gap, so the block-direction half of one `gap` prop has to be applied
  // on the child. One writer, passed down — not a second source of truth.
  gap: Gap;
};

const MasonryContext = createContext<MasonryContextValue | null>(null);

function useMasonryContext() {
  return useContext(MasonryContext);
}

/* ------------------------------------------------------------------ */
/*  MasonryGrid (root)                                                 */
/* ------------------------------------------------------------------ */

type MasonryGridProps = {
  columns?: ColumnBreakpoints<ColumnCount> | ColumnCount;
  gap?: Gap;
  animate?: boolean;
  animation?: Animation;
} & ComponentPropsWithRef<"div">;

const MasonryGridRoot = forwardRef<HTMLDivElement, MasonryGridProps>(function MasonryGrid(
  {
    columns = 1,
    gap = "r4",
    animate = true,
    animation = "fade-up",
    className,
    children,
    ...props
  },
  ref
) {
  const items = Children.toArray(children);

  return (
    <div
      ref={ref}
      // `masonry-grid` carries no declarations any more — it is kept as a marker
      // so a consumer stylesheet, devtools and Astro/Rails consumers of
      // `response-ui-css` all still have one name for every masonry grid.
      className={cn(
        "masonry-grid",
        gapMap[gap],
        ...columnClasses(columns, columnClassMap),
        className
      )}
      {...props}
    >
      {items.map((child, index) => (
        // Keyed by the child's own key, not its position — keying by index made
        // React reconcile by slot and remount every item after an insertion.
        <MasonryContext.Provider
          key={isValidElement(child) ? child.key : index}
          value={{ animate, animation, index, gap }}
        >
          {child}
        </MasonryContext.Provider>
      ))}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  MasonryGrid.Item                                                   */
/* ------------------------------------------------------------------ */

type MasonryGridItemProps = ComponentPropsWithRef<"div">;

const MasonryGridItem = forwardRef<HTMLDivElement, MasonryGridItemProps>(function MasonryGridItem(
  { className, children, ...props },
  ref
) {
  const ctx = useMasonryContext();
  const animate = ctx?.animate ?? true;
  const animation = ctx?.animation ?? "fade-up";
  const index = ctx?.index ?? 0;
  const gap = ctx?.gap ?? "r4";

  // `break-inside-avoid` keeps one card from being sliced at a column boundary
  // — the item's only remaining declaration, now a utility a caller can undo.
  // `last:mb-0` is (0,1,1) and the block gap is (0,1,0), both in
  // `@layer utilities` — so the trailing-gap reset wins on specificity. It used
  // to need a rule in `MasonryGrid.css` only because that file out-ranked any
  // `mb-0` utility, first by being unlayered and now not at all; removing the
  // declaration removed the reason twice over.
  const spacing = cn("break-inside-avoid", blockGapMap[gap], "last:mb-0");

  if (!animate) {
    return (
      <div ref={ref} className={cn("masonry-grid__item", spacing, className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <ScrollReveal
      ref={ref}
      animation={animation}
      delay={index * 50}
      className={cn("masonry-grid__item", spacing, className)}
      {...props}
    >
      {children}
    </ScrollReveal>
  );
});

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const MasonryGrid = Object.assign(MasonryGridRoot, {
  Item: MasonryGridItem,
});
