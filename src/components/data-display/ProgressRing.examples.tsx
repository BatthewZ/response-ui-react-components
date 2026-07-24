import { ProgressRing } from "./ProgressRing";

/** A radial progress bar. `value` drives the arc; the centered slot shows the readout. */
export function Minimal() {
  return (
    <ProgressRing value={72} aria-label="Profile completion">
      72%
    </ProgressRing>
  );
}

/** Four semantic colors, sharing the same status tokens as ProgressBar. */
export function Colors() {
  return (
    <>
      <ProgressRing value={60} color="accent" aria-label="Storage used" />
      <ProgressRing value={100} color="success" aria-label="Backup complete" />
      <ProgressRing value={88} color="warning" aria-label="Quota nearly full" />
      <ProgressRing value={96} color="error" aria-label="Over budget" />
    </>
  );
}

/** `size` is the pixel diameter, `thickness` the stroke width — scale them together. */
export function Sizes() {
  return (
    <>
      <ProgressRing value={45} size={32} thickness={4} aria-label="Sync progress" />
      <ProgressRing value={45} size={64} thickness={6} aria-label="Sync progress" />
      <ProgressRing value={45} size={96} thickness={9} aria-label="Sync progress" />
    </>
  );
}

/** The centered slot renders any node — stack a big number over a caption. */
export function WithLabel() {
  return (
    <ProgressRing value={68} size={128} thickness={8} aria-label="Course completion">
      <div className="text-center">
        <div className="text-h4 font-semibold text-fg-primary">68%</div>
        <div className="text-body-3 text-fg-secondary">complete</div>
      </div>
    </ProgressRing>
  );
}

/** `max` rescales the arc — 3 of 5 fills the ring three-fifths of the way. */
export function CustomMax() {
  return (
    <ProgressRing value={3} max={5} color="success" aria-label="Onboarding steps">
      <span className="text-body-2 font-semibold text-fg-primary">3/5</span>
    </ProgressRing>
  );
}
