import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

type MeterStatus = "ok" | "warning" | "critical";

export type MeterProps = {
  value: number;
  min?: number;
  max?: number;
  segments?: number;
  warningAt?: number;
  criticalAt?: number;
  "aria-label": string;
} & Omit<ComponentPropsWithRef<"div">, "children">;

const clamp = (n: number, lower: number, upper: number) =>
  Math.min(upper, Math.max(lower, n));

const filledColor: Record<MeterStatus, string> = {
  ok: "bg-accent",
  warning: "bg-status-warning",
  critical: "bg-status-error",
};

/**
 * Meter — a segmented capacity meter.
 *
 * Semantically distinct from {@link ProgressBar}: a meter reports a measurement
 * within a known range (e.g. disk usage), so it renders `role="meter"` rather
 * than `role="progressbar"`. The whole filled run takes a single semantic color
 * determined by the threshold the value has crossed.
 */
export const Meter = forwardRef<HTMLDivElement, MeterProps>(function Meter(
  {
    value,
    min = 0,
    max = 100,
    segments = 10,
    warningAt,
    criticalAt,
    className,
    style,
    "aria-label": ariaLabel,
    ...props
  },
  ref
) {
  const range = max - min;
  const fraction = range <= 0 ? 0 : clamp((value - min) / range, 0, 1);
  // The announcement has to sit inside the range it is announced against — an
  // out-of-range `value` fills no further, so it must not read further either.
  const announced = clamp(value, min, Math.max(min, max));

  let filled = Math.round(fraction * segments);
  // Off-by-one guards: a value above the floor shows at least one segment, and
  // a value below the ceiling never paints every segment (so a non-full meter
  // never *looks* full).
  if (value > min && filled < 1) filled = 1;
  if (value < max && filled >= segments) filled = segments - 1;
  filled = clamp(filled, 0, segments);

  const status: MeterStatus =
    criticalAt !== undefined && value >= criticalAt
      ? "critical"
      : warningAt !== undefined && value >= warningAt
        ? "warning"
        : "ok";

  return (
    <div
      ref={ref}
      role="meter"
      aria-valuenow={announced}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={ariaLabel}
      data-status={status}
      className={cn("grid gap-r6", className)}
      style={{ ...style, gridTemplateColumns: `repeat(${segments}, 1fr)` }}
      {...props}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "h-r3 rounded-sm",
            i < filled ? filledColor[status] : "bg-surface-2"
          )}
        />
      ))}
    </div>
  );
});
