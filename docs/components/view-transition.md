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

The `name` sets `view-transition-name` on a real `<div>` — nothing more. `style`, `id`,
`data-*`, and every other `div` prop pass straight through, and `ref` points at the
underlying element. `className` lands on the same `<div>` but goes through `cn()` first,
even though the element carries no base class of its own: `className="p-r3 p-r5"` resolves
to `p-r5` the way it does on every other component in the package, rather than emitting both
and leaving the stylesheet's order to pick. The one rule the type can't enforce: `name` must
be unique per document at snapshot time — see [Gotchas](#gotchas).

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
function so the change it causes runs there — awaiting whatever `navigate` returns, and
falling back to a plain call on browsers without View Transitions support and for anyone
who has asked for reduced motion:

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
- **`useViewTransition` awaits async navigation, but does not flush React.** The callback
  handed to `startViewTransition` returns whatever `navigate` returns, so an async router's
  promise is awaited and the browser snapshots the "new" state only once the navigation has
  settled. What the hook cannot do is force React to commit: if your `navigate` resolves
  *before* the state update it queued has rendered, the snapshot is still early. Routers
  that mutate the DOM synchronously, or whose promise resolves after the commit, are the
  reliable cases; anything else wants a `flushSync` of your own inside `navigate`.
- **The component does not feature-detect; the hook does.** `ViewTransition` always writes
  `view-transition-name`; on a browser without View Transitions it is an unknown property
  and is ignored, so content still renders. `useViewTransition` guards on
  `document.startViewTransition` and just calls `navigate` where it is missing.
- **The component is server-renderable; the hook is not.** `ViewTransition` holds no state
  and reads no browser API, so — like [Button](button.md) — its module carries no
  `"use client"` and it renders fine inside an RSC tree. `useViewTransition` lives in its
  own module, which does carry the directive; importing the hook is what pulls a client
  boundary in, and it is re-exported from `ViewTransition` so the import path is unchanged.

## Accessibility

- **`useViewTransition` honours reduced motion; a transition you start yourself does
  not.** Under `prefers-reduced-motion: reduce` the hook calls `navigate` directly and
  never enters `document.startViewTransition()`, so there is no cross-fade and no morph of
  any `ViewTransition` group — the component needs no gate of its own, because a
  `view-transition-name` animates nothing outside a transition. If you call
  `document.startViewTransition()` yourself, that gate is yours to add: check
  `matchMedia("(prefers-reduced-motion: reduce)")` before starting it, or wrap your
  `::view-transition-*` keyframes in `@media (prefers-reduced-motion: no-preference)`.
  `@batthewz/response-ui-css` already zeroes the *root* cross-fade's duration under the
  reduce query; that rule does not reach a named group.
- **Semantically transparent.** The wrapper is a bare `<div>` with no role or label. Keep
  the real semantics — headings, `alt` text, landmarks — on the content inside it, and
  don't let the extra `<div>` break a layout that expects a direct parent/child (e.g. a
  grid or flex track).

## Related

[AnimatePresence](animate-presence.md) · [Parallax](parallax.md) · [ScrollReveal](scroll-reveal.md) · [Stagger](stagger.md) · `useViewTransition` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
