"use client";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  ProgressBar (root)                                                 */
/* ------------------------------------------------------------------ */

/**
 * Where the bar's accessible name comes from. It has no text of its own, and
 * `ProgressBar.Label` cannot supply one: the root omits `children`, so the label
 * is the bar's *sibling* and no context can join the two. So the type asks for
 * the association instead — one of the three routes the docs already describe:
 * a literal name, an IDREF at a `ProgressBar.Label` you gave an `id`, or
 * `aria-hidden` for a bar that is pure decoration. `Meter` requires `aria-label`
 * outright; a bar differs only in also shipping a label sub-part to point at.
 */
// Arm order is the error message: TypeScript reports the last member, so the
// route most callers want is the one it names.
type ProgressBarNameProps =
  | { "aria-hidden": true | "true" }
  | { "aria-labelledby": string }
  | { "aria-label": string };

type ProgressBarOwnProps = {
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
  /**
   * Class overrides for the internals this component renders. `className` is the
   * track, and `.Label`/`.Value` are the bar's siblings with their own
   * `className`, so the fill is the only element left with no route.
   *
   * Its `width` is the percentage and is written as inline style every render,
   * so a class here changes the paint and never the reading. For a colour, reach
   * for `color` first and a theme's `--C-ACCENT`/`--C-STATUS-*` second; a `bg-*`
   * here wins over both, which is what it is for.
   */
  classNames?: SlotClassNames<"fill">;
};

type ProgressBarRootProps = ProgressBarOwnProps &
  ProgressBarNameProps &
  Omit<ComponentPropsWithRef<"div">, "children">;

type ProgressBarSize = NonNullable<ProgressBarOwnProps["size"]>;
type ProgressBarColor = NonNullable<ProgressBarOwnProps["color"]>;
type ProgressBarVariant = NonNullable<ProgressBarOwnProps["variant"]>;

/**
 * The track. Rung 3, the deepest recession, matching every other track in the
 * system. `overflow-hidden` is what clips the fill to the pill.
 *
 * `ProgressBar.css` keeps only its `@keyframes` block and says why at source;
 * everything else this component draws is in this file. Each BEM name survives
 * as a declaration-free marker (AGENTS.md §"Class names outlive their
 * declarations"), and each constant is one flat string literal because
 * `verify:component-docs` resolves hoisted constants textually.
 */
const progressTrackClasses = "relative w-full overflow-hidden bg-surface-3 rounded-full";

const sizeClass: Record<ProgressBarSize, string> = {
  sm: "progress-bar--sm h-r6",
  md: "progress-bar--md h-r5",
  lg: "progress-bar--lg h-r4",
};

/**
 * The fill's geometry and motion — paint only, no colour.
 *
 * Do not add a `background-color` default here: `color` defaults to `accent`, so
 * every instance already carries a colour utility from `colorClass`, and two
 * bare utilities in one `cn()` resolve by argument order rather than by anything
 * a reader can see.
 *
 * `--MOTION-*` is in no Tailwind namespace, so the shift tokens are read as
 * custom properties in the bracket spelling — `ease-shift` generates nothing.
 */
const progressFillClasses =
  "h-full rounded-full transition-[width] duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none motion-reduce:animate-none";

/**
 * The stripe texture and its scroll. The ink is the ramp's own on-fill partner,
 * not a hard-coded white: at `oklch(1 0 0 / 0.15)` the stripes vanished on every
 * light-fill theme.
 *
 * `animate-[…]` names `progress-bar-stripes`, which is the one block left in
 * `ProgressBar.css`. The `bg-[length:…]` is what the keyframes scroll.
 */
const stripedClasses =
  "bg-[repeating-linear-gradient(45deg,transparent,transparent_0.5rem,color-mix(in_oklch,var(--C-TEXT-ON-ACCENT)_15%,transparent)_0.5rem,color-mix(in_oklch,var(--C-TEXT-ON-ACCENT)_15%,transparent)_1rem)] bg-[length:200%_100%] animate-[progress-bar-stripes_var(--MOTION-DURATION-SHIFT)_linear_infinite]";

/**
 * Both halves of the `--no-animate` pair, converted together. The stylesheet
 * carried this as two rules whose correctness came from source order and from a
 * compound `.--no-animate.--striped` selector; here it is one string passed
 * AFTER the base and after `stripedClasses`, so tailwind-merge resolves
 * `transition` and `animation` the modifier's way at the call site.
 */
const noAnimateClasses = "progress-bar__fill--no-animate transition-none animate-none";

const progressLabelClasses = "block text-body-2 font-semibold text-fg-secondary mb-r6";

const progressValueClasses = "block text-body-2 font-bold text-fg-primary tabular-nums mb-r6";

/**
 * The fill's paint. Each entry is a §12 marker class — declaration-free, kept so
 * devtools, a consumer stylesheet and Astro/Rails consumers of
 * `response-ui-css` all still have one name per colour — beside the utility that
 * actually paints it.
 *
 * The utility is the point: `bg-status-success` compiles to
 * `background-color: var(--C-STATUS-SUCCESS)`, so a consumer theme setting that
 * token at `:root` reaches the bar. The deleted `--progress-bar-fill` could not
 * do that — it was declared on the fill itself, and a declaration on the element
 * beats an inherited one whatever the cascade layer.
 */
const colorClass: Record<ProgressBarColor, string> = {
  accent: "progress-bar__fill--accent bg-accent",
  success: "progress-bar__fill--success bg-status-success",
  warning: "progress-bar__fill--warning bg-status-warning",
  error: "progress-bar__fill--error bg-status-error",
};

/**
 * `variant="gradient"` only, and it composes with `colorClass` rather than
 * replacing it: this is `background-image`, which paints over the colour's
 * `background-color` and leaves it as the fallback. (The ramp once used the
 * `background` shorthand, which at equal specificity discarded `color`
 * outright — hence two properties, never one.)
 *
 * Written out per colour because the end stop is a `color-mix` of the start, and
 * there is no CSS way to read the element's own resolved `background-color`.
 * Each string is one class in tailwind-merge's `bg-image` group, so
 * `classNames={{ fill: "bg-none" }}` drops the ramp without touching the colour.
 * Long, and deliberately not built from a template literal: Tailwind scans
 * source text, so an interpolated name generates nothing.
 */
const gradientRampClass: Record<ProgressBarColor, string> = {
  accent: "bg-[linear-gradient(90deg,var(--C-ACCENT),var(--C-ACCENT-HOVER))]",
  success:
    "bg-[linear-gradient(90deg,var(--C-STATUS-SUCCESS),color-mix(in_oklch,var(--C-STATUS-SUCCESS)_75%,var(--C-CANVAS)))]",
  warning:
    "bg-[linear-gradient(90deg,var(--C-STATUS-WARNING),color-mix(in_oklch,var(--C-STATUS-WARNING)_75%,var(--C-CANVAS)))]",
  error:
    "bg-[linear-gradient(90deg,var(--C-STATUS-ERROR),color-mix(in_oklch,var(--C-STATUS-ERROR)_75%,var(--C-CANVAS)))]",
};

const statusLabelMap: Record<ProgressBarColor, string | undefined> = {
  accent: undefined,
  success: "Success",
  warning: "Warning",
  error: "Error",
};

// `--gradient` and `--striped` are both §12 markers now; the texture that used
// to hang off `--striped` in CSS is `stripedClasses` above.
const variantFillClass: Record<ProgressBarVariant, string | undefined> = {
  default: undefined,
  gradient: "progress-bar__fill--gradient",
  striped: "progress-bar__fill--striped " + stripedClasses,
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
    classNames,
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
      className={cn("progress-bar", progressTrackClasses, sizeClass[size], className)}
      {...props}
    >
      <div
        className={cn(
          "progress-bar__fill",
          progressFillClasses,
          colorClass[color],
          variantFillClass[variant],
          variant === "gradient" && gradientRampClass[color],
          !shouldAnimate && noAnimateClasses,
          // Last, so tailwind-merge resolves every collision the caller's way.
          classNames?.fill
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
    return (
      <span ref={ref} className={cn("progress-bar__label", progressLabelClasses, className)} {...props} />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  ProgressBar.Value                                                  */
/* ------------------------------------------------------------------ */

type ProgressBarValueProps = ComponentPropsWithRef<"span">;

const ProgressBarValue = forwardRef<HTMLSpanElement, ProgressBarValueProps>(
  function ProgressBarValue({ className, ...props }, ref) {
    return (
      <span ref={ref} className={cn("progress-bar__value", progressValueClasses, className)} {...props} />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const ProgressBar = Object.assign(ProgressBarRoot, {
  Label: ProgressBarLabel,
  Value: ProgressBarValue,
});
