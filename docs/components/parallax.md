# Parallax

A scroll-driven wrapper. It translates its children vertically as the page scrolls to
create a depth effect, throttles the work with `requestAnimationFrame`, and stands
perfectly still when the reader has asked for `prefers-reduced-motion`.

<!-- example:Minimal -->
```tsx
<Parallax>
  <img src="/mountains.jpg" alt="Snow-capped peaks at dawn" />
</Parallax>
```
<!-- /example -->

| Prop        | Type                  | Default          |
| ----------- | --------------------- | ---------------- |
| `rate`      | `number`              | `0.3`            |
| `clamp`     | `number`              | — (uncapped)     |
| `children`  | `ReactNode`           | required         |
| `className` | `string`              | —                |
| `style`     | `CSSProperties`       | —                |
| `ref`       | `Ref<HTMLDivElement>` | —                |
| …rest       | props of `div`        | —                |

The wrapper is a plain `<div>` — the only styles Parallax writes are a computed inline
`transform` and a `will-change: transform` hint (while motion is active *and* the layer is
near the viewport, see [Gotchas](#gotchas)). Passing `0` to
either number is honoured, not treated as unset: `rate={0}`
freezes the layer and `clamp={0}` pins the offset to zero. See [Gotchas](#gotchas).

## Rate

The offset applied each frame is the element's distance from the viewport centre times
`rate`. A larger `rate` drifts harder; the default `0.3` moves the layer **ahead** of
the page. Flip the sign for the classic slow background — a negative rate makes the
layer **lag** the scroll.

<!-- example:Rate -->
```tsx
<Parallax rate={-0.2}>
  <img src="/city-skyline.jpg" alt="City skyline at night" />
</Parallax>
```
<!-- /example -->

## Clamp

`clamp` bounds the transform to the range `[-clamp, clamp]` pixels. Without it, a fast
`rate` on a tall page can shove a layer well outside its box; `clamp` keeps the drift
contained.

<!-- example:Clamped -->
```tsx
<Parallax rate={0.5} clamp={80}>
  <img src="/aurora.jpg" alt="Aurora over a frozen lake" />
</Parallax>
```
<!-- /example -->

## Layered depth

Stack layers at different rates and the gap between them reads as depth.

<!-- example:Layered -->
```tsx
<div className="relative">
  <Parallax rate={0.15}>
    <img src="/backdrop.jpg" alt="Distant mountain range" />
  </Parallax>
  <Parallax rate={0.5}>
    <h1>Built for the long scroll</h1>
  </Parallax>
</div>
```
<!-- /example -->

## Passthrough

Parallax spreads every remaining `div` prop onto the wrapper and merges your `style`
with its own `will-change` hint, so `className`, `id`, `data-*`, and inline styles all
land where you expect.

<!-- example:Passthrough -->
```tsx
<Parallax className="rounded-lg shadow-md" style={{ maxHeight: 480 }} id="hero-art">
  <img src="/ridgeline.jpg" alt="Mountain ridgeline under a clear sky" />
</Parallax>
```
<!-- /example -->

## Theme tokens

Parallax paints nothing of its own — no colour, radius, spacing, or timing. The only
style it writes is a computed inline `transform` (plus a `will-change: transform` hint
while the layer is moving and near the viewport); everything visible comes from the `children` you wrap and the
`className` / `style` you pass through. There are no contract variables to override on
this component — theme the content inside it instead.

## Gotchas

- **Offset recomputes on scroll and on resize, and on nothing else.** `viewportCenter`
  is read from `window.innerHeight`, so a viewport that changes height is followed —
  but a layout change that moves the element without either event (an image above it
  finishing loading, a collapsed panel opening) leaves the layer at its last computed
  offset until the next scroll. Nudge it by dispatching a `resize` if you move content
  above a layer programmatically.
- **The `will-change: transform` hint is scoped to the viewport.** It is applied only
  while the wrapper is within 200px of the viewport, so an offscreen layer parks no
  compositor layer. Where `IntersectionObserver` is unavailable the hint falls back to
  the element's whole life — a layer beats no layer — so on those engines the old
  advice stands: keep the wrapped subtree small.
- **The wrapper moves outside its own layout box.** `overflow-hidden` on the `Parallax`
  itself won't clip the drift — it clips the element's children, not the element. Put
  the clip on a **parent** if the movement must be masked.
- **Client-only.** The component carries `"use client"`; it renders untransformed on
  the server and begins animating after hydration, so the first paint shows the layer
  at its layout position.

## Accessibility

Parallax honours `prefers-reduced-motion: reduce`: when it is set, no scroll listener is
attached, no `will-change` hint is written, and the children render at their normal
position. Motion-sensitive readers get a static layout with no scroll-linked movement.
Turning the preference on *mid-scroll* is honoured too — the imperative `transform` is
cleared as the effect tears down, so a layer that had already drifted returns to its
layout position rather than freezing where it was.

The component adds no roles or ARIA — it is a transparent visual wrapper. Decorative
imagery inside it should still carry `alt=""` so it is skipped by assistive tech.

## Related

[ScrollReveal](scroll-reveal.md) · [Stagger](stagger.md) · [AnimatePresence](animate-presence.md) · [ViewTransition](view-transition.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
