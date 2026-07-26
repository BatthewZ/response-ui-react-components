# ErrorBoundary

The net under your render tree. An uncaught render error in React doesn't break one
component — it unmounts the **entire root**, so an app without a boundary fails all the
way to a blank page. Wrap a subtree in this and a throw below it swaps in a content-sized
"Something went wrong" panel with a **Try again** button — or a `fallback` you supply,
handed the reset callback so it can offer its own retry.

<!-- example:Minimal -->
```tsx
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```
<!-- /example -->

| Prop       | Type                                              | Default        |
| ---------- | ------------------------------------------------- | -------------- |
| `children` | `ReactNode`                                       | — (required)   |
| `fallback` | `ReactNode \| ((reset: () => void) => ReactNode)` | built-in panel |

That is the entire API. There is no `onError`, no `className`, and no rest spread; the
props interface isn't exported either, so there is nothing to extend from. Every string
on the built-in fallback is hard-coded English — `fallback` is the route to a localized
or restyled one. See [Gotchas](#gotchas).

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

1. **Reset is called** — by the built-in fallback's Try again button, or by whatever you
   wire it to in a function `fallback`, which receives it as its argument. Either way it
   sets `hasError` back to `false` and re-renders the same children. Nothing else has
   changed, so if the cause is deterministic (a null field in the data, a bad prop) the
   very next render throws and the user is back on the fallback instantly. Treat it as a
   retry for transient failures, not a repair.
2. **The boundary is remounted.** There is no `onReset`, no `resetKeys`, and no imperative
   handle, so outside the fallback a changing `key` is the caller's only lever — most
   usefully the route path, which clears a crashed screen when the user navigates away
   from it:

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

The built-in fallback cooperates with this: it is sized by its own content, not the
viewport, so a panel-level boundary swaps a crashed chart for a compact error panel
rather than a full-height screen. What it does **not** do is hold the crashed region's
footprint — the panel is as tall as its two lines and a button, so content below it moves
up. Pass a `fallback` sized to the region if the layout must not shift. See
[Gotchas](#gotchas).

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

The symmetry is worth noticing: both take their fallback as a prop, and the boundary's
goes one further — the function form receives `reset`, so a custom error screen keeps the
retry.

## Theme tokens

There is no `ErrorBoundary.css` — the built-in fallback is styled with utilities in the
`.tsx`, every one of which reaches the contract, and its retry control is a real
[Button](button.md), which brings that component's whole token surface with it.

| Where             | Utility             | Override                                        |
| ----------------- | ------------------- | ----------------------------------------------- |
| Fallback backdrop | `bg-surface-1`      | `--C-SURFACE-1`                                 |
| Fallback padding  | `p-r2`              | `--R-SIZE-2`                                    |
| Heading type      | `text-h3`           | `--H3` (and its `-line-height` pair)            |
| Heading weight    | `font-bold`         | `--Bold-Weight`                                 |
| Heading gap       | `mb-r5`             | `--R-SIZE-5`                                    |
| Body copy ink     | `text-fg-secondary` | `--C-TEXT-SECONDARY`                            |
| Body gap          | `mb-r3`             | `--R-SIZE-3`                                    |
| Retry button      | —                   | everything [Button](button.md#theme-tokens) reads (`primary`, `md`) |

The heading sets **no** colour of its own, so it inherits whatever `color` the boundary
lands in rather than `--C-TEXT-PRIMARY`. Type and spacing sit on the library's `text-h*`
and responsive `r*` scales, so the panel re-scales with the theme and steps at the 40rem
breakpoint like the rest of the library.

The retry's focus ring is [Button](button.md)'s filled recipe — a 2px `--C-BORDER-FOCUS`
ring at `ring-offset-2`, keyed on `focus-visible:`. The offset band matters here: the
button is `bg-primary`, and the ring measures as little as 2.03:1 against that fill
across the shipped themes but never below 3.39:1 against the `--C-SURFACE-0` band
(measured against `@batthewz/response-ui-css` **v0.10.1**), so the 2px gap is what keeps
the ring readable — and the band now clears the 3:1 floor in every theme, where it
bottomed out at 2.72 before that release.

## Gotchas

- **`fallback` replaces the screen wholesale — there is no way to change one word of the
  built-in one.** The heading ("Something went wrong"), the body ("An unexpected error
  occurred."), and the button ("Try again") are literals, with no `className` and no rest
  spread to restyle them. A localized or restyled error screen means passing `fallback`;
  use the function form to keep a retry, since it receives `reset`.
- **The built-in fallback holds no footprint.** It is sized by its content — two lines and
  a button on a `bg-surface-1` panel — so a crashed viewport-height region collapses to a
  short panel and the content below it shifts up. Pass a `fallback` (or wrap the boundary)
  with an explicit `min-height` when the layout must hold.
- **The caught error is thrown away.** State is `{ hasError: boolean }`, the static handler
  takes no argument, and there is no `componentDidCatch` — so the message, the stack, and
  the component stack never reach your code, and nothing is reported to error-tracking
  tooling. React itself still logs the error to the console. To report from the root, use
  React 19's `onCaughtError` option on `createRoot`; to show the message, subclass.
- **The retry button is a real [Button](button.md)** — default `primary` variant, `md`
  size — so it tracks Button's styling, tokens, and `type="button"` default, and a
  boundary inside a `<form>` does not submit that form when Try again is clicked.
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
- **Its ring is `focus-visible:`, not `focus:`,** so a mouse click does not paint it —
  the same as [Button](button.md) and [IconButton](icon-button.md), and unlike the form
  controls ([Input](input.md), [Checkbox](checkbox.md), [Radio](radio.md)), which ring on
  click too. The retry control *is* a [Button](button.md), so it behaves exactly as that
  page documents, UA outline included — Button keeps it alongside the ring.
- **The built-in copy is hard-coded English.** In a localized app, the screen a user sees
  at the worst possible moment is the one screen still in English — unless you pass a
  `fallback`.

## Related

[Button](button.md) · [Alert](alert.md) · [Spinner](spinner.md) ·
[RequireAuth](require-auth.md) · [Toast](toast.md) · [EmptyState](empty-state.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
