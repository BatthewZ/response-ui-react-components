import { CheckCircle2, GitMerge, GitPullRequest, MessageSquare } from "lucide-react";

import { Avatar } from "../ui/Avatar";
import { ActivityFeed } from "./ActivityFeed";

/** One `Item` per row: `actor` and `target` read bold, the `timestamp` trails right. */
export function Minimal() {
  return (
    <ActivityFeed>
      <ActivityFeed.Item actor="Ada Lovelace" action="opened" target="Pull request #42" timestamp="2h ago" />
      <ActivityFeed.Item actor="Grace Hopper" action="approved" target="Pull request #42" timestamp="1h ago" />
      <ActivityFeed.Item actor="Ada Lovelace" action="merged" target="Pull request #42" timestamp="20m ago" />
    </ActivityFeed>
  );
}

/** With no `avatar`, an `icon` fills the marker — a token-tinted dot sized to hold it. */
export function WithIcons() {
  return (
    <ActivityFeed>
      <ActivityFeed.Item icon={<GitPullRequest />} actor="Ada Lovelace" action="opened" target="Add OKLCH theming" timestamp="2h ago" />
      <ActivityFeed.Item icon={<MessageSquare />} actor="Grace Hopper" action="commented on" target="Add OKLCH theming" timestamp="1h ago" />
      <ActivityFeed.Item icon={<CheckCircle2 />} actor="Grace Hopper" action="approved" target="Add OKLCH theming" timestamp="55m ago" />
      <ActivityFeed.Item icon={<GitMerge />} actor="Ada Lovelace" action="merged" target="Add OKLCH theming" timestamp="20m ago" />
    </ActivityFeed>
  );
}

/** The `avatar` slot replaces the dot. An `Avatar` at `size="sm"` is exactly the 2rem
 *  column width, so it sits flush on the connector rail. */
export function WithAvatars() {
  return (
    <ActivityFeed>
      <ActivityFeed.Item avatar={<Avatar name="Ada Lovelace" size="sm" />} actor="Ada Lovelace" action="pushed 3 commits to" target="main" timestamp="2h ago" />
      <ActivityFeed.Item avatar={<Avatar name="Grace Hopper" size="sm" />} actor="Grace Hopper" action="deployed" target="v2.4.0" timestamp="1h ago" />
    </ActivityFeed>
  );
}

/** Children render as a body block beneath the sentence — a comment, a diff, any detail. */
export function WithBody() {
  return (
    <ActivityFeed>
      <ActivityFeed.Item icon={<MessageSquare />} actor="Grace Hopper" action="commented on" target="Add OKLCH theming" timestamp="1h ago">
        <p>Contrast pairs all check out against the surface tokens. Shipping it.</p>
      </ActivityFeed.Item>
      <ActivityFeed.Item icon={<GitMerge />} actor="Ada Lovelace" action="merged" target="Add OKLCH theming" timestamp="20m ago" />
    </ActivityFeed>
  );
}

/** `aria-busy` on the root marks the feed as updating while newer activity loads. */
export function Loading() {
  return (
    <ActivityFeed aria-busy>
      <ActivityFeed.Item actor="Ada Lovelace" action="opened" target="Pull request #42" timestamp="just now" />
    </ActivityFeed>
  );
}
