import { Divider } from "./Divider";

/** The default: a horizontal rule tinted with the theme's border color. */
export function Minimal() {
  return (
    <div>
      <p>Signed in as jordan@acme.com</p>
      <Divider />
      <p>Switch account or sign out.</p>
    </div>
  );
}

/** `orientation="vertical"` renders a `<div role="separator">` that grows with
 *  `self-stretch` — it needs a flex or grid parent with a cross-axis height, and
 *  collapses to nothing without one. */
export function Vertical() {
  return (
    <div className="flex items-center gap-r3">
      <span>Draft</span>
      <Divider orientation="vertical" />
      <span>Edited 5 minutes ago</span>
      <Divider orientation="vertical" />
      <span>3 collaborators</span>
    </div>
  );
}

/** Divider ships no margin of its own — add the surrounding space yourself, here
 *  with vertical margin utilities merged onto the rule via `className`. */
export function Spacing() {
  return (
    <div>
      <p>Notifications are on.</p>
      <Divider className="my-r4" />
      <p>You can mute them per channel.</p>
    </div>
  );
}
