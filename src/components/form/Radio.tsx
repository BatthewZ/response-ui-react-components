import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

type RadioProps = Omit<ComponentPropsWithRef<"input">, "type">;

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="radio"
      className={cn(
        // Same recipe as Checkbox, one file over: the outline reset needs a
        // replacement or a keyboard user gets no focus affordance at all.
        "size-4 accent-accent focus:outline-none",
        "focus:ring-2 focus:ring-border-focus focus:ring-offset-2",
        className
      )}
      {...props}
    />
  );
});
