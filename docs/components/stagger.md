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
| `staggerDelay` | `string` — delay step between items, e.g. `"100ms"` | `--MOTION-STAGGER-DELAY` |
| `as`           | `ElementType` | `"div"`  |
| `className`    | `string`      | —        |
| `children`     | `ReactNode`   | —        |
| `ref`          | `Ref<HTMLElement>` | —   |

One thing to know before you lean on it: Stagger renders **nothing that moves on its
own** — you supply the animation, it supplies the delays. See [Gotchas](#gotchas).

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

`className` lands on the **outer** element, along with `ref`, `style` and every other prop
the `as` element accepts. Each child is then wrapped in its own
`<div class="stagger-item">` carrying the two delay variables, and those wrappers — not
your own nodes — are the direct children the container lays out. Style the container with
that in mind.

<!-- example:Layout -->
```tsx
<Stagger className="flex gap-r4">
  <a href="/features">Features</a>
  <a href="/pricing">Pricing</a>
  <a href="/docs">Docs</a>
</Stagger>
```
<!-- /example -->

## Changing the delay step

`staggerDelay` is the gap between one item's entrance and the next. It overrides the
`--MOTION-STAGGER-DELAY` token for this group only, and it lands on the item wrappers,
inline, where nothing in either stylesheet can shadow it.

<!-- example:CustomDelay -->
```tsx
<Stagger staggerDelay="150ms">
  <p>First.</p>
  <p>Then this, 150ms later.</p>
  <p>Then this, 300ms in.</p>
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
`.stagger-item` class from `@batthewz/response-ui-css` and writes two custom properties
that the class reads — both on the item wrapper, because that is the element the
`.stagger-item` rule resolves them on:

| Where             | Property           | Purpose                                                                                                  |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| Each item wrapper | `--stagger-delay`  | the per-item delay step — written only when you pass `staggerDelay`, otherwise inherited or the token     |
| Each item wrapper | `--stagger-index`  | the item's ordinal, multiplied by the delay step to space entrances; forced to `0` under reduced motion   |

There are three places the delay step can come from, in the order they win:

1. **The `staggerDelay` prop**, written inline on each item — one group only.
2. **`--stagger-delay` on any ancestor**, in your own CSS or a `style` — a subtree.
3. **`--MOTION-STAGGER-DELAY`** (default `50ms`), the contract token in the CSS
   foundation — every staggered group in the app.

The middle one only works because `Stagger.css` in *this* package resets
`--stagger-delay` to `inherit` on `.stagger-item` and re-reads it as
`var(--stagger-delay, var(--MOTION-STAGGER-DELAY))`. The foundation's own
`animations/stagger.css` re-declares the variable on the item — the element that consumes
it — where no ancestor value can reach it. That duplicate rule is deliberate and
temporary: it is unlayered and imported after the foundation, so it wins on source order,
and it should be deleted here once the foundation reads the fallback itself. Until then a
change to the foundation's `animation-delay` on `.stagger-item` will not take effect.

## Gotchas

- **Stagger ships no animation — it only sequences delays.** The `.stagger-item` rule
  sets `animation-delay` and `animation-fill-mode: both`, but **no `animation-name`**, so
  nothing moves until you give `.stagger-item` an `animation` (or `animation-name`) in
  your own CSS — for example a keyframe from `@batthewz/response-ui-css` such as
  `fade` or `slide-up`. Because the wrapper's class is fixed and there is no per-item
  hook, that rule has to target the global `.stagger-item` class. [Hero](hero.md) is a
  worked example: it scopes an `animation-name: fade` to `.hero__content .stagger-item`
  in its own CSS, which is why `Hero.Content animate` cascades and a bare Stagger does not.
- **`staggerDelay` writes to the items, not the container.** The prop stamps each item
  wrapper inline, where nothing in either stylesheet can shadow it. A `--stagger-delay`
  you set from your own CSS on an ancestor now reaches the items too — but only with
  *this* package's stylesheet loaded; the foundation alone shadows it on `.stagger-item`.
  See [Theme tokens](#theme-tokens) for the three sources and their order.
- **Every child gains an extra wrapper `<div>`.** A `.stagger-item` block element is
  inserted between the container and each child. That means `as="ul"`/`as="ol"` produce
  invalid markup (a `<div>` between the list and its `<li>`s), and any direct-child
  selector, `flex`/`grid`, or `gap` on the container targets the wrappers, not your nodes.
- **`style` reaches the container untouched.** Every prop the `as` element accepts (`id`,
  `aria-label`, `onClick`, `data-*`, `style`, …) is spread onto the outer element and
  nothing of the component's own is merged into it; `className` lands as given. A
  `--stagger-delay` you write into `style` yourself sits on the container and inherits
  down to the items — the `staggerDelay` prop is the same thing, put where it cannot be
  shadowed and typed.
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
[AnimatePresence](animate-presence.md) · [ViewTransition](view-transition.md) · [Hero](hero.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
