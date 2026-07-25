# ViewTransition

A transparent wrapper that tags its subtree with a CSS `view-transition-name`, so the
browser can animate that element as it morphs between two DOM states — a route change, a
list reorder, an expand. Pair it with `useViewTransition` to run the change inside
`document.startViewTransition()`.

<!-- example:Minimal -->
```tsx
<ViewTransition name="product-hero">
  <img src="/products/aeron-chair.jpg" alt="Aeron office chair" />
</ViewTransition>
```
<!-- /example -->

| Prop        | Type                   | Default        |
| ----------- | ---------------------- | -------------- |
| `name`      | `string`               | — _(required)_ |
| `children`  | `ReactNode`            | — _(required)_ |
| `className` | `string`               | —              |
| `style`     | `CSSProperties`        | —              |
| `ref`       | `Ref<HTMLDivElement>`  | —              |
| …rest       | props of `div`         | —              |

The `name` sets `view-transition-name` on a real `<div>` — nothing more. `className`,
`style`, `id`, `data-*`, and every other `div` prop pass straight through, and `ref`
points at the underlying element. The one rule the type can't enforce: `name` must be
unique per document at snapshot time — see [Gotchas](#gotchas).

## Unique names in a list

`view-transition-name` is a document-wide identifier, not a class. Two visible elements
carrying the same one make the browser skip the transition, so derive the name from a
stable id whenever you render more than one:

<!-- example:UniqueNames -->
```tsx
<ul>
  {products.map((product) => (
    <li key={product.id}>
      <ViewTransition name={`product-${product.id}`}>
        {product.title}
      </ViewTransition>
    </li>
  ))}
</ul>
```
<!-- /example -->

## Triggering a transition

Tagging an element does nothing on its own — a transition only happens when the DOM
changes inside `document.startViewTransition()`. `useViewTransition` wraps any navigate
function so the change it causes runs there, falling back to a plain call on browsers
without View Transitions support:

<!-- example:TriggerNavigation -->
```tsx
<button type="button" onClick={() => transition("/dashboard")}>
  View dashboard
</button>
```
<!-- /example -->

## Theme tokens

ViewTransition reads no design tokens. Its whole job is to set the inline
`view-transition-name` from the `name` prop; it applies no colour, radius, spacing, or
motion utility, so there is nothing on the element to re-theme.

The animation itself is the browser's default cross-fade unless you author your own
`::view-transition-old()` / `::view-transition-new()` rules. Those live in your own CSS,
where you can pin their timing to the contract's `--MOTION-DURATION-PAGE` /
`--MOTION-EASE-PAGE` (or the named `--MOTION-PAGE-TRANSITION-IN` / `-OUT` keyframes) so
the effect matches the rest of the app. See the
[theme contract](../theme-contract.md#motion).

## Gotchas

- **Names must be unique per document at snapshot time.** Two on-screen elements with the
  same `name` abort the whole transition (the browser logs a warning and nothing
  animates). In a list, key the name off a stable id, never a shared literal.
- **`name` always wins over `style`.** It is spread after `style`, so a
  `viewTransitionName` you pass through `style` is silently overridden. Use the prop.
- **`useViewTransition` doesn't await async navigation.** The callback handed to
  `startViewTransition` is `() => void navigate(...)` — it discards whatever `navigate`
  returns instead of returning it, and nothing flushes React synchronously. For a typical
  async SPA router the browser snapshots the *pre*-navigation DOM as the "new" state and
  you get no visible transition. It works reliably only when the navigation mutates the
  DOM synchronously inside the callback.
- **The component does not feature-detect; the hook does.** `ViewTransition` always writes
  `view-transition-name`; on a browser without View Transitions it is an unknown property
  and is ignored, so content still renders. `useViewTransition` guards on
  `document.startViewTransition` and just calls `navigate` where it is missing.
- **It's a client module.** The file carries `"use client"` (the hook needs it), so
  importing `ViewTransition` opts its module into the client bundle even though its render
  is pure — unlike [Button](button.md), it is not usable as a server component.

## Accessibility

- **No reduced-motion gate.** Neither `ViewTransition` nor `useViewTransition` consults
  `prefers-reduced-motion`, so a reduced-motion user still gets the default cross-fade and
  any `::view-transition-*` animation you add. Gate it yourself: skip the wrapped
  navigation under `matchMedia("(prefers-reduced-motion: reduce)")`, or wrap your
  view-transition keyframes in `@media (prefers-reduced-motion: no-preference)`.
- **Semantically transparent.** The wrapper is a bare `<div>` with no role or label. Keep
  the real semantics — headings, `alt` text, landmarks — on the content inside it, and
  don't let the extra `<div>` break a layout that expects a direct parent/child (e.g. a
  grid or flex track).

## Related

[AnimatePresence](animate-presence.md) · [Parallax](parallax.md) · [ScrollReveal](scroll-reveal.md) · [Stagger](stagger.md) · `useViewTransition` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
