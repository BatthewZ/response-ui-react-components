import { Badge } from "./Badge";
import { Button } from "./Button";
import { MediaCard } from "./MediaCard";
import { Text } from "./Text";

/** Poster art, a gradient scrim over it, and a caption pinned to the bottom edge. */
export function Minimal() {
  return (
    <MediaCard>
      <MediaCard.Image src="/media/the-quiet-shore.jpg" alt="Poster for The Quiet Shore" />
      <MediaCard.Overlay />
      <MediaCard.Content>
        <Text as="h3" variant="h5">
          The Quiet Shore
        </Text>
        <Text variant="body-3" color="secondary">
          2024 · Drama · 1h 52m
        </Text>
      </MediaCard.Content>
    </MediaCard>
  );
}

/** `orientation` sets the image box's aspect ratio; the root hands it to `Image` through context. */
export function Orientations() {
  return (
    <>
      <MediaCard orientation="portrait">
        <MediaCard.Image src="/media/the-quiet-shore.jpg" alt="Poster for The Quiet Shore" />
      </MediaCard>
      <MediaCard orientation="landscape">
        <MediaCard.Image src="/media/tromso-aurora.jpg" alt="Aurora over Tromsø" />
      </MediaCard>
      <MediaCard orientation="square">
        <MediaCard.Image src="/media/ada-lovelace.jpg" alt="Portrait of Ada Lovelace" />
      </MediaCard>
    </>
  );
}

/** No `Overlay`, no `Content`: a ratio-locked, corner-clipped, hover-lifting picture frame. */
export function ImageOnly() {
  return (
    <MediaCard orientation="square">
      <MediaCard.Image src="/media/ada-lovelace.jpg" alt="Portrait of Ada Lovelace" />
    </MediaCard>
  );
}

/** `MediaCard.Badge` is a corner position, not a chip — put a real chip inside it. */
export function CornerChip() {
  return (
    <MediaCard orientation="landscape">
      <MediaCard.Image src="/media/tromso-aurora.jpg" alt="Aurora over Tromsø" />
      <MediaCard.Badge>
        <Badge variant="info">New</Badge>
      </MediaCard.Badge>
      <MediaCard.Overlay />
      <MediaCard.Content>
        <Text as="h3" variant="h5">
          Northern Lights, Tromsø
        </Text>
      </MediaCard.Content>
    </MediaCard>
  );
}

/** `Action` centres its children over the whole card — make it the card's only click target. */
export function CentredAction() {
  return (
    <MediaCard orientation="landscape">
      <MediaCard.Image src="/media/the-quiet-shore-still.jpg" alt="Still from The Quiet Shore" />
      <MediaCard.Overlay />
      <MediaCard.Action>
        <Button type="button" size="sm">
          Play trailer
        </Button>
      </MediaCard.Action>
    </MediaCard>
  );
}

/** `Image` sets `loading="lazy"` before spreading `imgProps`, so a hero card can opt back out. */
export function EagerImage() {
  return (
    <MediaCard orientation="landscape">
      <MediaCard.Image
        src="/media/tromso-aurora.jpg"
        alt="Aurora over Tromsø"
        imgProps={{ loading: "eager" }}
      />
      <MediaCard.Overlay />
      <MediaCard.Content>
        <Text as="h3" variant="h5">
          Northern Lights, Tromsø
        </Text>
      </MediaCard.Content>
    </MediaCard>
  );
}
