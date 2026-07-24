import { Center } from "../layout";

import { Button } from "./Button";
import { Spinner } from "./Spinner";

/** The default: a 1.5rem ring, inked with whatever text colour it inherits. */
export function Minimal() {
  return <Spinner />;
}

/** Three fixed sizes — 1rem, 1.5rem, 2rem. */
export function Sizes() {
  return (
    <>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </>
  );
}

/** The ring is `border-current`, so it re-tints from `color` — set on the Spinner
 *  itself, or inherited from any ancestor. */
export function Tinted() {
  return (
    <>
      <Spinner className="text-accent" />
      <div className="text-status-error">
        <Spinner size="sm" />
      </div>
    </>
  );
}

/** `className` is merged last, so a diameter or a ring width can override the defaults. */
export function CustomGeometry() {
  return <Spinner className="size-12 border-4" />;
}

/** Button has no `loading` prop — compose one, and its per-size gap does the spacing. */
export function InsideButton() {
  return (
    <Button disabled>
      <Spinner size="sm" />
      Saving…
    </Button>
  );
}

/** The full-page wait — what RequireAuth renders by default while `status` is `"loading"`. */
export function FullPageLoad() {
  return (
    <Center className="min-h-screen">
      <Spinner size="lg" />
    </Center>
  );
}

/** Own the announcement: label the region yourself, and hide the spinner from assistive tech.
 *  Caveat: this region mounts already full, which screen readers announce inconsistently — for
 *  a wait that must be spoken, render the region up front and change the text inside it. */
export function LabelledRegion() {
  return (
    <div role="status" className="flex items-center gap-r5 text-fg-secondary">
      <Spinner size="sm" aria-hidden />
      <span>Uploading 3 of 12 files…</span>
    </div>
  );
}
