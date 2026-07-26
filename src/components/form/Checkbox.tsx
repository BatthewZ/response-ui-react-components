import { type ComponentPropsWithRef, forwardRef } from "react";

import { focusRingControl } from "../../util/focus";
import { cn } from "../../util/style";

type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type">;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "size-4 rounded-sm border border-border-strong accent-accent",
        focusRingControl,
        className
      )}
      {...props}
    />
  );
});
