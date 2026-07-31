"use client";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { cn, type SlotClassNames } from "../../util/style";

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
  /**
   * Class overrides for the internals this component renders. `className` is the
   * positioned box; these reach the `<svg>`, its two circles and the centre
   * region `children` sits in.
   *
   * The arc's *colour* is the `color` prop, and its geometry is computed from
   * `value`/`size`/`thickness` into `stroke-dasharray` — so a class on
   * `indicator` changes the stroke's appearance, never the fraction it draws.
   */
  classNames?: SlotClassNames<"svg" | "track" | "indicator" | "center">;
} & Omit<ComponentPropsWithRef<"div">, "children">;

type ProgressRingColor = NonNullable<ProgressRingProps["color"]>;

/**
 * `ProgressRing.css` is gone; everything this component draws is here. Each
 * BEM name survives as a declaration-free marker (AGENTS.md §"Class names
 * outlive their declarations") beside the utility that now paints it.
 *
 * `stroke-*` resolves through the same `--color-*` namespace as `bg-*`, so a
 * theme re-pointing `--C-ACCENT` still reaches the arc.
 */
const colorClass: Record<ProgressRingColor, string> = {
  accent: "progress-ring__indicator--accent stroke-accent",
  success: "progress-ring__indicator--success stroke-status-success",
  warning: "progress-ring__indicator--warning stroke-status-warning",
  error: "progress-ring__indicator--error stroke-status-error",
};

/**
 * `--MOTION-*` is in no Tailwind namespace, so the shift tokens are read as
 * custom properties — `ease-shift` generates nothing. The bracket spelling is
 * the package idiom and the one `verify:component-docs` resolves to a token.
 *
 * `motion-reduce:` replaces the stylesheet's `@media (prefers-reduced-motion)`
 * block; the `--no-animate` marker below is the JS-side twin and both convert
 * together. Converting only the base would have put `transition-…` in
 * `@layer utilities` and left the modifier that must beat it in
 * `@layer components` — the Skeleton inversion (AGENTS.md "The test", Q3).
 */
const indicatorTransitionClasses =
  "transition-[stroke-dashoffset] duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none";

export const ProgressRing = forwardRef<HTMLDivElement, ProgressRingProps>(function ProgressRing(
  {
    value,
    max = 100,
    size = 64,
    thickness = 6,
    color = "accent",
    children,
    className,
    classNames,
    ...props
  },
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
      className={cn("progress-ring inline-flex", className)}
      // `position`/`width`/`height` stay INLINE, and no class here changes that:
      // `size` is a number prop, and an inline declaration beats every class at
      // every layer. Converting the stylesheet did not close that gap — it is a
      // different defect with a different fix (AGENTS.md, "Three things a
      // `className` still cannot beat").
      style={{ position: "relative", width: size, height: size }}
      {...props}
    >
      <svg
        className={cn("progress-ring__svg block", classNames?.svg)}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          // Rung 3, the deepest recession, shared by every track in the system
          // (ProgressBar, Meter, Slider).
          className={cn("progress-ring__track stroke-surface-3", classNames?.track)}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={thickness}
        />
        <circle
          className={cn(
            "progress-ring__indicator",
            indicatorTransitionClasses,
            colorClass[color],
            reducedMotion && "progress-ring__indicator--no-animate transition-none",
            classNames?.indicator
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
      <div
        className={cn(
          "progress-ring__slot absolute inset-0 flex items-center justify-center",
          classNames?.center
        )}
      >
        {children}
      </div>
    </div>
  );
});
