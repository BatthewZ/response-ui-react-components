import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

const baseClasses =
  "inline-flex items-center justify-center text-body-3 font-medium text-fg-secondary bg-surface-2 border border-border-default rounded-sm px-r6 min-w-[1.5em]";

type KbdProps = ComponentPropsWithRef<"kbd">;

export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd({ className, ...props }, ref) {
  return <kbd ref={ref} className={cn(baseClasses, className)} {...props} />;
});
