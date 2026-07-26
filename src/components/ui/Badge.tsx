import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

type Variant = "default" | "success" | "warning" | "error" | "info";

const baseClasses = "inline-flex items-center rounded-sm px-r5 py-r6 text-body-3 font-semibold";

const variantClassMap: Record<Variant, string> = {
  default: "bg-surface-2 text-fg-secondary",
  success: "bg-status-success-bg text-status-success",
  warning: "bg-status-warning-bg text-status-warning",
  error: "bg-status-error-bg text-status-error",
  info: "bg-status-info-bg text-status-info",
};

/**
 * Read ahead of the children; the tint is the only other variant channel.
 * `default` carries no state to name, so it stays silent unless asked.
 */
const statusLabelMap: Record<Variant, string | undefined> = {
  default: undefined,
  success: "Success",
  warning: "Warning",
  error: "Error",
  info: "Information",
};

type BadgeProps = {
  variant?: Variant;
  /**
   * Visually-hidden variant word, read ahead of the children. `""` drops it,
   * for a label that already names the state.
   */
  statusLabel?: string;
} & ComponentPropsWithRef<"span">;

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = "default", statusLabel, className, children, ...props },
  ref
) {
  const statusText = statusLabel ?? statusLabelMap[variant];

  return (
    <span ref={ref} className={cn(baseClasses, variantClassMap[variant], className)} {...props}>
      {statusText && <span className="sr-only">{statusText}</span>}
      {children}
    </span>
  );
});
