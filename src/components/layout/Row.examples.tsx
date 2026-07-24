import { Button } from "../ui/Button";

import { Row } from "./Row";

/** Lay children out in a horizontal row — themed gap, vertically centered, no wrap. */
export function Minimal() {
  return (
    <Row>
      <Button variant="primary">Publish</Button>
      <Button variant="secondary">Save draft</Button>
    </Row>
  );
}

/** `align` sets the cross axis. `start` top-aligns a fixed element beside a taller block,
 *  instead of the default `center`. */
export function Alignment() {
  return (
    <Row align="start">
      <img
        src="/avatars/jordan.png"
        alt="Jordan Lee"
        className="size-10 rounded-full"
      />
      <div>
        <p className="font-semibold">Jordan Lee</p>
        <p className="text-fg-secondary">Product designer · joined 2021</p>
      </div>
    </Row>
  );
}

/** `justify="between"` pushes the first and last child to the edges — a title bar. */
export function Distribute() {
  return (
    <Row justify="between">
      <h2 className="text-h4">Team members</h2>
      <Button size="sm">Invite</Button>
    </Row>
  );
}

/** `gap` draws from the responsive spacing scale, which is inverted — `r1` is the
 *  widest step and `r6` the tightest. Same two rows, gap the only difference. */
export function GapScale() {
  return (
    <>
      <Row gap="r6">
        <span>Draft</span>
        <span>In review</span>
        <span>Published</span>
      </Row>
      <Row gap="r1">
        <span>Draft</span>
        <span>In review</span>
        <span>Published</span>
      </Row>
    </>
  );
}

/** Without `wrap`, children overflow a narrow container; `wrap` flows them onto new
 *  lines with the same `gap` between wrapped rows. */
export function Wrapping() {
  return (
    <Row wrap gap="r4">
      <span>Design</span>
      <span>Engineering</span>
      <span>Marketing</span>
      <span>Sales</span>
      <span>Support</span>
      <span>Operations</span>
    </Row>
  );
}

/** `as` swaps the element while keeping the row layout — a `<nav>` landmark here, so
 *  its links stay semantic. */
export function AsNav() {
  return (
    <Row as="nav" gap="r3" aria-label="Primary">
      <a href="/dashboard">Dashboard</a>
      <a href="/projects">Projects</a>
      <a href="/settings">Settings</a>
    </Row>
  );
}
