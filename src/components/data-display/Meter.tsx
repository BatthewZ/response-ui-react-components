import { type ComponentPropsWithRef, forwardRef, type ReactNode } from "react";
import { CircleX, TriangleAlert } from "lucide-react";

import { cn } from "../../util/style";

type MeterStatus = "ok" | "warning" | "critical";

export type MeterProps = {
  value: number;
  min?: number;
  max?: number;
  segments?: number;
  warningAt?: number;
  criticalAt?: number;
  /**
   * Words for the threshold the value has crossed, appended to `aria-label`.
   * Merged over the defaults, so `{ critical: "Kritisch" }` translates one and
   * `{ critical: "" }` drops it. `ok` is silent by default — it is the absence
   * of a threshold rather than a state to announce.
   */
  statusLabels?: Partial<Record<MeterStatus, string>>;
  /**
   * Decorative glyph for the threshold the value has crossed, drawn after the
   * last segment. The twin of `statusLabels`: merged over the defaults, so
   * `{ critical: <Skull /> }` replaces one and `{ critical: null }` drops it.
   * `ok` is iconless by default, as it is wordless.
   */
  statusIcons?: Partial<Record<MeterStatus, ReactNode>>;
  "aria-label": string;
} & Omit<ComponentPropsWithRef<"div">, "children">;

const clamp = (n: number, lower: number, upper: number) =>
  Math.min(upper, Math.max(lower, n));

const filledColor: Record<MeterStatus, string> = {
  ok: "bg-accent",
  warning: "bg-status-warning",
  critical: "bg-status-error",
};

const defaultStatusLabels: Partial<Record<MeterStatus, string>> = {
  warning: "Warning",
  critical: "Critical",
};

/**
 * The threshold's *visible* channel, and the twin of `defaultStatusLabels`.
 * It sits inside `role="meter"`, whose children ARIA makes presentational — so
 * the glyph is painted and never announced, which is what is wanted here: the
 * word is already in the accessible name and a second channel would double it.
 * `currentColor` would be the inherited body ink rather than the status, so the
 * fill token is named outright; that is the same ink the filled segments
 * already paint, so no new colour pairing is introduced.
 */
const defaultStatusIcons: Partial<Record<MeterStatus, ReactNode>> = {
  warning: (
    <TriangleAlert
      size={16}
      aria-hidden="true"
      // slot:(a) default *content*, not an element the component owns —
      // `statusIcons.warning` replaces the whole node, so a class route here
      // would style something the caller may have swapped out. The ink is the
      // threshold's own status token, which is what a replacement has to carry
      // for the glyph to keep matching the segments it sits after.
      className="self-center text-status-warning"
    />
  ),
  critical: (
    <CircleX
      size={16}
      aria-hidden="true"
      // slot:(a) as `warning` above — replaced through `statusIcons.critical`,
      // never restyled through a class.
      className="self-center text-status-error"
    />
  ),
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
    statusLabels,
    statusIcons,
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

  // The status word joins the name rather than a hidden child: `role="meter"`
  // makes its children presentational, so text inside it never reaches AT.
  const statusText = { ...defaultStatusLabels, ...statusLabels }[status];
  const accessibleName = [ariaLabel, statusText].filter(Boolean).join(", ");
  const statusIcon = { ...defaultStatusIcons, ...statusIcons }[status];
  // The glyph takes a track of its own rather than a segment's: a meter with an
  // extra grid item and no extra column wraps onto a second row.
  const gridTemplateColumns = statusIcon
    ? `repeat(${segments}, 1fr) auto`
    : `repeat(${segments}, 1fr)`;

  return (
    <div
      ref={ref}
      role="meter"
      aria-valuenow={announced}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={accessibleName}
      data-status={status}
      className={cn("grid gap-r6", className)}
      style={{ ...style, gridTemplateColumns }}
      {...props}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          // slot:(a) one of `segments` identical spans, and the class *is* the
          // reading: which of them carry `filledColor[status]` and which carry
          // `bg-surface-3` is the only channel saying how full the meter is. A
          // key here lands on every segment alike, so a caller passing their own
          // `bg-*` collapses filled and unfilled to one colour and the meter
          // stops reporting. The grid the segments sit in is the root, which
          // `className` reaches.
          className={cn(
            "h-r3 rounded-sm",
            i < filled ? filledColor[status] : "bg-surface-3"
          )}
        />
      ))}
      {statusIcon}
    </div>
  );
});
