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
 * Maps a value onto the vertical axis of the padded drawing area.
 * `pad` keeps the stroke from clipping at the top/bottom edges.
 */
function makeProjectY(height: number, pad: number, domainMin: number, domainMax: number) {
  const innerH = height - pad * 2;
  const span = domainMax - domainMin;

  return (value: number) => {
    // span === 0 (max === min) → flat centreline, avoids divide-by-zero.
    const t = span === 0 ? 0.5 : (value - domainMin) / span;
    return pad + (1 - t) * innerH;
  };
}

function buildPoints(
  values: number[],
  width: number,
  projectY: (value: number) => number
): Array<{ x: number; y: number }> {
  const n = values.length;
  const stepX = n > 1 ? width / (n - 1) : 0;

  return values.map((value, i) => ({
    // Single point → centre it horizontally; otherwise spread across width.
    x: n > 1 ? i * stepX : width / 2,
    y: projectY(value),
  }));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Fallback accessible name (#29). The old default counted the series —
 * "Sparkline of 7 values" — which tells a screen-reader user nothing a sighted
 * one can see. This states the shape instead: where the series starts and ends,
 * which way it went, and the extremes it reached. Still English and still a
 * fallback: `aria-label` overrides it, `aria-labelledby` replaces it, and
 * `aria-hidden` removes the graphic from the tree entirely. A caller who knows
 * what the numbers *mean* should always say so themselves.
 */
function describeSeries(values: number[]): string {
  const n = values.length;
  if (n === 0) return "Sparkline: no data";
  if (n === 1) return `Sparkline: one value, ${values[0]}`;
  const first = values[0];
  const last = values[n - 1];
  const direction = last > first ? "rising" : last < first ? "falling" : "level";
  return `Sparkline: ${n} values, ${first} to ${last}, ${direction}, low ${Math.min(
    ...values
  )}, high ${Math.max(...values)}`;
}

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

  // #29. `role="img"` used to be unconditional, so the one thing a caller
  // actually wants for a chart that repeats a number printed beside it — to get
  // it out of the accessibility tree — took `role="presentation"` *and* still
  // left a stray `aria-label` on the element. `aria-hidden` is now the
  // decorative mode: no role, no name, nothing to announce. An explicit `role`
  // still wins outright, because it rides the rest spread below.
  const decorative =
    props["aria-hidden"] === true || String(props["aria-hidden"]) === "true";
  // A caller naming it from another element does not also want a generated name
  // sitting under it; `aria-labelledby` would win the computation anyway.
  const labelled = props["aria-labelledby"] != null;
  const label = decorative || labelled ? undefined : (ariaLabel ?? describeSeries(values));

  let content: ReactNode = null;

  if (n > 0) {
    const pad = strokeWidth;
    // A bar's *length* encodes magnitude, so its domain has to contain zero.
    // Anchored at the data minimum instead, the smallest datum always rendered
    // as a zero-height — invisible — rect, and a near-flat series (uptime at
    // 99.8–100%) was stretched into full-scale swings. Line/area encode
    // position rather than magnitude, so they still scale to the data.
    const zeroAnchored = variant === "bar";
    const domainMin = min ?? (zeroAnchored ? Math.min(0, ...values) : Math.min(...values));
    const domainMax = max ?? (zeroAnchored ? Math.max(0, ...values) : Math.max(...values));
    const projectY = makeProjectY(height, pad, domainMin, domainMax);
    const points = buildPoints(values, width, projectY);

    if (variant === "bar") {
      const slot = width / n;
      const barWidth = Math.max(1, slot * 0.75);
      const gap = (slot - barWidth) / 2;
      // Bars grow from the zero line, which is clamped into the drawing area so
      // an explicit domain that excludes zero (`min={99.5}`) still gets a
      // baseline at the floor rather than one off-canvas. Negative values hang
      // below it.
      const baseline = clamp(projectY(0), pad, height - pad);

      content = points.map((p, i) => (
        <rect
          key={i}
          className="sparkline-bar"
          x={round(i * slot + gap)}
          y={round(Math.min(p.y, baseline))}
          width={round(barWidth)}
          height={round(Math.abs(baseline - p.y))}
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
            // Closes on the floor of the drawing area, not the viewBox: filling
            // to `height` painted into the gutter `pad` reserves, putting the
            // area's baseline `strokeWidth` below every other variant's.
            <path
              className="sparkline-area"
              d={`${linePath} L ${round(width)} ${round(height - pad)} L 0 ${round(height - pad)} Z`}
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
      role={decorative ? undefined : "img"}
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
