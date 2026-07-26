import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

// `mono-font` is the css package's unlayered `font-family: var(--DEFAULT-MONO-FONT)`;
// without it Preflight's own `kbd` rule wins and the keycap ignores the theme's mono
// family. `leading-none` stops the cap's height being `--BodyText-3-line-height`
// alone — which themes move between 1.125rem and 1.75rem — so `p-r6` sets it instead.
const baseClasses =
  "mono-font inline-flex items-center justify-center text-body-3 leading-none font-semibold text-fg-secondary bg-surface-2 border border-border-default rounded-sm p-r6 min-w-[1.5em]";

type KbdProps = ComponentPropsWithRef<"kbd">;

export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd({ className, ...props }, ref) {
  return <kbd ref={ref} className={cn(baseClasses, className)} {...props} />;
});
