# ErrorBoundary

The net under your render tree. An uncaught render error in React doesn't break one
component — it unmounts the **entire root**, so an app without a boundary fails all the
way to a blank page. Wrap a subtree in this and a throw below it swaps in a full-screen
"Something went wrong" screen with a **Try again** button instead.

<!-- example:Minimal -->
```tsx
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```
<!-- /example -->

| Prop       | Type        | Default      |
| ---------- | ----------- | ------------ |
| `children` | `ReactNode` | — (required) |

`children` is the entire API. There is no `fallback`, no `onError`, no `className`, and
no rest spread; the props interface isn't exported either, so there is nothing to extend
from. Every string on the fallback screen is hard-coded English. See
[Gotchas](#gotchas).

## What it catches

React sends an error to the nearest boundary **above** the component that threw, but only
when the throw happens inside React's own work on a **descendant**:

- rendering a descendant (its function body, its `useState` initialiser, a class `render`)
- a descendant's lifecycle method or effect body
- a `lazy()` chunk that fails to load — that failure surfaces as a throw during render

`getDerivedStateFromError` is the only handler this component defines, and it flips a
single boolean. The error object itself is never captured — see [Gotchas](#gotchas).

## What it does not catch

This is the part people get wrong. A boundary is not a `try`/`catch` around your app; it
only sees throws in React's render and commit pass.

| Where the throw happens                          | Caught | What to do instead                            |
| ------------------------------------------------ | ------ | --------------------------------------------- |
| Rendering a descendant                            | yes    | —                                             |
| A descendant's lifecycle method or effect         | yes    | —                                             |
| An event handler (`onClick`, `onSubmit`)          | **no** | `try`/`catch` in the handler                  |
| A promise rejection or `await` continuation       | **no** | catch it, then re-throw during render         |
| A `setTimeout` / `requestAnimationFrame` callback | **no** | same — the browser called it, not React       |
| Server rendering                                  | **no** | React never runs boundaries on the server     |
| The boundary's own fallback, or anything above it | **no** | nest a second boundary higher up              |

The rule of thumb: **if the browser called the function, not React, the boundary can't see
it.** An event handler runs long after the render that created it, on a stack React isn't
holding — so it owns its own failure:

<!-- example:HandlerErrorsNeedTryCatch -->
```tsx
<ErrorBoundary>
  <Button
    onClick={() => {
      try {
        publishPost();
      } catch (error) {
        showToast(`Couldn't publish: ${String(error)}`);
      }
    }}
  >
    Publish post
  </Button>
</ErrorBoundary>
```
<!-- /example -->

Async failures are the same problem with a longer fuse. The usual fix is to put the throw
back where the boundary is looking: catch the rejection, store the error in state, and
`throw error` from the next render. Note the second-order effect of the handler gap — a
handler that swallows an error and calls `setState` with bad data will still trip the
boundary, because the render that follows is React's.

## Recovering from an error

Once tripped, the boundary **latches**. Its state lives on the mounted instance, so new
props, a parent re-render, or different `children` do not clear it — only two things do:

1. **The user clicks Try again**, which sets `hasError` back to `false` and re-renders the
   same children. Nothing else has changed, so if the cause is deterministic (a null field
   in the data, a bad prop) the very next render throws and the user is back on the
   fallback instantly. Treat it as a retry for transient failures, not a repair.
2. **The boundary is remounted.** There is no `onReset`, no `resetKeys`, and no imperative
   handle, so a changing `key` is the caller's only lever — most usefully the route path,
   which clears a crashed screen when the user navigates away from it:

<!-- example:ResetOnNavigation -->
```tsx
<ErrorBoundary key={pathname}>
  <RouteView />
</ErrorBoundary>
```
<!-- /example -->

## Scoping the blast radius

Boundaries nest, and the innermost one wins. Wrapping a single volatile panel keeps its
siblings mounted while an outer boundary stays in reserve for everything the inner one
can't see:

<!-- example:ScopedBoundary -->
```tsx
<ErrorBoundary>
  <main>
    <h1>Revenue</h1>
    <ErrorBoundary>
      <RevenueChart />
    </ErrorBoundary>
    <ActivityList />
  </main>
</ErrorBoundary>
```
<!-- /example -->

What nesting scopes is **what stays mounted, not how much space the fallback takes.** The
fallback is `min-h-screen` regardless of where the boundary sits, so a panel-level
boundary still hands the user a viewport-tall error screen where a chart used to be, and
pushes everything under it down the page. See [Gotchas](#gotchas).

## Pairing with Suspense

Suspense owns the wait; the boundary owns the failure. Keep the boundary **outside**, so
that a code-split chunk which fails to download — a throw during render — reaches it
rather than being mistaken for a pending state:

<!-- example:WithSuspense -->
```tsx
<ErrorBoundary>
  <Suspense fallback={<Spinner size="lg" />}>
    <ReportsPage />
  </Suspense>
</ErrorBoundary>
```
<!-- /example -->

The asymmetry is worth noticing: `Suspense` takes its fallback as a prop, this boundary
does not.

## Theme tokens

There is no `ErrorBoundary.css` — the fallback is styled entirely with utilities in the
`.tsx`, and only some of them reach the contract. These do:

| Where                | Utility                                  | Override                          |
| -------------------- | ---------------------------------------- | --------------------------------- |
| Fallback backdrop    | `bg-surface-1`                           | `--C-SURFACE-1`                   |
| Body copy ink        | `text-fg-secondary`                      | `--C-TEXT-SECONDARY`              |
| Heading weight       | `font-bold`                              | `--Bold-Weight`                   |
| Retry fill           | `bg-primary` `hover:bg-primary-hover`    | `--C-PRIMARY` `--C-PRIMARY-HOVER` |
| Retry label          | `text-fg-on-primary`                     | `--C-TEXT-ON-PRIMARY`             |
| Retry corners        | `rounded-md`                             | `--RADIUS-MD`                     |
| Retry focus ring     | `focus:ring-border-focus`                | `--C-BORDER-FOCUS`                |

The heading sets **no** colour of its own, so it inherits whatever `color` the boundary
lands in rather than `--C-TEXT-PRIMARY`.

**Three things here are off-contract, and they are the reason this screen doesn't fully
follow a theme.**

- **Type and spacing are raw Tailwind.** The heading is `text-2xl`, the gaps are `mb-2`,
  `mb-6`, and the button's padding is `px-4 py-2`. The library's own `text-h*` type steps
  (`--H1`…`--H6`) and responsive `r*` spacing steps (`--R-SIZE-*`) are not used, so none of
  it re-scales with the theme or steps at the 40rem breakpoint the way the rest of the
  library does.
- **The focus ring's offset paints white.** `focus:ring-offset-2` reserves a 2px gap
  between the button and its ring, filled from `--tw-ring-offset-color` — a variable this
  library never sets, so it falls back to Tailwind's default `#fff`. On any dark theme the
  retry button gets a white halo when focused. It is not overridable from a theme file;
  this is a fix in the component. (The same defect affects four other components.)
- **`min-h-screen` is a hard `100vh`,** not a token, so the fallback's height is the one
  layout decision a theme cannot touch.

## Gotchas

- **No `fallback` prop, and no way to change a word of it.** The heading ("Something went
  wrong"), the body ("An unexpected error occurred."), and the button ("Try again") are
  literals in the component. There is no `className` and no rest spread either, so the
  only way to a different error screen — or a localized one — is your own boundary class.
- **The fallback always fills the viewport.** `min-h-screen` with centred content is a
  page-level design. Used as a scoped, inline boundary around a card or a panel, it
  replaces that panel with a full-height centred error screen. There is no compact mode.
- **The caught error is thrown away.** State is `{ hasError: boolean }`, the static handler
  takes no argument, and there is no `componentDidCatch` — so the message, the stack, and
  the component stack never reach your code, and nothing is reported to error-tracking
  tooling. React itself still logs the error to the console. To report from the root, use
  React 19's `onCaughtError` option on `createRoot`; to show the message, subclass.
- **The retry button is hand-rolled, not a [Button](button.md).** It re-implements the primary
  variant's classes, so it doesn't track [Button](button.md)'s variants, sizes, or its
  `focus-visible`-only ring. It also sets no `type`, and a `<button>` defaults to
  `type="submit"` — so a boundary placed inside a `<form>` gives you a Try again button
  that submits that form as well as resetting the boundary.
- **It has to be a class, and that is not a style choice.** React exposes error catching
  only through `getDerivedStateFromError`/`componentDidCatch`; there is no hook equivalent,
  which is why this is the library's class component.
- **It's a client component.** The file is `"use client"`. In an RSC tree you can still
  wrap server-rendered `children` — they render on the server and arrive as props — but the
  boundary itself is a client boundary, and a *server* component that throws while
  rendering fails on the server, before this component exists.
- **Server rendering is unprotected.** React never calls `getDerivedStateFromError` during
  SSR, so nothing here runs and no fallback is emitted in the server HTML. The boundary
  starts protecting the tree only once it is rendering in the browser.

## Accessibility

**Nothing announces the swap.** The fallback is a plain `<div>` — no `role="alert"`, no
`aria-live` — and the component moves focus nowhere. The crashed subtree unmounts out from
under the user, so focus falls back to `<body>`: a keyboard user's next Tab restarts at the
top of the document, and a screen-reader user hears nothing at all until they go looking.
If a scoped boundary might trip while someone is working in that region, wrap your own that
focuses the heading on mount.

- **The fallback's heading is an `<h1>`.** Correct at the app root. Scoped to a panel it
  injects a second `<h1>` into a page that already has one and breaks the heading outline.
- **The retry control is a real `<button>` with a visible text label,** so it is reachable
  and named without any `aria-*`.
- **Its ring is `focus:`, not `focus-visible:`,** so it shows on mouse click too — unlike
  [Button](button.md) and [IconButton](icon-button.md), which are focus-visible only. `focus:outline-none`
  removes the native outline, so that ring is the only focus indicator the button has.
- **The copy is hard-coded English.** In a localized app, the screen a user sees at the
  worst possible moment is the one screen still in English.

## Related

[Button](button.md) · [Alert](alert.md) · [Spinner](spinner.md) ·
[RequireAuth](require-auth.md) · [Toast](toast.md) · [EmptyState](empty-state.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
