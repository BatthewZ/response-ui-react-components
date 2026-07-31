import { type ComponentPropsWithRef, forwardRef, type ReactNode } from "react";

import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  ActivityFeed (root)                                                */
/* ------------------------------------------------------------------ */

type ActivityFeedProps = {
  "aria-busy"?: boolean;
} & ComponentPropsWithRef<"ol">;

const ActivityFeedRoot = forwardRef<HTMLOListElement, ActivityFeedProps>(function ActivityFeed(
  { className, children, ...props },
  ref,
) {
  return (
    // `role="list"` restores what the stylesheet's `list-style: none` drops in
    // Safari + VoiceOver (#28). Written before the spread, so a caller can
    // still replace it.
    <ol role="list" ref={ref} className={cn("activity-feed", className)} {...props}>
      {children}
    </ol>
  );
});

/* ------------------------------------------------------------------ */
/*  ActivityFeed.Item                                                  */
/* ------------------------------------------------------------------ */

type ActivityFeedItemProps = {
  avatar?: ReactNode;
  icon?: ReactNode;
  actor?: ReactNode;
  action?: ReactNode;
  target?: ReactNode;
  timestamp?: ReactNode;
  /**
   * Champion this row: the marker takes `--activity-feed-highlight-fill` inked
   * with `--activity-feed-highlight-ink`, and gains a ring in the fill colour so
   * it reads bigger — the cue that survives greyscale and a theme whose accent
   * sits near the surface, where hue alone would not. Both are public custom
   * properties, and that is what makes them reachable at all: a `className` on
   * the row lands on the `<li>` and nothing inside it, while one write of these
   * inherits to markers the consumer never renders. (Precedence is no longer the
   * reason — this package's CSS is in `@layer components`, so a caller's utility
   * does beat it wherever a caller can put one.)
   *
   * The ring is a `box-shadow`, so it costs no layout — the 2rem marker column is
   * a fixed grid track that the connector's origin is measured from, and growing
   * the marker would move the rail. `Timeline.Item` takes the same prop and
   * spends it the same way.
   * @default false
   */
  highlight?: boolean;
  /**
   * Class overrides for the parts of the row this component renders.
   * `className` is the `<li>`, so these reach the sentence, its four spans and
   * the detail block under it — none of which a caller can otherwise address.
   *
   * The marker is deliberately absent, on the same reasoning as `highlight`
   * above: its fill and ink are public custom properties that one write reaches
   * every row with, and its ring width is private so the cue cannot be reduced
   * to colour alone.
   */
  classNames?: SlotClassNames<
    "sentence" | "actor" | "action" | "target" | "timestamp" | "body"
  >;
} & ComponentPropsWithRef<"li">;

const ActivityFeedItem = forwardRef<HTMLLIElement, ActivityFeedItemProps>(
  function ActivityFeedItem(
    {
      avatar,
      icon,
      actor,
      action,
      target,
      timestamp,
      highlight = false,
      className,
      classNames,
      children,
      ...props
    },
    ref,
  ) {
    return (
      // `data-highlight` is absent rather than `"false"` when off, so the
      // stylesheet tests for presence. Before the spread, as with `role` on the
      // root, so a caller can still override it.
      <li
        ref={ref}
        className={cn("activity-feed-item", className)}
        data-highlight={highlight ? "true" : undefined}
        {...props}
      >
        <div
          // slot:(a) a fixed grid track, not decoration: the rail's origin is
          // measured from its width, so a caller class here moves the line down
          // the whole feed rather than restyling one row's marker column.
          className="activity-feed-aside"
        >
          {avatar ?? (
            <div
              // slot:(b) the marker's ink is `--activity-feed-highlight-fill`
              // paired with `--activity-feed-highlight-ink`, both public and
              // both inherited from one write on the row; its ring width is
              // private so the emphasis cue cannot be reduced to colour alone.
              className="activity-feed-dot"
            >
              {icon}
            </div>
          )}
        </div>
        <div
          // slot:(a) the content column, and `min-width: 0` is the whole of it —
          // the one declaration that lets long text wrap inside the `1fr` track
          // instead of widening it. Every part a consumer would restyle is a key
          // below.
          className="activity-feed-main"
        >
          <div className={cn("activity-feed-sentence", classNames?.sentence)}>
            {actor != null && (
              <span className={cn("activity-feed-actor", classNames?.actor)}>{actor}</span>
            )}
            {action != null && (
              <span className={cn("activity-feed-action", classNames?.action)}>{action}</span>
            )}
            {target != null && (
              <span className={cn("activity-feed-target", classNames?.target)}>{target}</span>
            )}
            {timestamp != null && (
              <span className={cn("activity-feed-timestamp", classNames?.timestamp)}>
                {timestamp}
              </span>
            )}
          </div>
          {children != null && (
            <div className={cn("activity-feed-body", classNames?.body)}>{children}</div>
          )}
        </div>
      </li>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const ActivityFeed = Object.assign(ActivityFeedRoot, {
  Item: ActivityFeedItem,
});
