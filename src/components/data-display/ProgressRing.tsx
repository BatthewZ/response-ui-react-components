import { type ComponentPropsWithRef, forwardRef } from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  ProgressRing                                                       */
/* ------------------------------------------------------------------ */

type ProgressRingProps = {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  color?: "accent" | "success" | "warning" | "error";
  children?: React.ReactNode;
} & Omit<ComponentPropsWithRef<"div">, "children">;

type ProgressRingColor = NonNullable<ProgressRingProps["color"]>;

const colorClass: Record<ProgressRingColor, string> = {
  accent: "progress-ring__indicator--accent",
  success: "progress-ring__indicator--success",
  warning: "progress-ring__indicator--warning",
  error: "progress-ring__indicator--error",
};

export const ProgressRing = forwardRef<HTMLDivElement, ProgressRingProps>(function ProgressRing(
  { value, max = 100, size = 64, thickness = 6, color = "accent", children, className, ...props },
  ref
) {
  const reducedMotion = usePrefersReducedMotion();

  const clampedValue = Math.min(max, Math.max(0, value));
  const fraction = max <= 0 ? 0 : Math.min(1, Math.max(0, clampedValue / max));

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - fraction);
  const center = size / 2;

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("progress-ring", className)}
      style={{ position: "relative", width: size, height: size }}
      {...props}
    >
      <svg className="progress-ring__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="progress-ring__track"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={thickness}
        />
        <circle
          className={cn(
            "progress-ring__indicator",
            colorClass[color],
            reducedMotion && "progress-ring__indicator--no-animate"
          )}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="progress-ring__slot">{children}</div>
    </div>
  );
});
