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
import { blockGapMap, type Gap, gapMap } from "../layout/shared";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * The counts `MasonryGrid.css` actually defines a rule for. Typed rather than
 * `number` because an undefined count silently fell back to a single column.
 */
type ColumnCount = 1 | 2 | 3 | 4;

type ColumnBreakpoints = {
  base?: ColumnCount;
  sm?: ColumnCount;
  md?: ColumnCount;
  lg?: ColumnCount;
  xl?: ColumnCount;
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildResponsiveClasses(columns: ColumnBreakpoints): string[] {
  const classes: string[] = [];
  for (const [bp, count] of Object.entries(columns)) {
    // `1` is a real answer at a breakpoint — skipping it meant a key could widen
    // the grid but never narrow it back to a single column.
    if (count == null) continue;
    classes.push(`masonry-grid--${bp}-${count}`);
  }
  return classes;
}

/* ------------------------------------------------------------------ */
/*  MasonryGrid (root)                                                 */
/* ------------------------------------------------------------------ */

type MasonryGridProps = {
  columns?: ColumnBreakpoints | ColumnCount;
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
  const resolved: ColumnBreakpoints = typeof columns === "number" ? { base: columns } : columns;

  const responsiveClasses = buildResponsiveClasses(resolved);

  const items = Children.toArray(children);

  return (
    <div
      ref={ref}
      className={cn("masonry-grid", gapMap[gap], ...responsiveClasses, className)}
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

  // `last:mb-0` is (0,1,1) and the block gap is (0,1,0), both in
  // `@layer utilities` — so the trailing-gap reset wins on specificity. It used
  // to need a rule in `MasonryGrid.css` only because that file out-ranked any
  // `mb-0` utility, first by being unlayered and now not at all; removing the
  // declaration removed the reason twice over.
  const spacing = cn(blockGapMap[gap], "last:mb-0");

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
