import { Alert } from "./Alert";
import { Button } from "./Button";

const retrySave = () => {};

/** The default: an `info` alert. `variant` defaults to `info`, so it can be omitted. */
export function Minimal() {
  return <Alert>Your changes are saved automatically as you type.</Alert>;
}

/** Four semantic variants. Each only re-tints — fill, text, and border all read the
 *  matching `--C-STATUS-*` pair, so the shape never changes. */
export function Variants() {
  return (
    <>
      <Alert variant="info">A new dashboard layout is available in settings.</Alert>
      <Alert variant="success">Invoice #4021 was sent to the customer.</Alert>
      <Alert variant="warning">Your trial ends in 3 days.</Alert>
      <Alert variant="error">We couldn't reach the payment provider.</Alert>
    </>
  );
}

/** Children are rendered as-is inside a flex row — compose a heading and body yourself. */
export function WithTitle() {
  return (
    <Alert variant="warning">
      <div>
        <strong>Storage almost full</strong>
        <p>You're using 9.4 GB of your 10 GB quota. Remove files or upgrade your plan.</p>
      </div>
    </Alert>
  );
}

/** The hidden `statusLabel` reaches screen readers, but on screen the variant is still
 *  tint alone. Prefix a visible label (or an icon with an accessible name) so the
 *  severity survives greyscale — and drop the hidden word once the text repeats it,
 *  or it is announced twice. */
export function LabelledForColorBlindness() {
  return (
    <Alert variant="error" statusLabel="">
      <strong>Error:</strong> The uploaded file exceeds the 25 MB limit.
    </Alert>
  );
}

/** `error` already announces `assertive`; the attribute is written before the rest
 *  spread, so an explicit one still wins — that is how another variant is promoted to
 *  the same urgency, or this one demoted. Children can include an action. */
export function UrgentError() {
  return (
    <Alert variant="error" aria-live="assertive">
      <div>
        <strong>Payment failed.</strong> Your card was declined.
      </div>
      <Button variant="danger" size="sm" onClick={retrySave}>
        Retry
      </Button>
    </Alert>
  );
}
