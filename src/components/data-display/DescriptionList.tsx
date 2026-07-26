import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  DescriptionList (root)                                             */
/* ------------------------------------------------------------------ */

type Layout = "horizontal" | "vertical";

type DescriptionListProps = {
  layout?: Layout;
} & ComponentPropsWithRef<"dl">;

// Horizontal pins each element type to its column instead of letting the grid
// auto-flow fill left-to-right: a term's SECOND detail used to land in the
// label column and shift every pair after it (#7). Pinned, it stacks under the
// first value where it belongs. Static strings, so Tailwind's scanner sees the
// arbitrary variants.
const layoutClass: Record<Layout, string> = {
  horizontal:
    "grid grid-cols-[max-content_1fr] gap-x-r3 gap-y-r5 [&>dt]:col-start-1 [&>dd]:col-start-2",
  vertical: "flex flex-col gap-r5",
};

const DescriptionListRoot = forwardRef<HTMLDListElement, DescriptionListProps>(
  function DescriptionList({ layout = "horizontal", className, ...props }, ref) {
    return (
      <dl ref={ref} className={cn(layoutClass[layout], className)} {...props} />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  DescriptionList.Term                                              */
/* ------------------------------------------------------------------ */

type TermProps = ComponentPropsWithRef<"dt">;

const Term = forwardRef<HTMLElement, TermProps>(function Term(
  { className, ...props },
  ref
) {
  return (
    <dt
      ref={ref}
      className={cn("text-body-3 font-semibold text-fg-secondary", className)}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/*  DescriptionList.Detail                                            */
/* ------------------------------------------------------------------ */

type DetailProps = ComponentPropsWithRef<"dd">;

const Detail = forwardRef<HTMLElement, DetailProps>(function Detail(
  { className, ...props },
  ref
) {
  return (
    <dd
      ref={ref}
      className={cn("m-0 text-body-2 text-fg-primary", className)}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const DescriptionList = Object.assign(DescriptionListRoot, {
  Term,
  Detail,
});
