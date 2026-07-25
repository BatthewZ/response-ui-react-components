# toast — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 103-104 · Toast — the notification system is the least announceable surface in the library (med)

Two independent failures stack:

- **#103** The always-mounted portal container carries no `aria-live`; the live region arrives
  *with* its text already inside it (`role="alert" aria-live="assertive"`, `textContent` already
  set in the same update). Region-and-content-in-one-update is the case screen readers announce
  least reliably — the same defect already logged for Spinner (#39) and Skeleton (#64), but here it
  defeats the entire purpose of the component.
- **#104** Variant severity is colour-only, so a success and an error toast are identical to a
  screen reader and in greyscale.

**Fix:** put `aria-live` on the persistent container (`ToastContext.tsx:137`) so the region exists
before any message lands in it, and add an `sr-only` severity word per variant.

**Note on #41:** that row said Toast's `type`-less dismiss button submits an enclosing form. Through
`ToastProvider` it does **not** — the button is portalled to `document.body`, so its form owner is
`null` (verified: `btn.form === null`, no submit event). Only a hand-rendered `<Toast>` placed
inside a `<form>` submits. #41 stands for IconButton, Pagination and Carousel; the Toast half is
narrower than logged.
