import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

type FormActionsProps = ComponentPropsWithRef<"div">;

export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(function FormActions(
  { className, ...props },
  ref
) {
  return (
    // `shrink-0` matters only where this row is itself a flex item — a Dialog
    // panel, most often, whose body scrolls beside it. A shortfall there is
    // distributed across every item, so without this the button row is squeezed
    // by the content above it instead of the content scrolling. In normal flow,
    // which is everywhere else this is used, it declares nothing.
    <div
      ref={ref}
      className={cn("flex shrink-0 flex-row justify-end gap-r5 pt-r4", className)}
      {...props}
    />
  );
});
