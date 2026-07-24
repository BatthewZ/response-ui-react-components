# Stagger

Reveals a group of siblings one after another instead of all at once. Stagger wraps each
child in a delay-stepped item and hands you the cascade — you supply the entrance
animation, it supplies the timing — and it collapses to a single simultaneous reveal
under `prefers-reduced-motion`.

<!-- example:Minimal -->
```tsx
<Stagger>
  <p>Deploys are 40% faster.</p>
  <p>Zero-downtime migrations.</p>
  <p>One-click rollbacks.</p>
</Stagger>
```
<!-- /example -->

| Prop           | Type          | Default  |
| -------------- | ------------- | -------- |
| `staggerDelay` | `string`      | —        |
| `as`           | `ElementType` | `"div"`  |
| `className`    | `string`      | —        |
| `children`     | `ReactNode`   | —        |
| `ref`          | `Ref<HTMLElement>` | —   |

Two things to know before you lean on it: Stagger renders **nothing that moves on its
own**, and the `staggerDelay` prop does not currently change the timing. Both are covered
in [Gotchas](#gotchas).

## Mapping data

`Children.toArray` flattens whatever you pass, so mapping an array straight in works and
each item still gets its own sequential delay.

<!-- example:FromData -->
```tsx
<Stagger>
  {steps.map((step) => (
    <p key={step.id}>{step.label}</p>
  ))}
</Stagger>
```
<!-- /example -->

## Laying items out

`className` lands on the **outer** element — along with `ref` and, when you pass
`staggerDelay`, a `--stagger-delay` style variable. Nothing else you hand Stagger reaches
that element (see [Gotchas](#gotchas)). Each child is then wrapped in its own
`<div class="stagger-item">`, and those wrappers — not your own nodes — are the direct
children the container lays out. Style the container with that in mind.

<!-- example:Layout -->
```tsx
<Stagger className="flex gap-r4">
  <a href="/features">Features</a>
  <a href="/pricing">Pricing</a>
  <a href="/docs">Docs</a>
</Stagger>
```
<!-- /example -->

## Rendering as another element

`as` changes only the outer wrapper. The per-item wrappers are always `<div>`, so `as`
is for the container tag, not for changing what each item is.

<!-- example:AsElement -->
```tsx
<Stagger as="section">
  <p>Realtime collaboration.</p>
  <p>Audit-ready history.</p>
</Stagger>
```
<!-- /example -->

## Theme tokens

Stagger sets no colour and uses no Tailwind utility. It stamps each child with the
`.stagger-item` class from `@batthewz/response-ui-css` and writes two **local** custom
properties that the class reads:

| Where             | Property           | Purpose                                                                                                           |
| ----------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Outer wrapper     | `--stagger-delay`  | the per-item delay step — written only when you pass `staggerDelay`, but the `.stagger-item` rule shadows it (see [Gotchas](#gotchas)) |
| Each item wrapper | `--stagger-index`  | the item's ordinal, multiplied by the delay step to space entrances; forced to `0` under reduced motion          |

The delay step that actually reaches the animation is the contract token
`--MOTION-STAGGER-DELAY` (default `50ms`), which the `.stagger-item` rule reads directly.
Override that one variable to retime every staggered group in the app — it lives in the
CSS foundation, not this package, so there is no per-component variable to reach for here.

## Gotchas

- **Stagger ships no animation — it only sequences delays.** The `.stagger-item` rule
  sets `animation-delay` and `animation-fill-mode: both`, but **no `animation-name`**, so
  nothing moves until you give `.stagger-item` an `animation` (or `animation-name`) in
  your own CSS — for example a keyframe from `@batthewz/response-ui-css` such as
  `fade` or `slide-up`. Because the wrapper's class is fixed and there is no per-item
  hook, that rule has to target the global `.stagger-item` class.
- **`staggerDelay` is currently a no-op for timing.** It writes `--stagger-delay` on the
  outer wrapper, but the `.stagger-item` rule re-declares `--stagger-delay:
  var(--MOTION-STAGGER-DELAY)` on the item itself, which shadows the inherited value. The
  delay step therefore stays at `--MOTION-STAGGER-DELAY` no matter what you pass. To
  change it today, override that token instead.
- **Every child gains an extra wrapper `<div>`.** A `.stagger-item` block element is
  inserted between the container and each child. That means `as="ul"`/`as="ol"` produce
  invalid markup (a `<div>` between the list and its `<li>`s), and any direct-child
  selector, `flex`/`grid`, or `gap` on the container targets the wrappers, not your nodes.
- **Extra element props are accepted by the types but not forwarded.** The public type
  lets you pass any prop of the `as` element (`id`, `aria-label`, `onClick`, …), yet the
  component spreads only `className`, `ref`, and — when set — the `--stagger-delay` style
  onto the outer element. Every other prop you pass is silently dropped at runtime, so put
  attributes like `aria-label` on a wrapper around `Stagger` rather than on `Stagger`
  itself.
- **Children are keyed by array index.** Re-ordering or inserting mid-list can mis-map an
  in-flight animation to the wrong item; keep the list stable, or it is a non-issue for
  static content.
- **It is a client component.** `Stagger` carries `"use client"` because it reads
  `prefers-reduced-motion` at runtime, so it renders on the client even inside an RSC tree.

## Accessibility

Stagger honours `prefers-reduced-motion` in two independent ways: it sets every
`--stagger-index` to `0`, so all items share a zero delay and enter together, and the
`.stagger-item` rule additionally zeroes `animation-delay` under the same query. Either
way, a motion-sensitive visitor gets the content without the cascade.

The item wrappers are presentational `<div>`s with no role, so they do not add anything
to the accessibility tree — but see the list-semantics note in Gotchas: because a wrapper
sits between the container and each child, wrapping list markup in Stagger stops a screen
reader from announcing it as a list.

## Related

[ScrollReveal](scroll-reveal.md) · [Parallax](parallax.md) ·
[AnimatePresence](animate-presence.md) · [ViewTransition](view-transition.md) · `Hero` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
