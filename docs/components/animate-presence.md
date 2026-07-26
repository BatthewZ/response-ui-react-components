# AnimatePresence

Mounts and unmounts its children on a boolean, and — the part React can't do alone —
keeps them in the DOM long enough to play an **exit** animation before they leave. Flip
`show` to `true` and the children mount with an enter animation; flip it back to `false`
and they animate out, then unmount when that animation ends.

<!-- example:Minimal -->
```tsx
<button onClick={() => setOpen((v) => !v)}>Toggle summary</button>
<AnimatePresence show={open}>
  <p>Your changes are saved automatically.</p>
</AnimatePresence>
```
<!-- /example -->

| Prop         | Type                    | Default      |
| ------------ | ----------------------- | ------------ |
| `show`       | `boolean`               | — (required) |
| `enterClass` | `string`                | `"fade-in"`  |
| `exitClass`  | `string`                | `"fade-out"` |
| `children`   | `ReactNode`             | — (required) |
| `className`  | `string`                | —            |
| `ref`        | `Ref<HTMLDivElement>`   | —            |
| …rest        | props of `div`          | —            |

Unmounting is driven by the wrapper's own `animationend`, so `exitClass` should name a
class that actually runs a CSS animation; when it doesn't, a fallback timer unmounts the
element instead of leaving it on screen. See [Gotchas](#gotchas).

## Custom enter and exit animations

`enterClass` and `exitClass` are just class names — pass any animation class and the
component toggles it on the wrapper at the right moment. The bundled `fade-*` classes
(`fade-in`, `fade-up`, `fade-down`, `fade-left`, `fade-right`, `fade-out`) ship in
`@batthewz/response-ui-css`; a project class works just as well. Give the exit one a real
animation if you want the exit to be seen — without one there is nothing for
`onAnimationEnd` to report and the fallback timer simply removes the element.

<!-- example:CustomAnimation -->
```tsx
<button onClick={() => setOpen((v) => !v)}>Toggle</button>
<AnimatePresence show={open} enterClass="fade-up" exitClass="fade-out">
  <p>Slides up as it fades in.</p>
</AnimatePresence>
```
<!-- /example -->

## Styling the wrapper

The children are always wrapped in a single `<div>`, and every remaining `div` prop —
`className`, `id`, `style`, `role`, `aria-*`, `data-*` — passes straight through to it.
Style the animated box, or make it a live region, right on the component.

<!-- example:WrapperProps -->
```tsx
<button onClick={() => setSaved(true)}>Save settings</button>
<AnimatePresence show={saved} role="status" className="rounded-md bg-surface-1 p-r3">
  Settings saved.
</AnimatePresence>
```
<!-- /example -->

## Theme tokens

AnimatePresence reads **no** contract variables itself — it renders a plain `<div>` and
toggles a class name on it. It has no `.css` of its own and uses no token-backed Tailwind
utility; the only classes it applies are the ones you pass (defaulting to `fade-in` and
`fade-out`). There is nothing on this component to override.

The timing lives one level down, in the animation classes. The default `fade-in` and
`fade-out` are defined in `@batthewz/response-ui-css` and read the shared motion tokens:
`--MOTION-DURATION-ENTER` / `--MOTION-EASE-ENTER` on the way in, `--MOTION-DURATION-EXIT`
/ `--MOTION-EASE-EXIT` on the way out. Those are global — overriding one re-times **every**
fade in the app, not just this instance. To re-time a single AnimatePresence, hand it a
different `enterClass` / `exitClass` instead.

## Gotchas

- **`exitClass` should run a CSS animation; if it doesn't, a timer unmounts anyway.** The
  unmount normally fires from the wrapper's `onAnimationEnd`. An exit class with no
  `animation` rule never produces that event, so a fallback timer covers it: on entering the
  exit phase the component reads the element's own computed `animation-duration` and
  `animation-delay` and unmounts that long afterwards, plus a 100 ms grace period. With no
  animation declared the wait is just the grace period, so the element leaves promptly
  instead of sticking on screen forever. A real `animationend` still wins whenever it
  arrives, and cancels the timer. The default `fade-out` animates; a plain utility class
  does not.
- **Your own `onAnimationEnd` runs first, then the unmount — and cannot stop it.** A handler
  you pass is composed with the component's rather than replacing it: yours is called, then
  the exit-phase check unmounts. There is no `preventDefault()` opt-out here, because
  `animationend` is not a cancelable event, so the unmount always follows.
- **A child's animation cannot cut the exit short.** `animationend` bubbles, so a descendant
  animating while the wrapper is exiting fires an event that reaches the wrapper — but the
  unmount only runs when the event's `target` *is* the wrapper, so a spinner or skeleton
  inside an exiting panel no longer ends the exit early. Your own `onAnimationEnd` is called
  for those bubbled events too, since it is an ordinary DOM handler on the wrapper: check
  `e.target === e.currentTarget` yourself if you only care about the wrapper's own animation.
- **Reduced motion drops both animations — and the class with them.** Under
  `prefers-reduced-motion: reduce`, children mount and unmount instantly and *no* class is
  applied. So anything you tucked into `enterClass` beyond the animation (a colour, a
  transform) also won't land in reduced-motion mode.
- **It always adds a wrapper `<div>`.** There is no fragment or `as` mode; the extra
  block-level element sits in the layout, which matters inside a flex or grid parent.
- **Client component.** It carries `"use client"` (it holds mount state and reads a media
  query), so in an RSC tree it needs a client boundary — it can't render server-side on
  its own.

## Accessibility

The wrapper is a bare `<div>` with no role of its own, so the semantics are entirely the
children's. It does honour `prefers-reduced-motion`, removing both animations for users
who ask for less motion.

Content that pops in or out — a toast, a save confirmation — usually needs to be announced.
AnimatePresence does not do this for you; add `role="status"` or an `aria-live` region via
the passthrough props, as in [Styling the wrapper](#styling-the-wrapper).

One timing note: during exit the children stay in the DOM (and the accessibility tree)
until the animation completes, so they remain briefly readable after `show` becomes
`false`. That is usually fine, but it is a short lag, not an instant removal.

## Related

[Stagger](stagger.md) · [ScrollReveal](scroll-reveal.md) · [Parallax](parallax.md) · [ViewTransition](view-transition.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
