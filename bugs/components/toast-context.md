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
