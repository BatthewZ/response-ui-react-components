import { type ComponentPropsWithRef, forwardRef, type ReactNode } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";

import { cn } from "../../util/style";

type Variant = "default" | "success" | "warning" | "error" | "info";

// `leading-none` because `text-body-3` also emits `--BodyText-3-line-height` (1.75rem
// on the default scale, against a 0.75rem font), which made the chip 2.25rem tall. The
// height is `py-r6` now.
// `gap-r6` is what stops the status glyph sitting flush against the label; it is
// inert on a chip whose only child is its text.
const baseClasses =
  "inline-flex items-center gap-r6 rounded-sm px-r5 py-r6 text-body-3 leading-none font-semibold";

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

/**
 * The variant's *visible* channel, and the twin of `statusLabelMap` above.
 * Decorative on purpose: the hidden word already names the variant, so a glyph
 * with a name of its own would be read twice. `size={12}` is the chip's own
 * scale — `text-body-3` is 0.75rem — and `currentColor` is the variant ink, so
 * the glyph adds no colour pairing the label was not already using. `default`
 * stays iconless for the same reason it stays wordless: it names no state.
 */
const statusIconMap: Record<Variant, ReactNode> = {
  default: undefined,
  success: (
    <CircleCheck
      size={12}
      aria-hidden="true"
      // slot:(a) default *content*, not an element the component owns —
      // `statusIcon` replaces the whole node, so a class route here would style
      // something the caller may have swapped out. `shrink-0` is what stops the
      // glyph collapsing beside a long label.
      className="shrink-0"
    />
  ),
  warning: (
    <TriangleAlert
      size={12}
      aria-hidden="true"
      // slot:(a) as `success` above — replaceable content, and `shrink-0` is the
      // flex guard that keeps the glyph its own size beside a long label.
      className="shrink-0"
    />
  ),
  error: (
    <CircleX
      size={12}
      aria-hidden="true"
      // slot:(a) as `success` above — replaceable content, and `shrink-0` is the
      // flex guard that keeps the glyph its own size beside a long label.
      className="shrink-0"
    />
  ),
  info: (
    <Info
      size={12}
      aria-hidden="true"
      // slot:(a) as `success` above — replaceable content, and `shrink-0` is the
      // flex guard that keeps the glyph its own size beside a long label.
      className="shrink-0"
    />
  ),
};

type BadgeProps = {
  variant?: Variant;
  /**
   * Visually-hidden variant word, read ahead of the children. `""` drops it,
   * for a label that already names the state.
   */
  statusLabel?: string;
  /**
   * Decorative glyph for the variant, drawn before the children. `null` drops
   * it — the `statusLabel=""` of the visual channel. Anything you pass here
   * must be `aria-hidden`, or the variant is announced twice.
   */
  statusIcon?: ReactNode;
} & ComponentPropsWithRef<"span">;

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = "default", statusLabel, statusIcon, className, children, ...props },
  ref
) {
  const statusText = statusLabel ?? statusLabelMap[variant];
  // Not `??`: `null` is this prop's remover, and `??` would treat it as absent
  // and restore the default — the mirror of `statusLabel=""` surviving `??`.
  const icon = statusIcon === undefined ? statusIconMap[variant] : statusIcon;

  return (
    <span ref={ref} className={cn(baseClasses, variantClassMap[variant], className)} {...props}>
      {statusText && (
        <span
          // slot:(a) the variant word, read ahead of the children. `sr-only` is
          // the whole mechanism — a route here lets a caller drop it and print
          // "Success" beside the label. `statusLabel=""` is the supported remover.
          className="sr-only"
        >
          {statusText}
        </span>
      )}
      {icon}
      {children}
    </span>
  );
});
