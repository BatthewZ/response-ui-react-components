import { Card } from "../ui/Card";

import { Grid } from "./Grid";

/** Equal-width, equal-height cells. A single number sets the column count. */
export function Minimal() {
  return (
    <Grid columns={3} gap="r4">
      <Card>Revenue</Card>
      <Card>Active users</Card>
      <Card>Churn</Card>
    </Grid>
  );
}

/** Per-breakpoint counts: 1 column on mobile, 2 from `md`, 3 from `lg`. Mobile-first —
 *  each step holds until the next breakpoint overrides it. */
export function ResponsiveColumns() {
  return (
    <Grid columns={{ base: 1, md: 2, lg: 3 }} gap="r5">
      <Card>One</Card>
      <Card>Two</Card>
      <Card>Three</Card>
      <Card>Four</Card>
      <Card>Five</Card>
      <Card>Six</Card>
    </Grid>
  );
}

/** `gap` takes an r1–r6 spacing step and spaces rows and columns alike. */
export function Gap() {
  return (
    <Grid columns={2} gap="r6">
      <Card>One token…</Card>
      <Card>…controls both axes.</Card>
    </Grid>
  );
}

/** `as` swaps the element while keeping the grid — here a `<ul>` for a semantic list. */
export function AsList() {
  return (
    <Grid as="ul" columns={{ base: 2, md: 4 }} gap="r3">
      <li>Alpha</li>
      <li>Bravo</li>
      <li>Charlie</li>
      <li>Delta</li>
    </Grid>
  );
}
