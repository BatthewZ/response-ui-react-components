# RequireAuth

A headless auth gate. Hand it your session's `status` and it renders one of three
branches — a loading placeholder, your protected `children`, or a redirect — while
knowing nothing about your auth library or your router. You derive the status; it picks
the branch.

<!-- example:Minimal -->
```tsx
<RequireAuth status={authStatus} redirect="/login">
  <Dashboard />
</RequireAuth>
```
<!-- /example -->

| Prop                      | Type                                                | Default              |
| ------------------------- | --------------------------------------------------- | -------------------- |
| `status`                  | `"loading" \| "authenticated" \| "unauthenticated"` | — (required)         |
| `children`                | `ReactNode`                                          | — (required)         |
| `redirect`                | `string`                                             | —                    |
| `loadingFallback`         | `ReactNode`                                          | centered `Spinner`   |
| `loadingLabel`            | `string`                                             | `"Loading"`          |
| `unauthenticatedFallback` | `ReactNode`                                          | —                    |

There is no `variant`, no fetching, and no subscription — RequireAuth is a pure branch
selector over the `status` you pass. It also does **not** spread arbitrary props onto a
DOM node; the six above are the whole surface. The `unauthenticated` branch has real
sharp edges — see [Gotchas](#gotchas).

## The three branches

`status` is the only thing driving the render. `AuthStatus` is exported alongside the
component so you can type your own session state against it.

| `status`           | Renders                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `"loading"`        | `loadingFallback`, or a `Spinner` centered in a full-height `Center` if unset |
| `"authenticated"`  | `children`                                                                     |
| `"unauthenticated"`| `unauthenticatedFallback` if set, else a redirect to `redirect`, else nothing |

## Redirect, or render in place

For the `unauthenticated` branch you choose between navigating away and showing UI where
the gate stands. **Prefer passing your router's redirect element** via
`unauthenticatedFallback` — that gives you a history-API navigation your router controls:

<!-- example:WithRouterNavigate -->
```tsx
<RequireAuth
  status={authStatus}
  unauthenticatedFallback={<Navigate to="/login" replace />}
>
  <Dashboard />
</RequireAuth>
```
<!-- /example -->

The bare `redirect` string is the fallback path for when you have no element to pass. It
renders the configured RouterAdapter `Link` and auto-clicks it, so what the click does
depends on your adapter — see [Gotchas](#gotchas). With **no `RouterAdapterProvider`** that
Link is a plain `<a href>` and the click is a **hard navigation** (a full page load that
drops SPA state); with a router adapter installed the same click routes through your
router's `Link` for a client-side navigation. Reach for the bare string only when the
default reload is acceptable, or install an adapter first.

To keep the user on the page instead, pass UI and omit `redirect`:

<!-- example:InlineUnauthenticated -->
```tsx
<RequireAuth status={authStatus} unauthenticatedFallback={<SignInPrompt />}>
  <Dashboard />
</RequireAuth>
```
<!-- /example -->

## Custom loading state

The default loading branch is a large [Spinner](spinner.md) centered in a full-height region. Replace
it with a skeleton (or anything) that matches the page being gated:

<!-- example:CustomLoading -->
```tsx
<RequireAuth status={authStatus} redirect="/login" loadingFallback={<PageSkeleton />}>
  <Dashboard />
</RequireAuth>
```
<!-- /example -->

## Theme tokens

RequireAuth paints nothing of its own — it is a headless branch selector, with no CSS
file and no colour, radius, or type utilities in its source. The only pixels it can put
on screen without your help are the **default loading branch**, and even those belong to
two other components it composes: a [Spinner](spinner.md) for the animation and a [Center](center.md) for the
full-height centering. Override the auth-screen look on *those* components (or by passing
your own `loadingFallback`), not here.

| Where                         | Comes from                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Default spinner colour & size | `Spinner` (at `size="lg"`) — fixed 2rem; colour is inherited `currentColor`, not a token |
| Default spinner centering     | `Center` + a `min-h-screen` full-height region                                       |
| Every other branch            | Whatever you pass as `children` / fallbacks — your tokens                            |

Because the gate delegates all styling, there is no `--C-*` variable to override *on
RequireAuth itself* — and the default loading branch has none of its own either, since the
spinner's ring is plain `currentColor`. A theme swap re-tints that branch only through the
inherited `color` it lands in.

## Gotchas

- **The default `redirect`'s navigation depends on your adapter.** With no
  `unauthenticatedFallback`, the gate renders a hidden instance of the configured
  RouterAdapter `Link` and programmatically clicks it. Without a `RouterAdapterProvider`
  that Link is a plain `<a href>`, so the click is a full page load that drops SPA state.
  Install a router adapter and the click goes through that router's `Link` instead — a
  client-side navigation, no reload. For a history-API redirect regardless of adapter, pass
  your router's `<Navigate>` (or equivalent) through `unauthenticatedFallback`.
- **`unauthenticatedFallback` wins over `redirect`.** If you pass both, `redirect` is
  ignored — the fallback is returned and the redirect branch never runs.
- **`unauthenticated` with neither renders nothing.** No `unauthenticatedFallback` and no
  `redirect` returns `null` — a blank screen with no signal to the user. Always supply one.
- **The default redirect fires once per destination.** The click happens in an effect keyed
  on `redirect`, so re-rendering the gate while the status stays `unauthenticated` does not
  re-click the hidden anchor; changing `redirect` to a new path does. (It used to click from
  an inline `ref` callback, which React re-ran on every render — harmless under a hard reload,
  a repeat navigation through a client-side adapter Link.)
- **It's a client component.** RequireAuth is `"use client"` (it reads the router adapter
  via context), so the default redirect only fires after hydration — the server renders the
  hidden anchor, the browser clicks it. The `authenticated` and custom-fallback branches are
  plain children and render fine server-side.

## Accessibility

The default loading branch is announced: [Spinner](spinner.md) is decoration unless it is given
children, and the gate gives it `loadingLabel` — so it renders as `role="status"` with a
visually hidden "Loading", and assistive tech hears the wait. Pass `loadingLabel` to say it in
your users' language, or `loadingLabel=""` to silence it. If you pass your own
`loadingFallback`, you own that announcement — add a live region if the wait is meaningful.

The default redirect anchor is `display: none` and exists only to trigger navigation; it is
not focusable and reads "Redirecting…" to no one. Announcing the transition, and moving
focus after it, is the destination page's job — which is another reason to prefer a real
router redirect over the built-in one.

## Related

[Spinner](spinner.md) · [Center](center.md) · `RouterAdapterProvider` · `useLink` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
