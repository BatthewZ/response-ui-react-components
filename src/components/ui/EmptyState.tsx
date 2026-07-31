"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  type ElementType,
  forwardRef,
  useContext,
} from "react";

import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type Size = "sm" | "md" | "lg";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `EmptyState.css` keeps one rule and says why; everything else this component
 * draws is here.
 *
 * The size axis is a map per part rather than a variant per part. Each
 * subcomponent already reads `size` from context, so it picks its own class —
 * which is one class in the DOM instead of three `in-[[data-size=…]]:` variants
 * that would each have to be generated, and which cannot pick up an *outer*
 * empty state's size the way an ancestor-matching variant would. `data-size`
 * stays on the root as a marker for devtools and consumer stylesheets.
 *
 * `md` is spelled out rather than left as the bare base: a base declaration
 * that a sibling has to beat is the one shape that inverts when it moves into
 * `@layer utilities`, and enumerating all three sidesteps the question.
 */
const rootClasses = "flex flex-col items-center text-center";

const rootSizeClasses: Record<Size, string> = {
  sm: "p-r5 gap-r6",
  md: "p-r3 gap-r5",
  lg: "p-r2 gap-r4",
};

const iconClasses = "flex items-center justify-center text-fg-muted";

/** The glyph itself is sized in `1em` of this, by the one rule left in the CSS. */
const iconSizeClasses: Record<Size, string> = {
  sm: "text-h5",
  md: "text-h4",
  lg: "text-h3",
};

/**
 * No `m-0`: Preflight zeroes `margin` on `*`, which covers the `<p>` default
 * and every heading `as` can name (measured in the compiled output). Restating
 * it would only add a utility a caller's own `mt-*` has to out-rank.
 */
const titleClasses = "text-fg-primary font-semibold";

const titleSizeClasses: Record<Size, string> = {
  sm: "text-body-1",
  md: "text-h5",
  lg: "text-h4",
};

const descriptionClasses = "max-w-90 text-fg-muted text-body-2";

const actionsClasses = "flex items-center justify-center gap-r5 flex-wrap";

type EmptyStateContextValue = { size: Size };

const EmptyStateContext = createContext<EmptyStateContextValue | null>(null);

function useEmptyStateContext() {
  const ctx = useContext(EmptyStateContext);
  if (!ctx) throw new Error("EmptyState compound components must be used within <EmptyState>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  EmptyState (root)                                                  */
/* ------------------------------------------------------------------ */

type EmptyStateProps = {
  size?: Size;
} & ComponentPropsWithRef<"div">;

const EmptyStateRoot = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { size = "md", className, children, ...props },
  ref
) {
  return (
    <EmptyStateContext.Provider value={{ size }}>
      <div
        ref={ref}
        className={cn("empty-state", rootClasses, rootSizeClasses[size], className)}
        data-size={size}
        {...props}
      >
        {children}
      </div>
    </EmptyStateContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  EmptyState.Icon                                                    */
/* ------------------------------------------------------------------ */

type EmptyStateIconProps = ComponentPropsWithRef<"div">;

const EmptyStateIcon = forwardRef<HTMLDivElement, EmptyStateIconProps>(function EmptyStateIcon(
  { className, children, ...props },
  ref
) {
  const { size } = useEmptyStateContext();

  return (
    <div
      ref={ref}
      className={cn("empty-state__icon", iconClasses, iconSizeClasses[size], className)}
      aria-hidden="true"
      {...props}
    >
      {children}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  EmptyState.Title                                                   */
/* ------------------------------------------------------------------ */

type EmptyStateTitleProps<T extends ElementType = "p"> = {
  /**
   * Element to render. Defaults to `p`; pass a heading (`as="h2"`) when the
   * empty state replaces a page's or region's main content, so it lands in the
   * heading outline.
   */
  as?: T;
} & Omit<ComponentPropsWithRef<T>, "as">;

const EmptyStateTitle = forwardRef<HTMLElement, EmptyStateTitleProps>(function EmptyStateTitle(
  { as: Tag = "p", className, ...props },
  ref
) {
  const { size } = useEmptyStateContext();

  return (
    <Tag
      ref={ref as never}
      className={cn("empty-state__title", titleClasses, titleSizeClasses[size], className)}
      {...props}
    />
  );
}) as <T extends ElementType = "p">(props: EmptyStateTitleProps<T>) => React.JSX.Element;

/* ------------------------------------------------------------------ */
/*  EmptyState.Description                                             */
/* ------------------------------------------------------------------ */

type EmptyStateDescriptionProps = ComponentPropsWithRef<"p">;

const EmptyStateDescription = forwardRef<HTMLParagraphElement, EmptyStateDescriptionProps>(
  function EmptyStateDescription({ className, children, ...props }, ref) {
    useEmptyStateContext();

    return (
      <p ref={ref} className={cn("empty-state__description", descriptionClasses, className)} {...props}>
        {children}
      </p>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  EmptyState.Actions                                                 */
/* ------------------------------------------------------------------ */

type EmptyStateActionsProps = ComponentPropsWithRef<"div">;

const EmptyStateActions = forwardRef<HTMLDivElement, EmptyStateActionsProps>(
  function EmptyStateActions({ className, children, ...props }, ref) {
    useEmptyStateContext();

    return (
      <div ref={ref} className={cn("empty-state__actions", actionsClasses, className)} {...props}>
        {children}
      </div>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export {
  EmptyStateRoot as EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
};
