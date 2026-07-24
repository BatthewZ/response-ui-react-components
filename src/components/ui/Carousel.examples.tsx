import { type CSSProperties } from "react";

import { Button } from "./Button";
import { Card } from "./Card";
import { Carousel } from "./Carousel";
import { MediaCard } from "./MediaCard";
import { Text } from "./Text";

/** `title` labels the carousel and is what screen readers announce for the region. */
export function Minimal() {
  return (
    <Carousel title="Continue watching">
      <Carousel.Track>
        <Carousel.Item>
          <Card>Shōgun · Episode 4</Card>
        </Carousel.Item>
        <Carousel.Item>
          <Card>Ripley · Episode 2</Card>
        </Carousel.Item>
        <Carousel.Item>
          <Card>Fallout · Episode 7</Card>
        </Carousel.Item>
      </Carousel.Track>
    </Carousel>
  );
}

/** Slides are full-width until `--carousel-item-width` says otherwise; set it on the root and it inherits. */
export function SlidesPerView() {
  return (
    <Carousel title="Trending now" style={{ "--carousel-item-width": "14rem" } as CSSProperties}>
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
        <Carousel.Item>
          <Card>Severance</Card>
        </Carousel.Item>
        <Carousel.Item>
          <Card>The Bear</Card>
        </Carousel.Item>
      </Carousel.Track>
    </Carousel>
  );
}

/** A poster rail: one `MediaCard` per slide, with the slide width doing the sizing. */
export function PosterRow() {
  return (
    <Carousel title="New releases" style={{ "--carousel-item-width": "11rem" } as CSSProperties}>
      <Carousel.Track>
        <Carousel.Item>
          <MediaCard>
            <MediaCard.Image src="/media/the-quiet-shore.jpg" alt="Poster for The Quiet Shore" />
            <MediaCard.Overlay />
            <MediaCard.Content>
              <Text as="h3" variant="h5">
                The Quiet Shore
              </Text>
            </MediaCard.Content>
          </MediaCard>
        </Carousel.Item>
        <Carousel.Item>
          <MediaCard>
            <MediaCard.Image src="/media/tromso-aurora.jpg" alt="Poster for Northern Lights" />
            <MediaCard.Overlay />
            <MediaCard.Content>
              <Text as="h3" variant="h5">
                Northern Lights
              </Text>
            </MediaCard.Content>
          </MediaCard>
        </Carousel.Item>
        <Carousel.Item>
          <MediaCard>
            <MediaCard.Image src="/media/ada-lovelace.jpg" alt="Poster for The Analyst" />
            <MediaCard.Overlay />
            <MediaCard.Content>
              <Text as="h3" variant="h5">
                The Analyst
              </Text>
            </MediaCard.Content>
          </MediaCard>
        </Carousel.Item>
      </Carousel.Track>
    </Carousel>
  );
}

/** Links and buttons work inside a slide — a click that followed a drag is swallowed, a real click is not. */
export function ActionableSlides() {
  return (
    <Carousel title="Browse by genre" style={{ "--carousel-item-width": "12rem" } as CSSProperties}>
      <Carousel.Track>
        <Carousel.Item>
          <Card>
            <Button as="a" href="/browse/drama" variant="link">
              Drama
            </Button>
          </Card>
        </Carousel.Item>
        <Carousel.Item>
          <Card>
            <Button as="a" href="/browse/documentary" variant="link">
              Documentary
            </Button>
          </Card>
        </Carousel.Item>
        <Carousel.Item>
          <Card>
            <Button as="a" href="/browse/comedy" variant="link">
              Comedy
            </Button>
          </Card>
        </Carousel.Item>
      </Carousel.Track>
    </Carousel>
  );
}

/** With no `title`, the root falls back to `aria-label="Carousel"` — pass your own to say something useful. */
export function LabelledWithoutTitle() {
  return (
    <Carousel aria-label="Recommended for you">
      <Carousel.Track>
        <Carousel.Item>
          <Card>Slow Horses</Card>
        </Carousel.Item>
        <Carousel.Item>
          <Card>Andor</Card>
        </Carousel.Item>
      </Carousel.Track>
    </Carousel>
  );
}
