import { type ComponentPropsWithRef, forwardRef } from "react";

import { focusRingControl } from "../../util/focus";
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
      className={cn("size-4 accent-accent", focusRingControl, className)}
      {...props}
    />
  );
});
