import { ChevronUp, MoreHorizontal, Pencil, Play, Search, Share2, Trash2, X } from "lucide-react";

import { Input } from "../form/Input";
import { IconButton } from "./IconButton";

const dismiss = () => {};
const clearQuery = () => {};
const runSearch = () => {};

/** A glyph plus the name of the action. `aria-label` is required by the type; the icon is
 *  `aria-hidden` so the button announces once, not twice. `type` is not defaulted, so it is
 *  spelled out here as it should be everywhere. */
export function Minimal() {
  return (
    <IconButton type="button" aria-label="Dismiss notification" onClick={dismiss}>
      <X size={16} aria-hidden="true" />
    </IconButton>
  );
}

/** The usual home for icon buttons — a dense row of secondary actions, each still named. */
export function Toolbar() {
  return (
    <div className="flex items-center gap-r6">
      <IconButton type="button" aria-label="Edit article">
        <Pencil size={16} aria-hidden="true" />
      </IconButton>
      <IconButton type="button" aria-label="Share article">
        <Share2 size={16} aria-hidden="true" />
      </IconButton>
      <IconButton type="button" aria-label="Delete article">
        <Trash2 size={16} aria-hidden="true" />
      </IconButton>
      <IconButton type="button" aria-label="More actions">
        <MoreHorizontal size={16} aria-hidden="true" />
      </IconButton>
    </div>
  );
}

/** There is no default `type`, so inside a form every IconButton submits unless you say
 *  otherwise. Set `type` explicitly on both sides. */
export function InsideAForm() {
  return (
    <form onSubmit={runSearch}>
      <Input name="q" aria-label="Search articles" placeholder="Search articles" />
      <IconButton type="button" aria-label="Clear search" onClick={clearQuery}>
        <X size={16} aria-hidden="true" />
      </IconButton>
      <IconButton type="submit" aria-label="Search">
        <Search size={16} aria-hidden="true" />
      </IconButton>
    </form>
  );
}

/** `disabled` is the native attribute — it blocks the click and dims the button to 50%. It
 *  leaves the tab order, but stays in the accessibility tree with its name and state. */
export function Disabled() {
  return (
    <IconButton type="button" aria-label="Move item up" disabled>
      <ChevronUp size={16} aria-hidden="true" />
    </IconButton>
  );
}

/** No `size` prop: padding is the whole sizing story, and `className` wins the merge, so
 *  one padding utility replaces the built-in `p-r5`. */
export function BiggerTarget() {
  return (
    <IconButton type="button" aria-label="Play episode" className="p-r3">
      <Play size={24} aria-hidden="true" />
    </IconButton>
  );
}

/** The glyph inherits the button's ink through `currentColor`, so a single `text-*`
 *  utility recolours the icon and the rest state together. */
export function Retinted() {
  return (
    <IconButton type="button" aria-label="Remove from cart" className="text-status-error">
      <Trash2 size={16} aria-hidden="true" />
    </IconButton>
  );
}
