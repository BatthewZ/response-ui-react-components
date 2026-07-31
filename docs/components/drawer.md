# Drawer

A modal side sheet: a panel pinned to one edge of the viewport that slides in over a dimmed
page. It is the native `<dialog>` element opened with `showModal()`, so the browser hands you
the top layer, focus containment, an inert page behind it, and Escape — without a `z-index`,
a portal, or a focus trap of your own.

<!-- example:Minimal -->
```tsx
<Button onClick={() => setOpen(true)}>Edit profile</Button>
<Drawer open={open} onClose={() => setOpen(false)} aria-labelledby="edit-profile-title">
  <h2 id="edit-profile-title">Edit profile</h2>
  <p>Changes apply to your Acme Marketing workspace immediately.</p>
  <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
    Cancel
  </Button>
</Drawer>
```
<!-- /example -->

| Prop        | Type                                       | Default        |
| ----------- | ------------------------------------------ | -------------- |
| `open`      | `boolean`                                  | — _(required)_ |
| `onClose`   | `() => void`                               | — _(required)_ |
| `side`      | `"left" \| "right" \| "top" \| "bottom"`   | `"right"`      |
| `className` | `string`                                   | —              |
| `ref`       | `Ref<HTMLDialogElement>`                   | —              |
| …rest       | any other `<dialog>` prop                  | —              |

The props are `Omit<ComponentPropsWithRef<"dialog">, "open" | "onClose">` plus the three
above: the native `open` attribute is replaced by the controlled boolean, so there is no
non-modal mode — a Drawer is always a `showModal()` dialog — and the native `onClose` slot is
replaced by the component's own callback. Neither `DrawerProps` nor the `side` union is
exported; a wrapper of your own re-declares them.

**There is no `classNames` either — deliberately.** Drawer renders exactly one element, the
`<dialog>`, and puts your `children` straight inside it. There is nothing between `className`
and your own markup for a slot to name: a `header`, `footer` or `closeButton` key would be
naming *your* structure, not the component's. The scrim is the one thing Drawer paints that
`className` cannot reach as a class, because `::backdrop` takes no class name — it is a theme
value instead, `--OVERLAY-SCRIM-COLOR`. See [Theme tokens](#theme-tokens).

## Controlled, and only controlled

One effect watches `open`: it calls `showModal()` when you ask for open and the element isn't,
and `close()` when you ask for closed and it is. There is no `defaultOpen` and no internal
state — the panel is exactly as open as your state says.

`onClose` replaces the DOM `close` handler rather than sitting alongside it, and it fires on
two paths. The native `cancel` event — Escape — is **prevented** before calling you, so
Escape does not close the panel itself; it asks your state to. And a native `close` — a
`<form method="dialog">` submit, a `close()` through the `ref` — that lands while your `open`
is still `true` is mirrored into `onClose`, so the element and your state cannot desync. If
your handler doesn't set `open` to `false`, Escape does nothing at all — see
[Gotchas](#gotchas).

## Drawer or Dialog?

They are the same mechanism — native `<dialog>`, `showModal()`, the same controlled
`open`/`onClose` contract, the same body-scroll lock — and differ in geometry, motion, and
theming reach:

|              | Drawer                                               | [Dialog](dialog.md)                       |
| ------------ | ---------------------------------------------------- | ---------------------------------------- |
| Placement    | margins pin it to the `side` edge                    | `m-auto`, centred on both axes            |
| Size         | 24rem across, capped at 90% of the viewport, filling the other axis | `w-full` up to `max-w-[40rem]`, height fits content |
| Corners      | rounded on the two corners facing the page interior  | rounded on all four                       |
| Enter/exit   | slides in and back out on `transform` + `opacity`    | a fade-in keyframe on open; no exit       |
| Scrim        | themeable — `--OVERLAY-SCRIM-COLOR`, in `Drawer.css` | the same token, via a Tailwind arbitrary value |

Reach for a Drawer when the content is secondary to the page and the page should stay
visible: filters, a navigation menu, a record's detail panel, a mobile share sheet. Reach for
[Dialog](dialog.md) when you want one blocking decision in the middle of the screen.

## Sides

`side` writes a `data-side` attribute — always present, open or closed — and every geometry
rule keys off it. You can key your own selectors off it too.

<!-- example:Sides -->
```tsx
<Button onClick={() => setSide("left")}>Navigation</Button>
<Button onClick={() => setSide("right")}>Details</Button>
<Button onClick={() => setSide("top")}>Announcement</Button>
<Button onClick={() => setSide("bottom")}>Share sheet</Button>
<Drawer
  open={side !== null}
  onClose={() => setSide(null)}
  side={side ?? "right"}
  aria-label="Panel placement"
>
  <p>Pinned to the {side} edge.</p>
  <Button variant="secondary" type="button" onClick={() => setSide(null)}>
    Close
  </Button>
</Drawer>
```
<!-- /example -->

| `side`              | Pinned to             | Fixed dimension          | Rounded corners |
| ------------------- | --------------------- | ------------------------ | --------------- |
| `"right"` (default) | right edge, full height | width `min(24rem, 90vw)`  | left pair       |
| `"left"`            | left edge, full height  | width `min(24rem, 90vw)`  | right pair      |
| `"top"`             | top edge, full width    | height `min(24rem, 90dvh)`| bottom pair     |
| `"bottom"`          | bottom edge, full width | height `min(24rem, 90dvh)`| top pair        |

Those sizes are literals in `Drawer.css`, not variables, and a `className` width utility will
not move them — see [Gotchas](#gotchas). The off-screen start and end positions are the
matching `translateX`/`translateY` of ±100%, so the panel always leaves through the edge it
is pinned to.

## Long content

The panel's height is fixed on every side — `100dvh` for a left/right sheet,
`min(24rem, 90dvh)` for a top/bottom one — so content never grows it. `Drawer.css` sets no
`overflow` of its own, which
leaves the browser's `<dialog>` default of `overflow: auto` in charge: the **whole panel**
scrolls, the padding included, and a heading at the top scrolls away with it. Give the panel a
full-height flex child with a single scrolling region when you want anything to stay put.

<!-- example:ScrollingPanel -->
```tsx
<Drawer open={open} onClose={() => setOpen(false)} aria-labelledby="notifications-title">
  <div className="flex h-full flex-col gap-r4">
    <h2 id="notifications-title" className="shrink-0">
      Notifications
    </h2>
    <ul className="flex-1 overflow-y-auto">
      {[
        "Ada Lovelace approved Pull request #42",
        "Grace Hopper deployed v2.4.0 to production",
        "Katherine Johnson commented on Add OKLCH theming",
        "Build #1183 finished in 4m 12s",
        "Two new members joined Acme Marketing",
      ].map((notification) => (
        <li key={notification}>{notification}</li>
      ))}
    </ul>
    <Button
      variant="secondary"
      type="button"
      className="shrink-0"
      onClick={() => setOpen(false)}
    >
      Mark all as read
    </Button>
  </div>
</Drawer>
```
<!-- /example -->

## Dismissal

Escape is the only dismissal the component implements. A click on the scrim does nothing —
native `<dialog>` has no light dismiss unless you ask for one, and this one doesn't. Scrim
clicks are dispatched to the dialog element itself, so a bounds check on the pointer adds it:

<!-- example:DismissOnScrimClick -->
```tsx
<Button onClick={() => setOpen(true)}>Open cart</Button>
<Drawer
  open={open}
  onClose={() => setOpen(false)}
  onClick={(event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const insidePanel =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!insidePanel) setOpen(false);
  }}
  aria-labelledby="cart-title"
>
  <h2 id="cart-title">Your cart</h2>
  <p>2 items · $148.00</p>
</Drawer>
```
<!-- /example -->

The bounds check matters: a plain `event.target === event.currentTarget` test also fires on
the panel's own padding ring, closing the drawer when a user clicks the margin around the
content.

The other way a native dialog closes is a `<form method="dialog">` submit, which fires `close`
and **not** `cancel`. The component listens for both: a `close` that arrives while your `open`
is still `true` is mirrored into `onClose`, so a native form submit lands back in your state
with no extra wiring. (The `ref` below is not part of that — hold one only when you want the
DOM event yourself.)

<!-- example:CloseFromNativeForm -->
```tsx
<Button onClick={() => setOpen(true)}>Shipping address</Button>
<Drawer
  ref={drawerRef}
  open={open}
  onClose={() => setOpen(false)}
  aria-labelledby="shipping-title"
>
  <h2 id="shipping-title">Shipping address</h2>
  <p>Ada Lovelace · 12 Analytical Way, London</p>
  <form method="dialog">
    <Button type="submit">Done</Button>
  </form>
</Drawer>
```
<!-- /example -->

## Theme tokens

Drawer uses **no Tailwind utilities** — its class list is `drawer no-body-scroll` plus
whatever you pass, and everything visual lives in `Drawer.css` reading contract variables
directly. That is deliberate rather than unfinished: the file is a four-way `[data-side]`
table crossed with `:not([open])`, `@starting-style` and `::backdrop`, so the utility form is
roughly forty-five variant-scoped classes on one element, and the reduced-motion reset only
survives fully qualified (`motion-reduce:data-[side=right]:not-open:translate-none`, ×4).
`Drawer.css`'s header carries the whole count.

| Where                    | Override                 |
| ------------------------ | ------------------------ |
| Panel padding            | `--R-SIZE-2`             |
| Panel surface            | `--C-SURFACE-0`          |
| Panel ink                | `--C-TEXT-PRIMARY`       |
| Panel elevation          | `--SHADOW-LG`            |
| Edge corner radius       | `--RADIUS-LG`            |
| Slide + fade duration    | `--MOTION-DURATION-ENTER`|
| Slide + fade easing      | `--MOTION-EASE-ENTER`    |
| Scrim                    | `--OVERLAY-SCRIM-COLOR`  |

The padding is responsive: `--R-SIZE-2` steps from `1.25rem` to `2rem` at the 40rem
breakpoint, so a drawer is roomier on desktop with nothing from you. The motion and scrim
rules carry hard-coded fallbacks (`0.2s`, `ease`, `rgb(0 0 0 / 0.5)`) which only apply if
`@batthewz/response-ui-css` isn't loaded at all; with it, the contract values win.

`.drawer` **pins** its ink to `--C-TEXT-PRIMARY` rather than inheriting, so a Drawer opened
under an ancestor that sets its own colour — inverse text on a section fill, say — still
renders the theme's body ink against the panel's `--C-SURFACE-0` background.

A `className` of `text-fg-muted` re-tints the panel: `.drawer`'s `color` is in
`@layer components`, which Tailwind orders below `@layer utilities`, so the utility wins. It
used to lose — this package's CSS was unlayered and out-ranked anything in `@layer utilities` —
and that is the cascade the first [gotcha](#gotchas) used to describe too. See the
[theme contract](../theme-contract.md).

Geometry is not on the contract: the 24rem panel size, the 90vw/90dvh caps, and the full-bleed
cross axis are literals, so re-theming changes colour, spacing, and timing but not the shape
of the sheet.

## Gotchas

- **`className` utilities beat `Drawer.css`.** A `className` of `w-[32rem] p-0` used to
  computed 24rem wide with full padding, because this package's stylesheet was unlayered and
  out-ranked every utility whatever the specificity — including `.drawer[data-side="right"]`,
  which also out-specifies a single class. **That is fixed:** the stylesheet is now in
  `@layer components`, below `@layer utilities`, and a plain `w-[32rem]` wins at any
  specificity. `style={{ width: "32rem" }}` still works and still beats both.
- **Every native close path reaches `onClose`.** The component listens for `cancel` (Escape,
  prevented so your state decides) and for `close` (`<form method="dialog">`, `ref.close()`,
  mirrored into `onClose` while your `open` is still `true`). The remaining trap is an
  `onClose` that ignores the callback: the element then ends up closed with `open` `true`,
  and because the open effect only reacts to a *change* in `open`, the panel stays shut until
  you toggle the boolean off and on again.
- **The native `onClose` handler slot is taken.** `onClose` is destructured out of the props
  and never forwarded, so `<Drawer onClose={…}>` is the component's callback, not React's
  `<dialog>` close handler. The `ref` is the only way to reach the DOM event.
- **The children are always mounted.** The `<dialog>` renders whether or not it is open, so
  everything inside it — effects, subscriptions, data fetches, uncontrolled input values —
  lives for the lifetime of the parent, and its markup sits in the DOM from the first render.
  That is what keeps form state across an open/close cycle; it also means an expensive panel
  costs you while it is invisible. Gate it on your own state if that matters.
- **Unmounting skips the exit slide.** `{open && <Drawer open={open} … />}` removes the element
  before the transition can run. Keep the Drawer mounted and toggle `open`. The exit animation
  also depends on `transition-behavior: allow-discrete` and a transitionable `overlay`
  property; where a browser lacks them, the panel vanishes instead of sliding out.
- **Body scroll is locked by a stylesheet rule, not by the component.** `showModal()` does not
  lock page scroll. Drawer hard-codes a `no-body-scroll` class that pairs with
  `body:has(dialog[open].no-body-scroll) { overflow: hidden }` in `@batthewz/response-ui-css`'s
  base layer. Ship this package's CSS without that base import and the page keeps scrolling
  behind an open drawer.
- **No close button, no title, no scrim dismissal.** Drawer renders your children and nothing
  else. Everything in [Accessibility](#accessibility) is your job.
- **It's a client component.** The file carries `"use client"`, so importing Drawer opts its
  module — and everything you render inside it — into the client bundle. Unlike
  [Button](button.md), it cannot be used directly in an RSC tree.

## Accessibility

`showModal()` does most of the work, and this is the reason to prefer it over a hand-built
overlay like the one in [Portal](portal.md):

- **Modal semantics are native.** The element exposes `role="dialog"`, the rest of the
  document is made inert, and sequential focus navigation cannot leave the panel. You do not
  need `aria-modal`, and you do not need `useFocusTrap`.
- **Focus is moved and restored for you.** Opening focuses the element carrying `autofocus`,
  or the first focusable descendant, or the panel itself when it has none; closing returns
  focus to whatever was focused before. Nothing to wire.
- **Give it an accessible name.** A `<dialog>` has none by default and Drawer adds none, so an
  unnamed drawer announces as just "dialog". Pass `aria-labelledby` pointing at your heading,
  or `aria-label`. Every example above does.
- **Render a visible close control.** Escape is the only dismissal in the box, and it works
  only if your `onClose` flips `open`. Pointer and touch users otherwise have no way out —
  the scrim doesn't dismiss and there is no built-in button.
- **Reduced motion is honoured.** `Drawer.css` ships a `@media (prefers-reduced-motion: reduce)`
  block that drops the transition and the off-edge transform, so the panel appears and
  disappears in place rather than sliding.
- **The scrim is a `::backdrop` pseudo-element**, so it is not in the accessibility tree and
  needs no `aria-hidden` — unlike a scrim `<div>` you would place yourself.

## Related

[Dialog](dialog.md) · [AppShell](app-shell.md) · [Popover](popover.md) · [Portal](portal.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
