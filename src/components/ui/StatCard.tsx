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
import { cn } from "../../util/style";
import { Sparkline } from "../data-display/Sparkline";

const defaultFormat = new Intl.NumberFormat();

/* ------------------------------------------------------------------ */
/*  StatCard (root)                                                    */
/* ------------------------------------------------------------------ */

type StatCardRootProps = ComponentPropsWithRef<"div">;

const StatCardRoot = forwardRef<HTMLDivElement, StatCardRootProps>(function StatCard(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("stat-card", className)} {...props} />;
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
        <span className="sr-only">{formatValue(to)}</span>
      </>
    );
  }

  return (
    <span ref={mergeRefs(ref, innerRef)} className={cn("stat-card__value", className)} {...props}>
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
  return <span ref={ref} className={cn("stat-card__label", className)} {...props} />;
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
} & Omit<ComponentPropsWithRef<"span">, "children">;

const directionClass: Record<TrendDirection, string> = {
  up: "stat-card__trend--up",
  down: "stat-card__trend--down",
  neutral: "stat-card__trend--flat",
};

const sentimentClass: Record<TrendSentiment, string> = {
  positive: "stat-card__trend--positive",
  negative: "stat-card__trend--negative",
  neutral: "stat-card__trend--neutral",
};

const TrendArrow = () => (
  <svg className="stat-card__trend-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
  { value, direction, sentiment, format, className, ...props },
  ref
) {
  const sign = direction === "down" ? "-" : direction === "up" ? "+" : "";

  return (
    <span
      ref={ref}
      className={cn(
        "stat-card__trend",
        directionClass[direction],
        sentimentClass[sentiment ?? impliedSentiment[direction]],
        className
      )}
      {...props}
    >
      {direction !== "neutral" && <TrendArrow />}
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
  return <div ref={ref} className={cn("stat-card__icon", className)} {...props} />;
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
      <div className="stat-card__sparkline">
        <Sparkline
          ref={ref}
          className={cn(tint && sparklineSentimentClass[tint], className)}
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
