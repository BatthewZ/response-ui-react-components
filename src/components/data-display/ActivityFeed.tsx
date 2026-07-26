import { type ComponentPropsWithRef, forwardRef, type ReactNode } from "react";

import { cn } from "../../util/style";

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
} & ComponentPropsWithRef<"li">;

const ActivityFeedItem = forwardRef<HTMLLIElement, ActivityFeedItemProps>(
  function ActivityFeedItem(
    { avatar, icon, actor, action, target, timestamp, className, children, ...props },
    ref,
  ) {
    return (
      <li ref={ref} className={cn("activity-feed-item", className)} {...props}>
        <div className="activity-feed-aside">
          {avatar ?? <div className="activity-feed-dot">{icon}</div>}
        </div>
        <div className="activity-feed-main">
          <div className="activity-feed-sentence">
            {actor != null && <span className="activity-feed-actor">{actor}</span>}
            {action != null && <span className="activity-feed-action">{action}</span>}
            {target != null && <span className="activity-feed-target">{target}</span>}
            {timestamp != null && <span className="activity-feed-timestamp">{timestamp}</span>}
          </div>
          {children != null && <div className="activity-feed-body">{children}</div>}
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
