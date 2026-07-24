import { useState } from "react";

import { Rating } from "./Rating";

/** A five-star input. `aria-label` is required by the type — the stars carry no visible text. */
export function Minimal() {
  return <Rating aria-label="Rate this product" defaultValue={4} />;
}

/** `readOnly` swaps the radio group for a single `role="img"` node whose label is generated
 *  from the value. Halves render here without `allowHalf`, which governs input only. */
export function ReadOnlyAverage() {
  return (
    <div className="flex items-center gap-r5">
      <Rating aria-label="Average customer rating" value={4.5} readOnly />
      <span className="text-body-2 text-fg-secondary">4.5 out of 5 · 1,284 reviews</span>
    </div>
  );
}

/** Controlled: hold the score in your own state and pass `value` + `onValueChange`. */
export function Controlled() {
  const [score, setScore] = useState(3);

  return (
    <div className="flex items-center gap-r5">
      <Rating aria-label="Rate your driver" value={score} onValueChange={setScore} />
      <span className="text-body-2 text-fg-secondary">{score} out of 5</span>
    </div>
  );
}

/** `allowHalf` splits each star for the pointer: the left half commits `n − 0.5`, the right
 *  half `n`. It also drops the arrow-key step to 0.5. */
export function HalfStars() {
  return <Rating aria-label="Rate this recipe" allowHalf defaultValue={3.5} />;
}

/** `max` sets both the number of stars and the top of the value scale. */
export function TenPointScale() {
  return <Rating aria-label="Rate this film" max={10} defaultValue={7} />;
}

/** There is no `size` prop — each star is `1.5em`, so the inherited font size scales it. */
export function Sizing() {
  return (
    <div className="flex flex-col gap-r5">
      <div className="text-body-3">
        <Rating aria-label="Rate the delivery" value={4} readOnly />
      </div>
      <div className="text-h4">
        <Rating aria-label="Rate the packaging" value={4} readOnly />
      </div>
    </div>
  );
}

/** `aria-label` stays required even when a visible heading already names the group. Pass
 *  `aria-labelledby` as well and it wins — assistive tech reads the heading. */
export function LabelledByHeading() {
  return (
    <div className="flex flex-col gap-r5">
      <h3 id="delivery-rating-label" className="text-body-2 text-fg-primary">
        How was your delivery?
      </h3>
      <Rating
        aria-label="How was your delivery?"
        aria-labelledby="delivery-rating-label"
      />
    </div>
  );
}

/** `disabled` marks the group `aria-disabled`, disables every star button, and halves the
 *  opacity. It has no effect alongside `readOnly`, which returns before it is read. */
export function Disabled() {
  return <Rating aria-label="Rate this product" defaultValue={3} disabled />;
}
