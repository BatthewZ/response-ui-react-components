# toast-context — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 46 · ToastContext — `ToastProvider` crashes any server render (high)

`ToastProvider` calls `createPortal(…, document.body)` unconditionally in its render body with
no `typeof document === "undefined"` guard — unlike `Portal.tsx:10`, which has one.
`"use client"` does **not** prevent SSR; it marks a module as client-*capable*, and the server
still renders it to produce initial HTML. **Failure scenario:** a Next.js App Router app wraps
its tree in `<ToastProvider>` (the documented way to use toasts) → every page throws at render.
Confirmed by SSR-rendering it directly: `ToastProvider SSR THREW: ReferenceError: document is
not defined`. Note React's own server renderer *also* throws on any portal it reaches
("Portals are not currently supported by the server renderer"), so both guards are needed.
**Fix:** mirror `Portal.tsx` — return `null` when `document` is undefined; better, render the
portal behind a mounted-in-effect flag so hydration is clean too (see #47).

### 101 · ToastContext — `dismissAll()` deletes toasts raised after it (med)

`dismissAll()`'s cleanup sweep is `setTimeout(() => setToasts([]), DISMISS_ANIMATION_MS)`
(ToastContext.tsx:80) — it filters nothing. Measured in vitest: call `dismissAll()`, then
`toast("LATE")` in the same tick — LATE renders; after `advanceTimersByTime(300)`
`queryByText("LATE")` is `null`. A route change that clears notifications and then
confirms "Saved" within 300 ms shows the confirmation and silently destroys it, and its
5 s auto-dismiss timer — already orphaned by the `timersRef.current.clear()` at :78 —
later fires against a dead id.
**Fix:** capture the ids present at dismiss time and have the sweep do
`setToasts(prev => prev.filter(t => !dismissedIds.has(t.id)))`.

### 102 · ToastContext — every `toast()` throws on a non-secure origin (med · recommend high)

ToastContext.tsx:85 calls `crypto.randomUUID()` unguarded, with no fallback — the only
such call in the package. `Crypto.randomUUID` is `[SecureContext]`-gated, so on any plain
`http://` origin (a LAN-IP dev server a phone is testing against, an http-only intranet
deploy) it is `undefined`. Measured: `TypeError: crypto.randomUUID is not a function` at
ToastContext.tsx:85, and **React re-raises it as an uncaught exception** — a caller's
`try/catch` around the click did not see it (`threw: null`). So the first toast takes down
the surrounding handler, and with an ErrorBoundary above, the subtree.
**Fix:** fall back to `crypto.getRandomValues` (not secure-context-gated) or a
module-scoped counter plus `Date.now()`.
**Recommend upgrading to high** — this is a crash, and it is the second in this file
after #46. `ToastContext` has two crash-class defects and one is only filed medium
because nobody had written it up.
