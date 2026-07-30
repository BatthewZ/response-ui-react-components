import { Badge } from "./Badge";
import { Card } from "./Card";
import { MasonryGrid } from "./MasonryGrid";

/** Wrap every child in `MasonryGrid.Item` — that is what keeps a card whole across a column break. */
export function Minimal() {
  return (
    <MasonryGrid columns={3} gap="r4">
      <MasonryGrid.Item>
        <Card>Ship the OKLCH ramp</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>
          Design review — the dark end of the surface ramp collapses at surface-2, so the
          card edge disappears against the page. Add one more step.
        </Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Rewrite the onboarding copy</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>
          Retro actions: cut the Friday deploy freeze, move the contrast audit into CI.
        </Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Audit focus rings</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Bump the CSS package to 0.9.0 before the release branch cuts.</Card>
      </MasonryGrid.Item>
    </MasonryGrid>
  );
}

/** One column on phones, widening at each breakpoint. Only counts of 2, 3 and 4 have CSS rules. */
export function ResponsiveColumns() {
  return (
    <MasonryGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }}>
      <MasonryGrid.Item>
        <Card>Q3 roadmap</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>
          Changelog — 0.8.3 fixes the Radio focus indicator and adds the theme-contract
          guard to CI.
        </Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Support inbox digest</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Uptime is 99.98% for the month, with one 4-minute incident on the 12th.</Card>
      </MasonryGrid.Item>
    </MasonryGrid>
  );
}

/** `gap` takes a spacing token. It sets both the column gutter and the space under each item. */
export function CustomGap() {
  return (
    <MasonryGrid columns={2} gap="r6">
      <MasonryGrid.Item>
        <Card>Weekly metrics</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Signups are up 12% week over week, driven mostly by the docs launch.</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Churn held flat</Card>
      </MasonryGrid.Item>
    </MasonryGrid>
  );
}

/** `animation` picks the entrance every item plays; each one is offset by 50ms per index. */
export function ScaleEntrance() {
  return (
    <MasonryGrid columns={3} animation="scale">
      <MasonryGrid.Item>
        <Card>Ada Lovelace</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Grace Hopper</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Katherine Johnson</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Radia Perlman</Card>
      </MasonryGrid.Item>
    </MasonryGrid>
  );
}

/**
 * `animate={false}` renders items visible from the first paint — and is the only mode in
 * which an item's own attributes reach the DOM.
 */
export function NoAnimation() {
  return (
    <MasonryGrid columns={3} animate={false}>
      <MasonryGrid.Item id="note-release" data-status="blocked">
        <Card>
          <Badge variant="error">Blocked</Badge> Release checklist
        </Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Migrate the token tables to the generated table script.</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item>
        <Card>Draft the 0.9.0 announcement</Card>
      </MasonryGrid.Item>
    </MasonryGrid>
  );
}

/**
 * The root is a plain `div`, so `id`, `role`, `aria-label` and the rest pass straight
 * through — unlike an item's.
 */
export function LabelledRegion() {
  return (
    <MasonryGrid
      columns={{ base: 1, md: 2 }}
      animate={false}
      id="pinboard"
      role="list"
      aria-label="Pinned notes"
    >
      <MasonryGrid.Item role="listitem">
        <Card>Contrast audit — 4 of 6 themes fail AA on muted text.</Card>
      </MasonryGrid.Item>
      <MasonryGrid.Item role="listitem">
        <Card>Ship the renderer draft</Card>
      </MasonryGrid.Item>
    </MasonryGrid>
  );
}
