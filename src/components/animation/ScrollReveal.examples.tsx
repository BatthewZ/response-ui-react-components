import { ScrollReveal } from "./ScrollReveal";

/** Wraps any content and plays its entrance the first time it scrolls into view. */
export function Minimal() {
  return (
    <ScrollReveal>
      <h2>Built for teams that ship on Fridays</h2>
    </ScrollReveal>
  );
}

/** Five entry animations — `fade-up` is the default; directional ones fade while they slide, `scale` fades while it grows. */
export function Animations() {
  return (
    <>
      <ScrollReveal animation="fade-up">Slides up as it enters</ScrollReveal>
      <ScrollReveal animation="fade-in">Fades in without moving</ScrollReveal>
      <ScrollReveal animation="fade-left">Slides in from the right</ScrollReveal>
      <ScrollReveal animation="fade-right">Slides in from the left</ScrollReveal>
      <ScrollReveal animation="scale">Scales up as it fades in</ScrollReveal>
    </>
  );
}

/** `delay` (ms) offsets the start — give siblings increasing delays to stagger a group into view. */
export function Staggered() {
  return (
    <>
      <ScrollReveal delay={0}>Ship faster</ScrollReveal>
      <ScrollReveal delay={100}>Review in context</ScrollReveal>
      <ScrollReveal delay={200}>Deploy with confidence</ScrollReveal>
    </>
  );
}

/** `once={false}` re-hides the element and replays the animation every time it re-enters the viewport. */
export function Replay() {
  return (
    <ScrollReveal once={false}>
      <p>Animates again on each scroll back into view.</p>
    </ScrollReveal>
  );
}

/** `threshold` and `rootMargin` decide when the reveal fires — here it waits until half the element is on screen. */
export function TriggerTuning() {
  return (
    <ScrollReveal threshold={0.5} rootMargin="0px 0px -80px 0px">
      <p>Reveals later, once half of it has scrolled into view.</p>
    </ScrollReveal>
  );
}

/** `animate={false}` drops the reveal entirely: no hidden state, no observer, content
 *  readable from the first paint — the opt-out for anything that must survive without JS. */
export function WithoutReveal() {
  return (
    <ScrollReveal animate={false}>
      <h2>Refund policy</h2>
    </ScrollReveal>
  );
}

/** `as` swaps the rendered element — a `<section>` here instead of the default `<div>`. */
export function AsSection() {
  return (
    <ScrollReveal as="section">
      <h2>Simple, transparent pricing</h2>
    </ScrollReveal>
  );
}
