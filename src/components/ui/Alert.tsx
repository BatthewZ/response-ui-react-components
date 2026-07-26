import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

type Variant = "success" | "warning" | "error" | "info";

const baseClasses = "flex gap-r5 rounded-md p-r4 text-body-2";

const variantClassMap: Record<Variant, string> = {
  success: "bg-status-success-bg text-status-success border border-status-success/20",
  warning: "bg-status-warning-bg text-status-warning border border-status-warning/20",
  error: "bg-status-error-bg text-status-error border border-status-error/20",
  info: "bg-status-info-bg text-status-info border border-status-info/20",
};

/**
 * `role="alert"` carries an implicit `aria-live="assertive"`, so pairing it
 * with `polite` was a contradiction the browser resolved in favour of the
 * explicit attribute — every variant, including `error`, announced politely.
 * Politeness follows severity instead, on the same table `Toast` uses.
 */
const ariaMap: Record<
  Variant,
  { role: "status" | "alert"; "aria-live": "polite" | "assertive" }
> = {
  success: { role: "status", "aria-live": "polite" },
  warning: { role: "status", "aria-live": "polite" },
  info: { role: "status", "aria-live": "polite" },
  error: { role: "alert", "aria-live": "assertive" },
};

type AlertProps = {
  variant?: Variant;
} & ComponentPropsWithRef<"div">;

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { variant = "info", className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(baseClasses, variantClassMap[variant], className)}
      {...ariaMap[variant]}
      {...props}
    />
  );
});
