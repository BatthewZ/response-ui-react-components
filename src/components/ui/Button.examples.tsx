import { Button } from "./Button";
import { Spinner } from "./Spinner";

const save = () => {};

/** The default: primary fill, medium size. */
export function Minimal() {
  return <Button onClick={save}>Save changes</Button>;
}

/** Six variants, ordered by emphasis. */
export function Variants() {
  return (
    <>
      <Button variant="primary">Save changes</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="ghost">Filter</Button>
      <Button variant="danger">Delete account</Button>
      <Button variant="link">Learn more</Button>
    </>
  );
}

/** `ghost-inverse` is the ghost variant for fill backgrounds — its ink is
 *  `fg-on-primary`, which the contrast contract only guarantees against a fill
 *  token, never against a surface. */
export function GhostOnFillBackground() {
  return (
    <div className="bg-primary p-r4">
      <Button variant="ghost-inverse">Watch trailer</Button>
    </div>
  );
}

/** Size changes type scale and padding together, both responsive. */
export function Sizes() {
  return (
    <>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </>
  );
}

/** `as` swaps the element and re-types the props — `href` is valid here. */
export function AsLink() {
  return (
    <Button as="a" href="/pricing" variant="link" size="sm">
      See pricing
    </Button>
  );
}

/** There is no `loading` prop. Compose one from Spinner — the button's own
 *  per-size gap spaces the spinner off the label, so no wrapper is needed. */
export function Loading() {
  return (
    <Button disabled>
      <Spinner size="sm" />
      Saving…
    </Button>
  );
}
