import { Row } from "../layout/Row";

import { Card } from "./Card";
import { Carousel } from "./Carousel";
import { Swimlane } from "./Swimlane";

/** A titled shelf. Swimlane renders the heading and the section; the scrolling row is yours. */
export function Minimal() {
  return (
    <Swimlane title="Continue watching">
      <Row className="relative overflow-x-auto px-r5 pb-r5">
        <Card className="w-56 shrink-0">The Ascent — 24 min left</Card>
        <Card className="w-56 shrink-0">Blue Planet II — 12 min left</Card>
        <Card className="w-56 shrink-0">Chef's Table — 41 min left</Card>
      </Row>
    </Swimlane>
  );
}

/** `subtitle` sits under the heading; `viewAllHref` renders a right-aligned link labelled "View all". */
export function HeaderSlots() {
  return (
    <Swimlane
      title="New releases"
      subtitle="Added in the last seven days"
      viewAllHref="/browse/new-releases"
    >
      <Row className="relative overflow-x-auto px-r5 pb-r5">
        <Card className="w-56 shrink-0">Dune: Part Two</Card>
        <Card className="w-56 shrink-0">Poor Things</Card>
        <Card className="w-56 shrink-0">The Zone of Interest</Card>
      </Row>
    </Swimlane>
  );
}

/**
 * Swimlane adds no overflow, no snap points and no tabindex — put all three on your own body
 * element, and `relative` with them. A scrollport that is not a containing block lets every
 * absolutely-positioned descendant resolve outside its own clip and stretch the page; the
 * library's visually-hidden text is `position: absolute` with no offsets, so one `Badge` on a
 * card is enough to trigger it.
 */
export function ScrollSnapLane() {
  return (
    <Swimlane title="Because you watched Arrival">
      <div
        tabIndex={0}
        role="group"
        aria-label="Because you watched Arrival"
        className="relative flex gap-r4 overflow-x-auto snap-x snap-mandatory px-r5 pb-r5"
      >
        <Card className="w-56 shrink-0 snap-start">Interstellar</Card>
        <Card className="w-56 shrink-0 snap-start">Annihilation</Card>
        <Card className="w-56 shrink-0 snap-start">Contact</Card>
      </div>
    </Swimlane>
  );
}

/** Carousel supplies the scroll container, snap points, arrow buttons and arrow-key scrolling. */
export function WithCarousel() {
  return (
    <Swimlane title="Trending now" viewAllHref="/browse/trending">
      <Carousel aria-label="Trending now">
        <Carousel.Track>
          <Carousel.Item>
            <Card>Shōgun</Card>
          </Carousel.Item>
          <Carousel.Item>
            <Card>Ripley</Card>
          </Carousel.Item>
          <Carousel.Item>
            <Card>Fallout</Card>
          </Carousel.Item>
        </Carousel.Track>
      </Carousel>
    </Swimlane>
  );
}

/** `animation` chooses the entrance the whole lane — header included — plays on first sight. */
export function RevealAnimations() {
  return (
    <>
      <Swimlane title="Award winners" animation="fade-up">
        <Row className="relative overflow-x-auto px-r5 pb-r5">
          <Card className="w-56 shrink-0">Oppenheimer</Card>
        </Row>
      </Swimlane>
      <Swimlane title="Documentaries" animation="fade-right">
        <Row className="relative overflow-x-auto px-r5 pb-r5">
          <Card className="w-56 shrink-0">Free Solo</Card>
        </Row>
      </Swimlane>
      <Swimlane title="Short films" animation="scale">
        <Row className="relative overflow-x-auto px-r5 pb-r5">
          <Card className="w-56 shrink-0">The Silent Child</Card>
        </Row>
      </Swimlane>
    </>
  );
}

/** `once={false}` re-hides the lane when it leaves the viewport, so the entrance replays on the way back. */
export function ReplayOnEveryScroll() {
  return (
    <Swimlane title="Keep watching" once={false}>
      <Row className="relative overflow-x-auto px-r5 pb-r5">
        <Card className="w-56 shrink-0">Slow Horses</Card>
        <Card className="w-56 shrink-0">Severance</Card>
      </Row>
    </Swimlane>
  );
}
