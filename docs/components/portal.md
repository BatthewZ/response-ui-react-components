# Portal

Renders its children somewhere else in the DOM — the end of `<body>` by default — so an
overlay escapes an ancestor's `overflow: hidden`, `transform`, or `z-index` stacking
context while staying exactly where it is in your React tree.

<!-- example:Minimal -->
```tsx
<Portal>
  <div className="fixed right-r4 bottom-r4 z-50">
    <Alert variant="success">Changes saved</Alert>
  </div>
</Portal>
```
<!-- /example -->

That Portal is unconditional, which is fine in a client-rendered app and breaks hydration in
a server-rendered one — read [Gotchas](#gotchas) before you paste it into Next.js.

| Prop        | Type              | Default         |
| ----------- | ----------------- | --------------- |
| `children`  | `ReactNode`       | — _(required)_  |
| `container` | `Element \| null` | `document.body` |

That is the entire surface. Portal is typed `React.FC<PortalProps>` with no rest spread,
so there is no `className`, no `style`, no `id`, and no `ref` — it renders no element of
its own, it only relocates yours. Anything else you pass is a compile error. `PortalProps`
is internal, so a wrapper of your own re-declares the two props rather than importing them.

## What moves, and what doesn't

`createPortal` changes exactly one thing: which DOM node the children are inserted into.
Their position in the **React** tree is unchanged, and most of what you rely on follows the
React tree rather than the DOM.

Still works, because React resolves it through the JSX parent:

- **Context, hooks, and error boundaries.** A provider wrapping the Portal still reaches the
  children, and a throw inside them is caught by the error boundary above the Portal in your
  JSX.
- **React event bubbling.** An `onClick` on the element that renders the Portal fires for
  clicks inside the portalled content, even though that content is a child of `<body>`.

Stops working, because the browser resolves it through the DOM tree:

- **CSS.** Descendant selectors, inherited typography, and custom properties set on a
  wrapper no longer apply — the children inherit from the container instead.
- **Positioning.** The containing block an absolutely positioned child resolves against
  changes with the DOM parent — see [Gotchas](#gotchas).
- **Native DOM listeners.** A `document`-level handler that tests
  `element.contains(event.target)` — which is exactly how `useClickOutside` works — reads a
  click inside portalled content as *outside* the trigger. A menu that portals itself has to
  be included in that containment check by hand, or it closes the moment you click it.

## Escaping a clipping ancestor

This is the case Portal exists for. [Card](card.md) sets `overflow-hidden`, so an action
menu rendered inline gets cut off at the card's edge. Writing the Portal **inside** the card
changes nothing about the JSX nesting and everything about the DOM: the menu is emitted as a
child of `<body>`, clear of the clip.

<!-- example:EscapeClipping -->
```tsx
<Card padding="r4">
  <h3>Q3 revenue</h3>
  <Button variant="ghost">Export…</Button>
  <Portal>
    <div className="fixed top-r3 right-r3 z-50 rounded-md bg-surface-0 p-r5 shadow-lg">
      <Button variant="ghost">Download CSV</Button>
      <Button variant="ghost">Download XLSX</Button>
    </div>
  </Portal>
</Card>
```
<!-- /example -->

The same trick answers the harder version of the problem — an ancestor with a `transform`,
`filter`, or `will-change`, which creates a containing block that traps even
`position: fixed` children and a stacking context that no `z-index` can climb out of.

Portal gives you the escape and nothing more: the coordinates are still yours to supply, and
they now resolve against a different containing block.

## Sending it somewhere else

Pass `container` to target a mount node of your own — a `#toast-root` div, a print region, a
panel inside an editor shell. `container ?? document.body` is the whole rule, so both `null`
and `undefined` fall back to the body.

When the container is itself rendered by React, capture it with a **callback ref into
state**, not a `ref` object: `ref.current` is `null` while the first render runs, and
mutating a ref doesn't re-render. Gating the Portal on that state keeps the children from
mounting into `<body>` first and then moving.

<!-- example:CustomContainer -->
```tsx
<div id="overlay-root" ref={setOverlayRoot} />
{overlayRoot && (
  <Portal container={overlayRoot}>
    <Alert variant="info">Deploying Acme Marketing to production…</Alert>
  </Portal>
)}
```
<!-- /example -->

## Showing and hiding

There is no `open` prop and no built-in animation. A mounted Portal always renders its
children; unmounting it removes them from the container. Toggle by mounting.

<!-- example:ToggleOverlay -->
```tsx
<Button onClick={() => setOpen(true)}>Keyboard shortcuts</Button>
{open && (
  <Portal>
    <div className="fixed inset-0 z-50 grid place-items-center bg-(--OVERLAY-SCRIM-COLOR)">
      <Card padding="r3">
        <h2>Keyboard shortcuts</h2>
        <p>Press ⌘K to open the command palette.</p>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Close
        </Button>
      </Card>
    </div>
  </Portal>
)}
```
<!-- /example -->

## Everything an overlay still needs

Portal solves DOM placement. It does not stack, position, dim, trap, or dismiss. A modal
built on it supplies its own scrim, role, `aria-modal`, label, focus trap, and Escape
handler — the same assembly [AppShell](app-shell.md) does by hand around its own portalled mobile sidebar
(with `role="navigation"` there rather than `dialog`).

<!-- example:ModalOverlay -->
```tsx
<Portal>
  <div className="fixed inset-0 z-50 bg-(--OVERLAY-SCRIM-COLOR)" aria-hidden="true" />
  <div
    ref={dialogRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-workspace-title"
    className="fixed inset-0 z-50 m-auto h-fit w-fit rounded-lg bg-surface-0 p-r3 shadow-lg"
  >
    <h2 id="delete-workspace-title">Delete workspace?</h2>
    <p>Every project in Acme Marketing goes with it. This cannot be undone.</p>
    <Button variant="secondary">Cancel</Button>
    <Button variant="danger">Delete workspace</Button>
  </div>
</Portal>
```
<!-- /example -->

Before you build that, check whether you need a portal at all: [Dialog](dialog.md) and [Drawer](drawer.md) use the
native `<dialog>` element with `showModal()`, which promotes them to the browser's top layer
— above every stacking context, with no DOM relocation and no `z-index` at all. [Popover](popover.md),
[Tooltip](tooltip.md), [HoverCard](hover-card.md), [DropdownMenu](dropdown-menu.md), [ContextMenu](context-menu.md), and the form comboboxes portal through
Floating UI's own `FloatingPortal`, which also does the anchoring. [Toast](toast.md) never portals
itself either — `ToastProvider` wraps the whole stack in one `Portal` into `<body>`. That
provider and [AppShell](app-shell.md)'s mobile sidebar are the only two places in this library
that reach for `Portal` directly.

## Theme tokens

Portal reads no design tokens. It has no CSS file, renders no element of its own, and sets
no class or inline style — `createPortal` relocates your children and nothing else, so there
is nothing on it to re-theme.

It does still interact with theming, through inheritance. The shipped themes are declared on
`:root[data-theme="…"]` and the base variables on `:root`, so every contract token is
inherited by `document.body` exactly as it is by the rest of the page: portalled content
re-tints on a theme swap like anything else, and utilities such as `bg-surface-0` resolve
identically inside a Portal. A custom property scoped to a **wrapper** is the exception —
set `--C-ACCENT` on a `<div>` around a Portal and the children never see it, because they
are no longer that div's descendants. Scope those overrides on the portal container itself,
or on `:root`. See the [theme contract](../theme-contract.md).

## Gotchas

- **Nothing renders on the server.** Portal returns `null` whenever `document` is undefined,
  which is every server render. That guard isn't a nicety: React's server renderer throws
  outright on portals ("Portals are not currently supported by the server renderer"), so it
  is what keeps an SSR page from crashing. The price is that portalled content is absent from
  the initial HTML, so anything that must be in the first paint, be crawlable, or work
  without JS does not belong in a Portal.
- **An unconditional Portal fails hydration.** The guard that saves the server render does
  nothing on the client: `document` *is* defined during hydration, so React's first client
  pass already contains the portal while the server emitted nothing there. React walks into
  the portal fiber, tries to match its children against the server DOM, and reports a
  hydration error — "the server rendered HTML didn't match the client" in development, where
  the printed tree diff names the `Portal` as the mismatch site, and minified error #418 in
  production. This is not a dev-only warning: the whole hydration root is regenerated on the
  client and its server HTML is discarded. Position doesn't help — it mismatches between siblings, as first, last, or
  only child, and at the root alike. A Portal gated behind state that starts closed renders
  `null` on that first pass and hydrates cleanly, which is the pattern in
  [Showing and hiding](#showing-and-hiding) and what [AppShell](app-shell.md) does. For a portal that has
  no such state, defer it behind a `mounted` flag you set in an effect.
- **Changing `container` remounts the subtree.** React reconciles a portal by its container:
  hand Portal a different element and the old portal is deleted and a new one created, so the
  children unmount and remount. Component state, uncontrolled input values, scroll position,
  and focus inside them are all lost. Choose the container before you render; don't swap it.
- **`container={ref.current}` silently targets `<body>`.** The prop is read during render,
  when a ref object is still `null`, and a later ref mutation doesn't schedule a re-render —
  so the children go to the body and stay there. Use the state pattern in
  [Sending it somewhere else](#sending-it-somewhere-else).
- **`null` means "body", not "nothing".** `container={maybeElement}` degrades to
  `document.body` when the lookup fails, rather than rendering nowhere. If a missing
  container should render nothing, guard the Portal yourself.
- **Children append to the end of the container.** They land after whatever is already
  there, so two Portals into `<body>` paint in mount order. Nothing here assigns a
  `z-index` — if two overlays can be open at once, you set the stacking.
- **Escaping the ancestor also escapes its containing block.** A child positioned
  `absolute` against a `position: relative` card lands against a different ancestor once
  portalled — usually the viewport. Re-anchor with `fixed` coordinates, or use a component
  that measures the trigger for you.
- **`container` is `Element | null`, narrower than React's.** `createPortal` also accepts a
  `DocumentFragment`; Portal's type doesn't, so a fragment container is a compile error.
  `createPortal`'s third `key` argument isn't exposed either.
- **It's a client component.** The file carries `"use client"`, so importing Portal opts its
  module into the client bundle. Unlike [Button](button.md), it is not itself usable as a
  server component — it is a client boundary, and everything it renders is painted on the
  client.

## Accessibility

- **DOM order becomes tab order.** Children appended to the end of `<body>` are last in the
  document's sequential focus order, wherever the Portal sits in your JSX. For a modal that
  is what you want, paired with a focus trap. For a menu attached to a control it means Tab
  from the trigger jumps past the menu entirely — move focus yourself on open and restore it
  on close, and keep the relationship explicit with `aria-expanded` / `aria-controls` on the
  trigger.
- **Nothing is made inert for you.** Portal doesn't hide the rest of the page from assistive
  tech, doesn't trap focus, doesn't lock body scroll, and doesn't close on Escape. A dialog
  needs all four from you; `useFocusTrap` is exported for the focus trap.
- **Portalled content usually lands outside your landmarks.** `document.body` is outside
  `<main>` and `<nav>`, so the children are not reachable by landmark navigation and lose any
  implied context from where they sat in the JSX. Give them their own semantics —
  `role="dialog"`, an [Alert](alert.md) (which is already `role="alert"` with
  `aria-live="polite"`), or a labelled region — rather than relying on position.
- **A decorative scrim needs `aria-hidden`.** The dimming layer is presentational; mark it
  `aria-hidden="true"` so it isn't announced, and put the accessible name on the panel.

## Related

[Dialog](dialog.md) · [Drawer](drawer.md) · [Popover](popover.md) · [Tooltip](tooltip.md) · [AppShell](app-shell.md) · `useFocusTrap` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
