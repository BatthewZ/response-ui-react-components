"use client";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  ProgressBar (root)                                                 */
/* ------------------------------------------------------------------ */

type ProgressBarRootProps = {
  value: number;
  max?: number;
  variant?: "default" | "gradient" | "striped";
  color?: "accent" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  /**
   * Word for what `color` means, announced with the percentage. `""` drops it,
   * for a bar whose own label already says it; `accent` is silent by default
   * because it names no status.
   */
  statusLabel?: string;
} & Omit<ComponentPropsWithRef<"div">, "children">;

type ProgressBarSize = NonNullable<ProgressBarRootProps["size"]>;
type ProgressBarColor = NonNullable<ProgressBarRootProps["color"]>;
type ProgressBarVariant = NonNullable<ProgressBarRootProps["variant"]>;

const sizeClass: Record<ProgressBarSize, string> = {
  sm: "progress-bar--sm",
  md: "progress-bar--md",
  lg: "progress-bar--lg",
};

const colorClass: Record<ProgressBarColor, string> = {
  accent: "progress-bar__fill--accent",
  success: "progress-bar__fill--success",
  warning: "progress-bar__fill--warning",
  error: "progress-bar__fill--error",
};

const statusLabelMap: Record<ProgressBarColor, string | undefined> = {
  accent: undefined,
  success: "Success",
  warning: "Warning",
  error: "Error",
};

const variantFillClass: Record<ProgressBarVariant, string | undefined> = {
  default: undefined,
  gradient: "progress-bar__fill--gradient",
  striped: "progress-bar__fill--striped",
};

const ProgressBarRoot = forwardRef<HTMLDivElement, ProgressBarRootProps>(function ProgressBar(
  {
    value,
    max = 100,
    variant = "default",
    color = "accent",
    size = "md",
    animate = true,
    statusLabel,
    className,
    ...props
  },
  ref
) {
  const reducedMotion = usePrefersReducedMotion();
  // A `max` that describes no range (0, negative, NaN) cannot be announced: it
  // would put `aria-valuemin` at or above `aria-valuemax`. ARIA's answer is an
  // indeterminate progressbar, which omits the three range attributes entirely.
  const hasRange = Number.isFinite(max) && max > 0;
  // `NaN` must not reach the style: the CSSOM rejects `width: NaN%`, the fill
  // falls back to `width: auto` and a broken value renders as a *full* bar.
  const safeValue = Number.isFinite(value) ? value : 0;
  const clamped = hasRange ? Math.min(max, Math.max(0, safeValue)) : 0;
  const percentage = hasRange ? (clamped / max) * 100 : 0;
  const shouldAnimate = animate && !reducedMotion;
  // `color` is otherwise a hue and nothing else. The word rides `aria-valuetext`
  // rather than a hidden child because `role="progressbar"` makes its children
  // presentational — text inside it never reaches AT — and it carries the
  // percentage too, since `aria-valuetext` replaces the value announcement.
  const statusText = statusLabel ?? statusLabelMap[color];
  const valueText = statusText
    ? hasRange
      ? `${Math.round(percentage)}%, ${statusText}`
      : statusText
    : undefined;

  return (
    <div
      ref={ref}
      role="progressbar"
      // The announcement tracks the fill: an unclamped `aria-valuenow` could sit
      // outside the range it is announced against.
      aria-valuenow={hasRange ? clamped : undefined}
      aria-valuemin={hasRange ? 0 : undefined}
      aria-valuemax={hasRange ? max : undefined}
      aria-valuetext={valueText}
      className={cn("progress-bar", sizeClass[size], className)}
      {...props}
    >
      <div
        className={cn(
          "progress-bar__fill",
          colorClass[color],
          variantFillClass[variant],
          !shouldAnimate && "progress-bar__fill--no-animate"
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  ProgressBar.Label                                                  */
/* ------------------------------------------------------------------ */

type ProgressBarLabelProps = ComponentPropsWithRef<"span">;

const ProgressBarLabel = forwardRef<HTMLSpanElement, ProgressBarLabelProps>(
  function ProgressBarLabel({ className, ...props }, ref) {
    return <span ref={ref} className={cn("progress-bar__label", className)} {...props} />;
  }
);

/* ------------------------------------------------------------------ */
/*  ProgressBar.Value                                                  */
/* ------------------------------------------------------------------ */

type ProgressBarValueProps = ComponentPropsWithRef<"span">;

const ProgressBarValue = forwardRef<HTMLSpanElement, ProgressBarValueProps>(
  function ProgressBarValue({ className, ...props }, ref) {
    return <span ref={ref} className={cn("progress-bar__value", className)} {...props} />;
  }
);

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const ProgressBar = Object.assign(ProgressBarRoot, {
  Label: ProgressBarLabel,
  Value: ProgressBarValue,
});
