"use client";
import {
  type ComponentProps,
  type ComponentPropsWithRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";
import { Sparkline } from "../data-display/Sparkline";

const defaultFormat = new Intl.NumberFormat();

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `StatCard.css` is gone; everything this component draws is here. Every BEM
 * name survives as a declaration-free marker (AGENTS.md §"Class names outlive
 * their declarations") beside the utility that now paints it.
 *
 * Each constant is one flat string literal because `verify:component-docs` and
 * `verify:focus-affordance` resolve hoisted constants textually and a composed
 * one would not resolve.
 */
const statCardRootClasses =
  // `bg-surface-0` is the raised-sheet rung, same as `Card` — the two must not
  // diverge. A tile nested in a `Card` is therefore sheet-on-sheet: the border,
  // not the fill, is what bounds it.
  "flex flex-col gap-r5 p-r5 bg-surface-0 border border-border-default rounded-lg";

/** Recessed into the tile — the chip has no border, so the step is all it has. */
const statCardIconClasses =
  "flex items-center justify-center size-r2 rounded-md bg-surface-2 text-accent";

const statCardValueClasses = "text-h3 font-bold text-fg-primary tabular-nums";

const statCardLabelClasses = "text-body-2 font-semibold text-fg-secondary";

const trendClasses = "inline-flex items-center gap-r6 text-body-2 font-semibold";

const trendIconClasses =
  "size-[1em] transition-transform duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none";

/**
 * `margin-top: auto` pins the chart to the tile's floor so a row of tiles lines
 * its charts up regardless of how tall each one's text runs. No `max-height`:
 * the svg carries its own `height` attribute, so capping the wrapper clamped the
 * box while the chart kept drawing past it. Height belongs to the `height` prop.
 */
const sparklineWrapperClasses = "block mt-auto";

/**
 * Fill the tile rather than sitting at the svg's intrinsic 120px, which left the
 * chart covering ~60% of a 4-up tile and reading as a mistake.
 * `preserveAspectRatio="none"` stretches the drawing to match; the stroke
 * stretches with it, which is invisible at the shallow slopes a sparkline
 * actually draws. It must NOT be given `vector-effect: non-scaling-stroke` to
 * compensate — that computes the dash pattern in screen space, which breaks the
 * `pathLength=1` normalisation the draw-in animation relies on and leaves the
 * line rendered in disconnected fragments.
 *
 * This was `.stat-card__sparkline .sparkline` in `StatCard.css` — a rule reaching
 * into an element `Sparkline` renders. It is now handed to `Sparkline` through the
 * `className` this component already forwards, so the styling stays with the
 * element that owns it and nothing here selects across a component boundary.
 */
const sparklineChartClasses = "block w-full";

/* ------------------------------------------------------------------ */
/*  StatCard (root)                                                    */
/* ------------------------------------------------------------------ */

type StatCardRootProps = ComponentPropsWithRef<"div">;

const StatCardRoot = forwardRef<HTMLDivElement, StatCardRootProps>(function StatCard(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("stat-card", statCardRootClasses, className)} {...props} />;
});

/* ------------------------------------------------------------------ */
/*  StatCard.Value                                                     */
/* ------------------------------------------------------------------ */

type StatCardValueProps = {
  animateValue?: boolean;
  from?: number;
  to?: number;
  format?: (value: number) => string;
  duration?: number;
} & ComponentPropsWithRef<"span">;

const StatCardValue = forwardRef<HTMLSpanElement, StatCardValueProps>(function StatCardValue(
  { animateValue = false, from = 0, to, format, duration, className, children, ...props },
  ref
) {
  const reducedMotion = usePrefersReducedMotion();
  const innerRef = useRef<HTMLSpanElement>(null);
  // The target already animated to, NOT a "has run once" flag: a flag froze the
  // counter on the first value it ever reached, so a stat that updates (a live
  // figure, a re-fetched dashboard) never moved again (#5).
  const animatedTo = useRef<number | null>(null);
  // Where the next run starts from — the figure on screen, so an update counts
  // on from what the reader can see rather than restarting at `from`.
  const currentValue = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState<string | null>(null);

  const formatValue = useCallback(
    (v: number) => (format ? format(v) : defaultFormat.format(v)),
    [format]
  );

  // Reduced motion: derive final value directly without effect
  const reducedMotionValue =
    animateValue && to !== undefined && reducedMotion ? formatValue(to) : null;

  useEffect(() => {
    if (!animateValue || to === undefined || reducedMotion) return;

    const target = to;
    const el = innerRef.current;
    if (!el) return;

    // Same guard as ScrollReveal: without IntersectionObserver there is no way
    // to know when the value scrolls into view, so settle on the final value
    // rather than throwing or freezing on the `from` placeholder. Kept in the
    // effect, not the render, so the server and the first client render agree.
    if (typeof IntersectionObserver === "undefined") {
      currentValue.current = target;
      animatedTo.current = target;
      setDisplayValue(formatValue(target));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || animatedTo.current === target) return;
        animatedTo.current = target;
        observer.disconnect();

        // Read duration from CSS custom property or use prop
        const ms =
          duration ??
          (parseFloat(getComputedStyle(el).getPropertyValue("--MOTION-DURATION-SHIFT")) || 400);

        const startTime = performance.now();
        const start = currentValue.current ?? from;
        const range = target - start;

        function tick(now: number) {
          const elapsed = now - startTime;
          const t = Math.min(elapsed / ms, 1);
          // Cubic ease-out: 1 - (1 - t)^3
          const eased = 1 - Math.pow(1 - t, 3);
          const current = start + range * eased;

          currentValue.current = current;
          setDisplayValue(formatValue(Math.round(current)));

          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            currentValue.current = target;
            setDisplayValue(formatValue(target));
          }
        }

        requestAnimationFrame(tick);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animateValue, from, to, duration, reducedMotion, formatValue]);

  // #6. Until the observer fires, the counter shows `format(from)` — usually
  // "0" — and that placeholder used to be the ONLY text in the element, so
  // anything reading the page without scrolling it (a screen reader walking
  // off-screen content, a page summary) got 0 instead of the figure. The
  // count-up is a visual effect, so it is `aria-hidden` and the real value sits
  // beside it in an `sr-only` twin. The twin only exists while the two
  // disagree: once the run settles the element is a single text node again,
  // which is what it was before this and what `getByText` sees.
  const animating = animateValue && to !== undefined;
  const shown = animating ? (reducedMotionValue ?? displayValue ?? formatValue(from)) : null;
  const settled = animating && shown === formatValue(to);

  let content: ReactNode;
  if (!animating) {
    content = children;
  } else if (settled) {
    content = shown;
  } else {
    content = (
      <>
        <span aria-hidden="true">{shown}</span>
        <span
          // slot:(a) the accessible twin of the ticking figure. A slot here hands a
          // caller the one class that keeps the real value out of the visual flow,
          // and dropping `sr-only` prints the number twice (docs/project-docs/slot-vocabulary.md §11).
          className="sr-only"
        >
          {formatValue(to)}
        </span>
      </>
    );
  }

  return (
    <span
      ref={mergeRefs(ref, innerRef)}
      className={cn("stat-card__value", statCardValueClasses, className)}
      {...props}
    >
      {content}
    </span>
  );
});

/* ------------------------------------------------------------------ */
/*  StatCard.Label                                                     */
/* ------------------------------------------------------------------ */

type StatCardLabelProps = ComponentPropsWithRef<"span">;

const StatCardLabel = forwardRef<HTMLSpanElement, StatCardLabelProps>(function StatCardLabel(
  { className, ...props },
  ref
) {
  return <span ref={ref} className={cn("stat-card__label", statCardLabelClasses, className)} {...props} />;
});

/* ------------------------------------------------------------------ */
/*  StatCard.Trend                                                     */
/* ------------------------------------------------------------------ */

/** Which way the number moved — a fact about the data. Drives the arrow and sign. */
type TrendDirection = "up" | "down" | "neutral";

/**
 * Whether that movement is good news — a judgement about the metric, which only
 * the caller can make. Drives the colour. Falling churn is `down` + `positive`;
 * rising error rate is `up` + `negative`.
 */
type TrendSentiment = "positive" | "negative" | "neutral";

const impliedSentiment: Record<TrendDirection, TrendSentiment> = {
  up: "positive",
  down: "negative",
  neutral: "neutral",
};

type StatCardTrendProps = {
  value: number;
  direction: TrendDirection;
  sentiment?: TrendSentiment;
  format?: (value: number) => string;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * root — the badge itself — so the only slot is the arrow, which no caller can
   * otherwise reach. The union is written out here so an unknown key is a type
   * error rather than a silently ignored one.
   */
  classNames?: SlotClassNames<"trendIcon">;
} & Omit<ComponentPropsWithRef<"span">, "children">;

const directionClass: Record<TrendDirection, string> = {
  up: "stat-card__trend--up",
  down: "stat-card__trend--down",
  neutral: "stat-card__trend--flat",
};

/**
 * Colour is *sentiment* — whether the movement is good news, which only the
 * caller knows: falling churn is `--down --positive`. `directionClass` above
 * carries *direction* and its three names are §12 markers only: consumer
 * stylesheets and devtools still select on them, and nothing in this package
 * paints from them. Only the arrow reads direction, and it does so in JS.
 */
const sentimentClass: Record<TrendSentiment, string> = {
  positive: "stat-card__trend--positive text-status-success",
  negative: "stat-card__trend--negative text-status-error",
  neutral: "stat-card__trend--neutral text-fg-secondary",
};

const TrendArrow = ({ className }: { className?: string }) => (
  <svg
    className={cn("stat-card__trend-icon", trendIconClasses, className)}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8 3.5v9M8 3.5L4 7.5M8 3.5l4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StatCardTrend = forwardRef<HTMLSpanElement, StatCardTrendProps>(function StatCardTrend(
  { value, direction, sentiment, format, className, classNames, ...props },
  ref
) {
  const sign = direction === "down" ? "-" : direction === "up" ? "+" : "";

  return (
    <span
      ref={ref}
      className={cn(
        "stat-card__trend",
        trendClasses,
        directionClass[direction],
        sentimentClass[sentiment ?? impliedSentiment[direction]],
        className
      )}
      {...props}
    >
      {direction !== "neutral" && (
        // The arrow points down for a falling figure. Keyed off the prop rather
        // than an `in-[.stat-card__trend--down]:` variant: the class is a §12
        // marker a consumer may also put on an ancestor, and a variant matching
        // any ancestor would flip arrows it does not own.
        <TrendArrow
          className={cn(direction === "down" && "rotate-180", classNames?.trendIcon)}
        />
      )}
      {format ? format(value) : `${sign}${Math.abs(value)}%`}
    </span>
  );
});

/* ------------------------------------------------------------------ */
/*  StatCard.Icon                                                      */
/* ------------------------------------------------------------------ */

type StatCardIconProps = ComponentPropsWithRef<"div">;

const StatCardIcon = forwardRef<HTMLDivElement, StatCardIconProps>(function StatCardIcon(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("stat-card__icon", statCardIconClasses, className)} {...props} />;
});

/* ------------------------------------------------------------------ */
/*  StatCard.Sparkline                                                 */
/* ------------------------------------------------------------------ */

type StatCardSparklineProps = {
  direction?: TrendDirection;
  sentiment?: TrendSentiment;
} & ComponentProps<typeof Sparkline>;

const sparklineSentimentClass: Record<TrendSentiment, string> = {
  positive: "text-trend-up",
  negative: "text-trend-down",
  neutral: "text-fg-muted",
};

const StatCardSparkline = forwardRef<SVGSVGElement, StatCardSparklineProps>(
  function StatCardSparkline({ direction, sentiment, className, ...props }, ref) {
    // Tint follows sentiment, matching the Trend beside it. `direction` alone
    // still implies one, so the common "up is good" case needs neither prop
    // spelled out twice.
    const tint = sentiment ?? (direction && impliedSentiment[direction]);

    return (
      <div
        // slot:(a) the tile↔chart coupling, not a box a caller composes with: its
        // `margin-top: auto` means something only as a flex child of `.stat-card`, so a
        // caller who wants the chart elsewhere moves the element, not the margin.
        // `className` stays on the wrapped chart (this component's props ARE
        // `Sparkline`'s, and its `ref` is the `<svg>`), so re-pointing it here is a
        // breaking API change and an owner call. See docs/project-docs/slot-convention.md "The wrapper case".
        className={cn("stat-card__sparkline", sparklineWrapperClasses)}
      >
        <Sparkline
          ref={ref}
          className={cn(sparklineChartClasses, tint && sparklineSentimentClass[tint], className)}
          {...props}
        />
      </div>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const StatCard = Object.assign(StatCardRoot, {
  Value: StatCardValue,
  Label: StatCardLabel,
  Trend: StatCardTrend,
  Icon: StatCardIcon,
  Sparkline: StatCardSparkline,
});
