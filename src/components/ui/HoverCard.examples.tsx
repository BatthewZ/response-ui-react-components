import { useState } from "react";

import { Avatar } from "./Avatar";
import { HoverCard } from "./HoverCard";

/** A preview on a real link: the link still does its job for everyone who never hovers. */
export function Minimal() {
  return (
    <HoverCard>
      <HoverCard.Trigger asChild>
        <a href="/people/ada-lovelace">Ada Lovelace</a>
      </HoverCard.Trigger>
      <HoverCard.Content aria-label="About Ada Lovelace">
        <p>Mathematician. Published the first algorithm intended for a machine, in 1843.</p>
      </HoverCard.Content>
    </HoverCard>
  );
}

/** The canonical case — an avatar and name you hover for the profile behind them. */
export function ProfileCard() {
  return (
    <HoverCard>
      <HoverCard.Trigger asChild>
        <a href="/people/ada-lovelace" className="inline-flex items-center gap-r5">
          <Avatar name="Ada Lovelace" size="sm" aria-hidden="true" />
          Ada Lovelace
        </a>
      </HoverCard.Trigger>
      <HoverCard.Content aria-label="Ada Lovelace">
        <div className="flex items-center gap-r5">
          <Avatar name="Ada Lovelace" />
          <div>
            <p className="font-semibold">Ada Lovelace</p>
            <p className="text-fg-secondary">@ada · Analytical Engine</p>
          </div>
        </div>
        <p className="text-fg-secondary">
          Mathematician, London. 41 repositories, 12 followers.
        </p>
      </HoverCard.Content>
    </HoverCard>
  );
}

/** Without `asChild` the trigger is a plain `<span>`: hover-only, never focusable. */
export function TextTrigger() {
  return (
    <HoverCard>
      <HoverCard.Trigger>4f21a9c</HoverCard.Trigger>
      <HoverCard.Content aria-label="Commit 4f21a9c">
        <p>Fix OKLCH rounding in the theme compiler</p>
        <p className="text-fg-secondary">Grace Hopper committed 3 days ago</p>
      </HoverCard.Content>
    </HoverCard>
  );
}

/** Slower to open, slower to close — a longer trip from trigger to card stays forgiving. */
export function Delays() {
  return (
    <HoverCard openDelay={600} closeDelay={300}>
      <HoverCard.Trigger asChild>
        <a href="/people/grace-hopper">Grace Hopper</a>
      </HoverCard.Trigger>
      <HoverCard.Content aria-label="About Grace Hopper">
        <p>Rear Admiral, United States Navy. Built the first compiler.</p>
      </HoverCard.Content>
    </HoverCard>
  );
}

/** `placement` is a preference: the card flips to the opposite side rather than overflow. */
export function Placement() {
  return (
    <HoverCard placement="right-start">
      <HoverCard.Trigger asChild>
        <a href="/people/katherine-johnson">Katherine Johnson</a>
      </HoverCard.Trigger>
      <HoverCard.Content aria-label="About Katherine Johnson">
        <p>Orbital mechanics for Mercury-Redstone 3 and Apollo 11.</p>
      </HoverCard.Content>
    </HoverCard>
  );
}

/** Controlled: hover only asks, through `onOpenChange`, and your `open` state decides. */
export function Controlled() {
  const [open, setOpen] = useState(false);

  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCard.Trigger asChild>
        <a href="/deploys/4f21a9c">Production deploy</a>
      </HoverCard.Trigger>
      <HoverCard.Content aria-label="Production deploy 4f21a9c">
        <p>Deployed 20 minutes ago by Grace Hopper. 14 commits since the last release.</p>
      </HoverCard.Content>
    </HoverCard>
  );
}
