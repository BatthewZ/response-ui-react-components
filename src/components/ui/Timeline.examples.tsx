import { CheckCircle2, Package, Truck } from "lucide-react";

import { Timeline } from "./Timeline";

/** One `Item` per event. `title` is required; `date` and the body `children` are optional. */
export function Minimal() {
  return (
    <Timeline>
      <Timeline.Item date="12 March" title="Order placed">
        Three items, paid with the card ending 4242.
      </Timeline.Item>
      <Timeline.Item date="13 March" title="Left the warehouse">
        Handed to the courier in Rotterdam.
      </Timeline.Item>
      <Timeline.Item date="15 March" title="Delivered">
        Signed for by Ada Lovelace.
      </Timeline.Item>
    </Timeline>
  );
}

/** `align` puts the rail on one side instead of down the middle. Single-column at every width — no reflow at 40rem. */
export function RailAlignment() {
  return (
    <Timeline align="left" animate={false}>
      <Timeline.Item date="09:14" title="Build queued">
        Commit <code>a1b2c3d</code> on <code>main</code>.
      </Timeline.Item>
      <Timeline.Item date="09:21" title="Tests passed">
        1,284 tests, no retries.
      </Timeline.Item>
      <Timeline.Item date="09:23" title="Deployed to production" />
    </Timeline>
  );
}

/** `align="right"` mirrors it. Cards sit left of the rail and enter from the left; the text stays ragged-right. */
export function RailRight() {
  return (
    <Timeline align="right" animate={false}>
      <Timeline.Item date="09:14" title="Build queued" />
      <Timeline.Item date="09:21" title="Tests passed" />
      <Timeline.Item date="09:23" title="Deployed to production" />
    </Timeline>
  );
}

/** The dashboard shape: a side rail, tight rhythm, no card chrome and no entrance. Three independent props. */
export function DenseFeed() {
  return (
    <Timeline align="left" density="dense" card={false} animate={false}>
      <Timeline.Item date="09:14:02" title="Build queued" />
      <Timeline.Item date="09:21:47" title="Tests passed" />
      <Timeline.Item date="09:22:10" title="Image pushed" />
      <Timeline.Item date="09:23:55" title="Deployed to production" />
      <Timeline.Item date="09:41:08" title="Health check green" />
    </Timeline>
  );
}

/** `density` and `card` are separate axes, so a spacious flat timeline is reachable too. */
export function SpaciousFlat() {
  return (
    <Timeline align="left" density="spacious" card={false} animate={false}>
      <Timeline.Item date="2019" title="Founded">
        Two people and a rented server.
      </Timeline.Item>
      <Timeline.Item date="2022" title="Series A">
        Enough runway to stop counting.
      </Timeline.Item>
    </Timeline>
  );
}

/** `icon` replaces the dot, at any size — the node is centred by a translate, so `density` changing the dot never shifts it. */
export function CustomIcons() {
  return (
    <Timeline>
      <Timeline.Item icon={<Package size={14} aria-hidden />} date="12 March" title="Order placed">
        Three items, paid with the card ending 4242.
      </Timeline.Item>
      <Timeline.Item icon={<Truck size={14} aria-hidden />} date="13 March" title="Out for delivery">
        Handed to the courier in Rotterdam.
      </Timeline.Item>
      <Timeline.Item icon={<CheckCircle2 size={14} aria-hidden />} date="15 March" title="Delivered">
        Signed for by Ada Lovelace.
      </Timeline.Item>
    </Timeline>
  );
}

/** Drop `date` and the children and an entry collapses to a single titled card. */
export function TitlesOnly() {
  return (
    <Timeline>
      <Timeline.Item title="Repository created" />
      <Timeline.Item title="First release tagged" />
      <Timeline.Item title="Published to npm" />
    </Timeline>
  );
}

/** `animate={false}` paints every entry immediately — and is the only path on which an item's own props reach the DOM. */
export function NoAnimation() {
  return (
    <Timeline animate={false}>
      <Timeline.Item id="release-0-8-3" data-status="shipped" date="0.8.3" title="Radio focus ring">
        The keyboard focus indicator now changes by more than zero pixels.
      </Timeline.Item>
      <Timeline.Item id="release-0-9-0" data-status="draft" date="0.9.0" title="Contrast guard">
        A ratio check over every theme file runs in CI.
      </Timeline.Item>
    </Timeline>
  );
}

/** List semantics: `role` lands on the root either way, but `role="listitem"` needs `animate={false}`. */
export function SemanticList() {
  return (
    <Timeline animate={false} role="list" aria-label="Order history">
      <Timeline.Item role="listitem" date="12 March" title="Order placed" />
      <Timeline.Item role="listitem" date="13 March" title="Left the warehouse" />
      <Timeline.Item role="listitem" date="15 March" title="Delivered" />
    </Timeline>
  );
}
