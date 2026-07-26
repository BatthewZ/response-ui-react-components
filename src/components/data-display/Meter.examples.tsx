import { Meter } from "./Meter";

/** The default: ten segments over 0–100, the filled run tinted with the brand accent. */
export function Minimal() {
  return <Meter value={72} aria-label="Disk usage" />;
}

/** `warningAt`/`criticalAt` re-tint the whole filled run once `value` crosses them, and add
 *  a glyph after the last segment so the threshold is not colour alone. */
export function Thresholds() {
  return (
    <>
      <Meter value={48} warningAt={70} criticalAt={90} aria-label="CPU load" />
      <Meter value={78} warningAt={70} criticalAt={90} aria-label="Memory" />
      <Meter value={95} warningAt={70} criticalAt={90} aria-label="Swap" />
    </>
  );
}

/** `min`/`max` move the range; the fill is the value's position inside it, not its raw size. */
export function CustomRange() {
  return <Meter value={62} min={40} max={90} aria-label="Water temperature" />;
}

/** `segments` sets the granularity — more segments read as a finer bar. */
export function Granularity() {
  return (
    <>
      <Meter value={40} segments={5} aria-label="Signal strength" />
      <Meter value={40} segments={20} aria-label="Battery" />
    </>
  );
}

/** The final segment stays empty until `value` reaches `max`, so a near-full meter never reads as full. */
export function NeverFalselyFull() {
  return <Meter value={99} aria-label="Storage" />;
}
