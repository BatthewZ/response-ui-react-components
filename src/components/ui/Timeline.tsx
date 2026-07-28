"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
} from "react";

import { ScrollReveal } from "../animation/ScrollReveal";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context (passes the animate flag to items)                         */
/* ------------------------------------------------------------------ */

// #342: this used to carry a per-item `index` as well, and the item derived its
// entrance direction from it while `Timeline.css` derived the card's side from
// `:nth-child`. Two sources for one fact, and a fragment child desynchronised
// them — `Item, <>Item Item</>, Item` emitted
// `fade-right · fade-left · fade-left · fade-right` against a
// `left · right · left · right` layout, because `Children.toArray` does not
// descend into a fragment while the DOM does. DOM position is now the only
// source: every item ships the same entrance class and Timeline.css flips the
// direction on the same `:nth-child` rule that flips the side, so no wrapper —
// fragment, `.map`, or a component rendering two items — can split them.
type TimelineItemContextValue = {
  animate: boolean;
};

const TimelineItemContext = createContext<TimelineItemContextValue | null>(null);

function useTimelineItemContext() {
  return useContext(TimelineItemContext);
}

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type TimelineAlign = "left" | "center" | "right";

/** Same vocabulary and same default as `Table`, deliberately. */
type TimelineDensity = "dense" | "comfortable" | "spacious";

/* ------------------------------------------------------------------ */
/*  Timeline (root)                                                    */
/* ------------------------------------------------------------------ */

type TimelineProps = {
  animate?: boolean;
  /**
   * Which side of the cards the rail runs down.
   *
   * `"center"` is the marketing shape and the default: at `40rem` and up the
   * rail bisects the list and cards alternate either side of it, collapsing to
   * the `"left"` layout below that, because a half-width card is unreadable on
   * a phone. `"left"` and `"right"` are single-column at *every* width — no
   * reflow at the breakpoint, no half-empty row, which is what a dashboard
   * wants.
   *
   * Emitted as `data-align` and read only by `Timeline.css`; nothing positional
   * is counted in React, so this cannot desynchronise from the layout (#342).
   * @default "center"
   */
  align?: TimelineAlign;
  /**
   * Space between and inside entries — the gap between events, the card's
   * padding, the dot's size, and the gaps under the date and title. Type sizes
   * do not change, and neither does the card's border or surface: that is
   * `card`, which is a separate axis on purpose, so dense-and-carded and
   * spacious-and-flat are both reachable.
   * @default "comfortable"
   */
  density?: TimelineDensity;
  /**
   * Draw each entry on its own bordered surface. `false` strips the border, the
   * background and the card's padding, hanging the text straight off the rail —
   * the flat-feed shape, and what stacked entries want once `density` is
   * `"dense"` and the borders start reading as noise.
   * @default true
   */
  card?: boolean;
} & ComponentPropsWithRef<"div">;

const TimelineRoot = forwardRef<HTMLDivElement, TimelineProps>(function Timeline(
  {
    animate = true,
    align = "center",
    density = "comfortable",
    card = true,
    className,
    children,
    ...props
  },
  ref
) {
  // One provider around the whole list, not one per child. The per-child
  // providers existed to hand each item its index; with the index gone (#342)
  // there is nothing positional left to pass, so the caller's own children —
  // and their own keys — go straight through. That is also what keeps #346
  // closed: a prepend now reconciles against the caller's keys with no wrapper
  // in between to pair a new key with an old provider.
  //
  // `align`, `density` and `card` deliberately do NOT join it. They are read
  // off the root element by CSS descendant selectors, so an item never has to
  // be told which layout it is in — which is the same reason #342 stays closed:
  // no wrapper, fragment or `.map` can put an item in a different layout from
  // the one the rail is drawn for. Attributes sit before the spread, as
  // elsewhere in the package, so a caller can still override them.
  return (
    <TimelineItemContext.Provider value={{ animate }}>
      <div
        ref={ref}
        className={cn("timeline", className)}
        data-align={align}
        data-density={density}
        data-card={card ? "true" : "false"}
        {...props}
      >
        {children}
      </div>
    </TimelineItemContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  Timeline.Item                                                      */
/* ------------------------------------------------------------------ */

type TimelineItemProps = {
  date?: string;
  /**
   * The event's heading. `ReactNode`, so a date range, a link or an emphasised
   * fragment can go in it — `Swimlane` already typed its own title this way
   * and this one was the outlier (#343).
   */
  title: ReactNode;
  /**
   * Element for `title`. Defaults to `"h3"`, which is only right when the
   * timeline sits under an `<h2>`; a timeline under an `<h3>` wants `"h4"`, and
   * a decorative one wants a non-heading element it does not get here — pass
   * the level that matches the page, or render the heading yourself in
   * `children` and pass a `title` you are happy to have announced.
   */
  titleAs?: HeadingLevel;
  icon?: ReactNode;
} & Omit<ComponentPropsWithRef<"div">, "title">;

const TimelineItem = forwardRef<HTMLDivElement, TimelineItemProps>(function TimelineItem(
  { date, title, titleAs: Heading = "h3", icon, className, children, ...props },
  ref
) {
  const ctx = useTimelineItemContext();
  const animate = ctx?.animate ?? true;

  const inner = (
    <>
      <div className="timeline-node">{icon ?? <div className="timeline-dot" />}</div>
      <div className="timeline-card">
        {date && <span className="timeline-date">{date}</span>}
        <Heading className="timeline-title">{title}</Heading>
        {children && <div className="timeline-body">{children}</div>}
      </div>
    </>
  );

  if (!animate) {
    return (
      <div ref={ref} className={cn("timeline-item", className)} {...props}>
        {inner}
      </div>
    );
  }

  // Always the same entrance class: `Timeline.css` flips `animation-name` on the
  // even items, in the same `:nth-child` rule that puts their card on the right
  // (#342). Below 40rem every card is on the same side, so the direction is
  // uniform there and the override never applies.
  return (
    <ScrollReveal
      ref={ref}
      animation="fade-right"
      className={cn("timeline-item", className)}
      {...props}
    >
      {inner}
    </ScrollReveal>
  );
});

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
});
