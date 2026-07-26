"use client";
import { type ComponentPropsWithRef, type ReactNode, forwardRef } from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { cn } from "../../util/style";

type SparklineVariant = "line" | "area" | "bar";

type SparklineProps = {
  values: number[];
  variant?: SparklineVariant;
  width?: number;
  height?: number;
  strokeWidth?: number;
  min?: number;
  max?: number;
  // `values` is also an SVG presentation attribute (typed `string`); omit it so
  // our `values: number[]` doesn't intersect to `never` for consumers.
} & Omit<ComponentPropsWithRef<"svg">, "children" | "values">;

/**
 * Maps each value into an SVG coordinate within the padded drawing area.
 * `pad` keeps the stroke from clipping at the top/bottom edges.
 */
function buildPoints(
  values: number[],
  width: number,
  height: number,
  pad: number,
  domainMin: number,
  domainMax: number
): Array<{ x: number; y: number }> {
  const n = values.length;
  const innerH = height - pad * 2;
  const span = domainMax - domainMin;
  const stepX = n > 1 ? width / (n - 1) : 0;

  return values.map((value, i) => {
    // Single point → centre it horizontally; otherwise spread across width.
    const x = n > 1 ? i * stepX : width / 2;
    // span === 0 (max === min) → flat centreline, avoids divide-by-zero.
    const t = span === 0 ? 0.5 : (value - domainMin) / span;
    const y = pad + (1 - t) * innerH;
    return { x, y };
  });
}

const round = (v: number) => Math.round(v * 100) / 100;

export const Sparkline = forwardRef<SVGSVGElement, SparklineProps>(function Sparkline(
  {
    values,
    variant = "line",
    width = 120,
    height = 32,
    strokeWidth = 2,
    min,
    max,
    className,
    "aria-label": ariaLabel,
    ...props
  },
  ref
) {
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = !reducedMotion;

  const n = values.length;
  const label = ariaLabel ?? `Sparkline of ${n} values`;

  let content: ReactNode = null;

  if (n > 0) {
    const pad = strokeWidth;
    const domainMin = min ?? Math.min(...values);
    const domainMax = max ?? Math.max(...values);
    const points = buildPoints(values, width, height, pad, domainMin, domainMax);

    if (variant === "bar") {
      const slot = width / n;
      const barWidth = Math.max(1, slot * 0.75);
      const gap = (slot - barWidth) / 2;
      const baseline = height - pad;

      content = points.map((p, i) => (
        <rect
          key={i}
          className="sparkline-bar"
          x={round(i * slot + gap)}
          y={round(p.y)}
          width={round(barWidth)}
          height={Math.max(0, round(baseline - p.y))}
        />
      ));
    } else if (n === 1) {
      // One value has no line to draw: `M x y` alone paints nothing, and the
      // area variant's closing path drew a triangle out of a single datum.
      // Render the datum itself (#30).
      const [point] = points;
      content = (
        <circle
          className="sparkline-point"
          cx={round(point.x)}
          cy={round(point.y)}
          r={round(strokeWidth)}
        />
      );
    } else {
      const linePath = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${round(p.x)} ${round(p.y)}`)
        .join(" ");

      content = (
        <>
          {variant === "area" && (
            <path
              className="sparkline-area"
              d={`${linePath} L ${round(width)} ${round(height)} L 0 ${round(height)} Z`}
            />
          )}
          <path
            className="sparkline-line"
            d={linePath}
            fill="none"
            strokeWidth={strokeWidth}
            pathLength={1}
          />
        </>
      );
    }
  }

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn(
        "sparkline",
        `sparkline--${variant}`,
        shouldAnimate && "sparkline--animate",
        className
      )}
      {...props}
    >
      {content}
    </svg>
  );
});
