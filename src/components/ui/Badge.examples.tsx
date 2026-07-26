import { TriangleAlert } from "lucide-react";

import { Badge } from "./Badge";

/** The default variant: a neutral chip on `surface-2`, sized from the `body-3` type scale. */
export function Minimal() {
  return <Badge>Draft</Badge>;
}

/** Five variants. Each swaps only the fill and the ink — padding, radius, and weight are identical. */
export function Variants() {
  return (
    <div className="flex flex-wrap gap-r6">
      <Badge variant="default">Draft</Badge>
      <Badge variant="success">Deployed</Badge>
      <Badge variant="warning">Degraded</Badge>
      <Badge variant="error">Failed</Badge>
      <Badge variant="info">Queued</Badge>
    </div>
  );
}

/** A screen reader hears the variant's hidden word, but on screen the tint is still the
 *  only difference — so the visible label has to carry the meaning: bare counts would read
 *  as two identical chips in greyscale. */
export function LabelledNotJustTinted() {
  return (
    <div className="flex flex-wrap gap-r6">
      <Badge variant="success">12 checks passed</Badge>
      <Badge variant="error">3 checks failed</Badge>
    </div>
  );
}

/** Children lay out in an `inline-flex` row with no gap of its own — add one, and hide a glyph
 *  the label already says. */
export function WithIcon() {
  return (
    <Badge variant="warning" className="gap-r6">
      <TriangleAlert size={12} aria-hidden />
      Certificate expires in 5 days
    </Badge>
  );
}

/** `inline-flex` keeps the chip in the text flow, so it sits beside a heading with no wrapper. */
export function BesideAHeading() {
  return (
    <h2 className="text-h4">
      Billing API <Badge variant="info">v2</Badge>
    </h2>
  );
}

/** Badge sets no role, so a chip whose text changes in place is silent — make it its own live
 *  region by passing one through. */
export function LiveStatus() {
  return (
    <Badge variant="info" role="status">
      Deploying…
    </Badge>
  );
}

/** `className` merges through `cn()`, so a later `rounded-*` or `px-*` replaces the built-in one
 *  instead of fighting it. */
export function PillShape() {
  return <Badge className="rounded-full px-r4">Enterprise plan</Badge>;
}
