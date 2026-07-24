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

The exit half has a sharp edge: unmounting is driven by the wrapper's `onAnimationEnd`,
so `exitClass` **must** name a class that actually runs a CSS animation, and passing your
own `onAnimationEnd` breaks the machinery. See [Gotchas](#gotchas).

## Custom enter and exit animations

`enterClass` and `exitClass` are just class names — pass any animation class and the
component toggles it on the wrapper at the right moment. The bundled `fade-*` classes
(`fade-in`, `fade-up`, `fade-down`, `fade-left`, `fade-right`, `fade-out`) ship in
`@batthewz/response-ui-css`; a project class works just as well, as long as the exit one
defines an animation so `onAnimationEnd` can fire.

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

- **`exitClass` must run a CSS animation.** The unmount fires from the wrapper's
  `onAnimationEnd`. Pass an exit class with no `animation` rule and that event never
  arrives, so the element stays mounted forever after `show` flips to `false` — visibly
  stuck on screen. The default `fade-out` animates; a plain utility class does not.
- **Your own `onAnimationEnd` silently disables the unmount.** `div` props are spread
  *after* the component's internal `onAnimationEnd`, so a handler you pass via `…rest`
  replaces it. The exit animation then plays but nothing ever unmounts.
- **A child's animation can cut the exit short.** `animationend` bubbles, and the handler
  only checks the exit phase — not which element fired. If a descendant runs its own
  animation while the wrapper is exiting, that child's `animationend` bubbles up and
  unmounts the whole thing early, before the wrapper's fade-out finishes.
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

`Stagger` · `ScrollReveal` · [Parallax](parallax.md) · [ViewTransition](view-transition.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
