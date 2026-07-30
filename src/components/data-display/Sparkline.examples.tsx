import { Sparkline } from "./Sparkline";

/** A line sparkline needs only `values`; give it a data-describing `aria-label`. */
export function Minimal() {
  return <Sparkline values={[12, 18, 15, 22, 19, 25, 28]} aria-label="Revenue, last 7 days" />;
}

/** Three shapes for the same series: `line` (default), `area`, and `bar`. */
export function Variants() {
  return (
    <>
      <Sparkline variant="line" values={[8, 9, 7, 11, 10, 13, 14]} aria-label="Sessions, line" />
      <Sparkline variant="area" values={[8, 9, 7, 11, 10, 13, 14]} aria-label="Sessions, area" />
      <Sparkline variant="bar" values={[8, 9, 7, 11, 10, 13, 14]} aria-label="Sessions, bars" />
    </>
  );
}

/** Colour is `currentColor` — set a text-colour utility on the `<svg>` to tint it. */
export function Tinting() {
  return (
    <>
      <Sparkline
        className="text-trend-up"
        values={[20, 22, 21, 26, 28, 31, 35]}
        aria-label="Signups trending up"
      />
      <Sparkline
        className="text-chart-2"
        variant="area"
        values={[35, 31, 33, 27, 24, 22, 19]}
        aria-label="Churn trending down"
      />
    </>
  );
}

/** `width`/`height` set the `viewBox` and the default rendered px size; `strokeWidth` is in those same units. */
export function Sizing() {
  return (
    <Sparkline
      width={240}
      height={64}
      strokeWidth={3}
      values={[4, 6, 5, 9, 7, 12, 10, 14, 13, 18]}
      aria-label="Daily active users, last 10 days"
    />
  );
}

/** Pin the domain with `min`/`max` so several sparklines share one vertical scale. */
export function FixedScale() {
  return (
    <>
      <Sparkline min={0} max={100} values={[41, 44, 43, 48, 52]} aria-label="Team A, 0–100" />
      <Sparkline min={0} max={100} values={[62, 60, 65, 63, 68]} aria-label="Team B, 0–100" />
    </>
  );
}

/** A `line` scales to its data; a `bar` measures from zero, because bar length reads as magnitude. For a series that lives in a narrow band far from zero, that makes bars all-but-identical — say so with an explicit domain and a line. */
export function NarrowBand() {
  return (
    <>
      <Sparkline
        variant="bar"
        values={[99.9, 100, 99.8, 100, 99.95]}
        aria-label="Uptime as bars — honest, but every column is full height"
      />
      <Sparkline
        min={99.5}
        max={100}
        values={[99.9, 100, 99.8, 100, 99.95]}
        aria-label="Uptime against a 99.5–100% domain"
      />
    </>
  );
}
