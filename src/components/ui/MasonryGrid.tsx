"use client";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  type CSSProperties,
  forwardRef,
  isValidElement,
  useContext,
} from "react";

import { ScrollReveal } from "../animation/ScrollReveal";
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
  gap?: string;
  animate?: boolean;
  animation?: Animation;
} & ComponentPropsWithRef<"div">;

const MasonryGridRoot = forwardRef<HTMLDivElement, MasonryGridProps>(function MasonryGrid(
  { columns = 1, gap, animate = true, animation = "fade-up", className, style, children, ...props },
  ref
) {
  const resolved: ColumnBreakpoints = typeof columns === "number" ? { base: columns } : columns;

  const responsiveClasses = buildResponsiveClasses(resolved);

  const vars: CSSProperties & Record<string, string | number> = {};
  if (gap) {
    vars["--masonry-gap"] = gap;
  }

  const items = Children.toArray(children);

  return (
    <div
      ref={ref}
      className={cn("masonry-grid", ...responsiveClasses, className)}
      // `vars` last: an explicit `gap` prop outranks a `--masonry-gap` that
      // happens to be sitting in the caller's `style` bag.
      style={{ ...style, ...vars } as CSSProperties}
      {...props}
    >
      {items.map((child, index) => (
        // Keyed by the child's own key, not its position — keying by index made
        // React reconcile by slot and remount every item after an insertion.
        <MasonryContext.Provider
          key={isValidElement(child) ? child.key : index}
          value={{ animate, animation, index }}
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

  if (!animate) {
    return (
      <div ref={ref} className={cn("masonry-grid__item", className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <ScrollReveal
      ref={ref}
      animation={animation}
      delay={index * 50}
      className={cn("masonry-grid__item", className)}
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
