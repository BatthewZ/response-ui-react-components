import { Button } from "./Button";
import { Spotlight } from "./Spotlight";
import { Text } from "./Text";

/** One feature: image in the left column, copy in the right. */
export function Minimal() {
  return (
    <Spotlight>
      <Spotlight.Item>
        <Spotlight.Image
          src="/images/deploy-timeline.png"
          alt="A deploy timeline showing three green releases"
        />
        <Spotlight.Content>
          <Text variant="h2">Ship on a Friday</Text>
          <Text variant="body-1">
            Every release is reviewable, reversible, and one click from a rollback.
          </Text>
          <Button as="a" href="/product/deploys">
            See how deploys work
          </Button>
        </Spotlight.Content>
      </Spotlight.Item>
    </Spotlight>
  );
}

/** Above 40rem every second item swaps its columns on its own — you pass nothing. */
export function Alternating() {
  return (
    <Spotlight>
      <Spotlight.Item>
        <Spotlight.Image src="/images/deploy-timeline.png" alt="A deploy timeline" />
        <Spotlight.Content>
          <Text variant="h3">Deploys</Text>
          <Text variant="body-2">First item — image left, copy right.</Text>
        </Spotlight.Content>
      </Spotlight.Item>
      <Spotlight.Item>
        <Spotlight.Image src="/images/incident-review.png" alt="An incident review thread" />
        <Spotlight.Content>
          <Text variant="h3">Incidents</Text>
          <Text variant="body-2">Second item — the columns swap themselves.</Text>
        </Spotlight.Content>
      </Spotlight.Item>
      <Spotlight.Item>
        <Spotlight.Image src="/images/cost-report.png" alt="A monthly cost report" />
        <Spotlight.Content>
          <Text variant="h3">Spend</Text>
          <Text variant="body-2">Third item — back to image left.</Text>
        </Spotlight.Content>
      </Spotlight.Item>
    </Spotlight>
  );
}

/** `reversed` inverts one item against its position; it does not pin the image to a side. */
export function Reversed() {
  return (
    <Spotlight>
      <Spotlight.Item reversed>
        <Spotlight.Image src="/images/audit-log.png" alt="An audit log filtered by actor" />
        <Spotlight.Content>
          <Text variant="h3">Audit log</Text>
          <Text variant="body-2">
            First item, so it would sit image-left by default. Reversed moves the image right.
          </Text>
        </Spotlight.Content>
      </Spotlight.Item>
    </Spotlight>
  );
}

/** Give the wrapper a height of its own and `object-fit: cover` starts cropping. */
export function CroppedImage() {
  return (
    <Spotlight>
      <Spotlight.Item>
        <Spotlight.Image
          className="h-64"
          src="/images/bristol-atrium.jpg"
          alt="The glass atrium of the Bristol office"
        />
        <Spotlight.Content>
          <Text variant="h3">Where we work</Text>
          <Text variant="body-2">
            The wrapper owns the height; the photograph fills it and crops to the centre.
          </Text>
        </Spotlight.Content>
      </Spotlight.Item>
    </Spotlight>
  );
}

/** `parallax` drifts the photograph as the page scrolls; `parallaxRate` sets how hard. */
export function ParallaxImage() {
  return (
    <Spotlight>
      <Spotlight.Item>
        <Spotlight.Image
          className="h-80"
          src="/images/harbour-at-dusk.jpg"
          alt="Fishing boats moored at dusk"
          parallax
          parallaxRate={0.08}
        />
        <Spotlight.Content>
          <Text variant="h3">Harbour tours</Text>
          <Text variant="body-2">Ninety minutes on the water, departing at sunset.</Text>
        </Spotlight.Content>
      </Spotlight.Item>
    </Spotlight>
  );
}

/** `animate={false}` drops the reveal wrapper, so the copy is visible from the first paint. */
export function WithoutAnimation() {
  return (
    <Spotlight animate={false}>
      <Spotlight.Item>
        <Spotlight.Image src="/images/pricing-tiers.png" alt="The three pricing tiers" />
        <Spotlight.Content>
          <Text variant="h3">Simple, transparent pricing</Text>
          <Text variant="body-2">Three tiers, billed monthly, no per-seat surprises.</Text>
        </Spotlight.Content>
      </Spotlight.Item>
    </Spotlight>
  );
}
