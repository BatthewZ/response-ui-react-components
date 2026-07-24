import { Card } from "./Card";

/** A surface for grouping related content: a themed background, rounded corners, a shadow, and padding. */
export function Minimal() {
  return (
    <Card>
      <h3 className="text-h5 text-fg-primary">Monthly report</h3>
      <p className="text-body-2 text-fg-secondary">
        Your team shipped 42 pull requests and closed 18 issues this month.
      </p>
    </Card>
  );
}

/** `padding` sets the interior inset from the responsive `r`-scale — `r1` is the roomiest, `r6` the tightest. */
export function Padding() {
  return (
    <>
      <Card padding="r5">
        <p className="text-body-2 text-fg-primary">Tight — r5</p>
      </Card>
      <Card padding="r3">
        <p className="text-body-2 text-fg-primary">Default — r3</p>
      </Card>
      <Card padding="r1">
        <p className="text-body-2 text-fg-primary">Roomy — r1</p>
      </Card>
    </>
  );
}

/** `shadow` raises the card off the page: `sm`, `md` (default), `lg`. */
export function Elevation() {
  return (
    <>
      <Card shadow="sm">
        <p className="text-body-2 text-fg-primary">Resting — sm</p>
      </Card>
      <Card shadow="md">
        <p className="text-body-2 text-fg-primary">Raised — md</p>
      </Card>
      <Card shadow="lg">
        <p className="text-body-2 text-fg-primary">Floating — lg</p>
      </Card>
    </>
  );
}

/** Card is an empty container — build header, body, and footer regions with your own markup. */
export function Composed() {
  return (
    <Card padding="r2">
      <header className="text-h5 text-fg-primary">Invite teammates</header>
      <p className="text-body-2 text-fg-secondary">
        Anyone with the link can join the Design workspace.
      </p>
      <footer className="text-body-3 text-fg-muted">Link expires in 7 days.</footer>
    </Card>
  );
}
