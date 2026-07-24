import { Container } from "../layout/Container";
import { Row } from "../layout/Row";
import { Stack } from "../layout/Stack";
import { Button } from "./Button";
import { Hero } from "./Hero";
import { Text } from "./Text";

/** Background image, scrim, content — the three layers, in DOM order. */
export function Minimal() {
  return (
    <Hero>
      <Hero.Background src="/images/harbour-at-dusk.jpg" />
      <Hero.Content>
        <Text variant="h1" color="on-primary">
          Harbour tours, every evening
        </Text>
        <Text variant="body-1" color="on-primary">
          Ninety minutes on the water, departing at sunset.
        </Text>
      </Hero.Content>
    </Hero>
  );
}

/** `size` sets a `min-height` in `vh`: 40 / 60 / 80 / 100. */
export function Sizes() {
  return (
    <>
      <Hero size="sm">
        <Hero.Content>40vh — a section banner</Hero.Content>
      </Hero>
      <Hero size="md">
        <Hero.Content>60vh — the default</Hero.Content>
      </Hero>
      <Hero size="lg">
        <Hero.Content>80vh — a landing-page header</Hero.Content>
      </Hero>
      <Hero size="full">
        <Hero.Content>100vh — a full-viewport splash</Hero.Content>
      </Hero>
    </>
  );
}

/** `align` is the flex cross axis — it moves content **vertically**, not left/right. */
export function Alignment() {
  return (
    <>
      <Hero size="sm" align="start">
        <Hero.Content>Pinned to the top edge</Hero.Content>
      </Hero>
      <Hero size="sm" align="center">
        <Hero.Content>Centred between the edges</Hero.Content>
      </Hero>
      <Hero size="sm" align="end">
        <Hero.Content>Sitting on the bottom edge — the default</Hero.Content>
      </Hero>
    </>
  );
}

/** A fill instead of a photo: `overlay={false}`, and `on-primary` ink is then contract-guaranteed. */
export function BrandFill() {
  return (
    <Hero size="sm" align="center" overlay={false}>
      <Hero.Background className="bg-primary" />
      <Hero.Content>
        <Stack gap="r4">
          <Text variant="h2" color="on-primary">
            Every component reads the same token contract
          </Text>
          <Button variant="ghost-inverse" className="self-start">
            Read the docs
          </Button>
        </Stack>
      </Hero.Content>
    </Hero>
  );
}

/** Cap the measure and lay the actions out yourself — the content block only adds padding. */
export function CallToAction() {
  return (
    <Hero size="lg">
      <Hero.Background src="/images/harbour-at-dusk.jpg" />
      <Hero.Content>
        <Container size="xl">
          <Stack gap="r4">
            <Text variant="h1" color="on-primary">
              Harbour tours, every evening
            </Text>
            <Text variant="body-1" color="on-primary">
              Ninety minutes on the water, departing at sunset.
            </Text>
            <Row gap="r5">
              <Button type="button">Book a tour</Button>
              <Button type="button" variant="ghost-inverse">
                Watch the trailer
              </Button>
            </Row>
          </Stack>
        </Container>
      </Hero.Content>
    </Hero>
  );
}

/** Describe the image only when it carries meaning the copy doesn't; otherwise leave `alt` off. */
export function DescribedBackground() {
  return (
    <Hero size="sm" align="center">
      <Hero.Background
        src="/images/keynote-stage-2026.jpg"
        alt="The 2026 keynote stage, seen from the back of a full hall"
      />
      <Hero.Content>
        <Text variant="h2" color="on-primary">
          Tickets for 2026 are live
        </Text>
      </Hero.Content>
    </Hero>
  );
}

/** `parallax` hands the image to Parallax and grows the layer to 200% height so it can travel. */
export function ParallaxBackground() {
  return (
    <Hero size="lg" align="center">
      <Hero.Background src="/images/alpine-ridge.jpg" parallax parallaxRate={0.2} />
      <Hero.Content>
        <Text variant="h1" color="on-primary">
          Two weeks above the tree line
        </Text>
      </Hero.Content>
    </Hero>
  );
}

/** `animate` fades the whole content block in the first time the section scrolls into view. */
export function AnimatedContent() {
  return (
    <Hero size="lg" align="center">
      <Hero.Background src="/images/studio-desk.jpg" />
      <Hero.Content animate animation="fade-in">
        <Text variant="h1" color="on-primary">
          Built for teams that ship
        </Text>
        <Text variant="body-1" color="on-primary">
          The whole block enters together — see Gotchas before you expect a cascade.
        </Text>
        <Button type="button" variant="ghost-inverse">
          Start a trial
        </Button>
      </Hero.Content>
    </Hero>
  );
}
