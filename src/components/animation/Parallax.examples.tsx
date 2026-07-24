import { Parallax } from "./Parallax";

/** Wrap anything; it drifts vertically as the page scrolls, at the default rate. */
export function Minimal() {
  return (
    <Parallax>
      <img src="/mountains.jpg" alt="Snow-capped peaks at dawn" />
    </Parallax>
  );
}

/** `rate` sets how strongly the layer reacts to scroll — the default `0.3` drifts
 *  ahead of the page, a negative rate lags behind it, `rate={0}` disables it. */
export function Rate() {
  return (
    <Parallax rate={-0.2}>
      <img src="/city-skyline.jpg" alt="City skyline at night" />
    </Parallax>
  );
}

/** `clamp` caps the transform to ±N px so the layer never drifts too far on a long page. */
export function Clamped() {
  return (
    <Parallax rate={0.5} clamp={80}>
      <img src="/aurora.jpg" alt="Aurora over a frozen lake" />
    </Parallax>
  );
}

/** Different rates on stacked layers create depth — the smaller `rate` drifts less than the larger one. */
export function Layered() {
  return (
    <div className="relative">
      <Parallax rate={0.15}>
        <img src="/backdrop.jpg" alt="Distant mountain range" />
      </Parallax>
      <Parallax rate={0.5}>
        <h1>Built for the long scroll</h1>
      </Parallax>
    </div>
  );
}

/** `className`, `style`, and every other `div` prop pass straight through to the wrapper. */
export function Passthrough() {
  return (
    <Parallax className="rounded-lg shadow-md" style={{ maxHeight: 480 }} id="hero-art">
      <img src="/ridgeline.jpg" alt="Mountain ridgeline under a clear sky" />
    </Parallax>
  );
}
