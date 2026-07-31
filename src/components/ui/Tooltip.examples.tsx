import { Archive, Link2 } from "lucide-react";

import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Kbd } from "./Kbd";
import { Tooltip } from "./Tooltip";

/** A tooltip is a *description*, not a name — the trigger keeps its own visible label. */
export function Minimal() {
  return (
    <Tooltip content="Exports every row, not just the current page">
      <Button type="button" variant="secondary">
        Export CSV
      </Button>
    </Tooltip>
  );
}

/** Icon-only triggers still need their own `aria-label`; the tooltip only describes. */
export function IconOnlyTrigger() {
  return (
    <Tooltip content="Archive conversation">
      <IconButton type="button" aria-label="Archive conversation">
        <Archive size={16} aria-hidden="true" />
      </IconButton>
    </Tooltip>
  );
}

/** `placement` is a preference — the tooltip flips and shifts when the viewport is tight. */
export function Placement() {
  return (
    <>
      <Tooltip content="Reverts to the last saved revision" placement="top">
        <Button type="button" variant="secondary">
          Discard changes
        </Button>
      </Tooltip>
      <Tooltip content="Notifies every reviewer on the team" placement="right">
        <Button type="button" variant="secondary">
          Request review
        </Button>
      </Tooltip>
      <Tooltip content="Runs against the staging database" placement="bottom-start">
        <Button type="button" variant="secondary">
          Dry run
        </Button>
      </Tooltip>
    </>
  );
}

/** One `delay` governs both waits; `offset` is the gap from the trigger, in pixels. */
export function Timing() {
  return (
    <Tooltip content="Rebuilds the search index — takes about 30 seconds" delay={0} offset={12}>
      <Button type="button" variant="secondary">
        Reindex
      </Button>
    </Tooltip>
  );
}

/** `arrow` points the bubble at its trigger; `className` reaches the bubble itself. */
export function Arrow() {
  return (
    <Tooltip content="Runs on every push to main" arrow className="max-w-r1">
      <Button type="button" variant="secondary">
        Nightly build
      </Button>
    </Tooltip>
  );
}

/** `content` is a `ReactNode`, so it can carry markup — as long as none of it is interactive. */
export function RichContent() {
  return (
    <Tooltip
      content={
        <span>
          Copy link <Kbd>⌘</Kbd> <Kbd>C</Kbd>
        </span>
      }
    >
      <IconButton type="button" aria-label="Copy link">
        <Link2 size={16} aria-hidden="true" />
      </IconButton>
    </Tooltip>
  );
}

/** `aria-disabled` keeps the trigger focusable, so the reason it is unavailable stays reachable. */
export function UnavailableAction() {
  return (
    <Tooltip content="Only workspace owners can delete a workspace">
      <Button type="button" variant="danger" aria-disabled="true" className="opacity-50">
        Delete workspace
      </Button>
    </Tooltip>
  );
}
