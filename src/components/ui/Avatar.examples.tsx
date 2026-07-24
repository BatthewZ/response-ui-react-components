import { Avatar, AvatarGroup } from "./Avatar";

/** Name only — the initials fallback at the default `md` size. */
export function Minimal() {
  return <Avatar name="Ada Lovelace" />;
}

/**
 * With a `src` the photo wins; `name` still supplies the accessible name and the fallback.
 * A `src` that 404s latches `onError` and drops to those initials for good — which is what
 * this placeholder host renders as.
 */
export function WithPhoto() {
  return <Avatar src="https://cdn.example.com/avatars/ada-lovelace.jpg" name="Ada Lovelace" />;
}

/** Five fixed sizes. `sm` is exactly 2rem — the ActivityFeed marker column width. */
export function Sizes() {
  return (
    <>
      <Avatar name="Ada Lovelace" size="xs" />
      <Avatar name="Ada Lovelace" size="sm" />
      <Avatar name="Ada Lovelace" size="md" />
      <Avatar name="Ada Lovelace" size="lg" />
      <Avatar name="Ada Lovelace" size="xl" />
    </>
  );
}

/** Initials are the first letter of the first two words — `C`, `GH`, `AB`. */
export function Initials() {
  return (
    <>
      <Avatar name="Cher" />
      <Avatar name="Grace Hopper" />
      <Avatar name="Ada Byron King Lovelace" />
    </>
  );
}

/** The dot carries presence in colour alone, so say it in text — and hide the avatar from
 *  assistive tech so the name isn't announced twice. */
export function Status() {
  return (
    <>
      <span className="inline-flex items-center gap-r5">
        <Avatar name="Ada Lovelace" status="online" aria-hidden="true" />
        <span>Ada Lovelace — online</span>
      </span>
      <span className="inline-flex items-center gap-r5">
        <Avatar name="Grace Hopper" status="away" aria-hidden="true" />
        <span>Grace Hopper — away</span>
      </span>
      <span className="inline-flex items-center gap-r5">
        <Avatar name="Katherine Johnson" status="offline" aria-hidden="true" />
        <span>Katherine Johnson — offline</span>
      </span>
    </>
  );
}

/** `max` caps the visible avatars; the remainder collapses into a `+N` chip. */
export function Group() {
  return (
    <AvatarGroup max={3}>
      <Avatar name="Ada Lovelace" />
      <Avatar name="Grace Hopper" />
      <Avatar name="Katherine Johnson" />
      <Avatar name="Barbara Liskov" />
      <Avatar name="Alan Turing" />
    </AvatarGroup>
  );
}

/** The group's `size` only drives the overlap and the `+N` chip — set it on each child too. */
export function GroupSizing() {
  return (
    <AvatarGroup max={2} size="sm">
      <Avatar name="Ada Lovelace" size="sm" />
      <Avatar name="Grace Hopper" size="sm" />
      <Avatar name="Katherine Johnson" size="sm" />
    </AvatarGroup>
  );
}
